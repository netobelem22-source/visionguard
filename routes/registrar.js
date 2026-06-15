const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');
const db = require('../database');
const fila = require('../services/fila-processamento');
const gfpgan = require('../services/gfpgan-service');
const rateLimit = require('express-rate-limit');

// ========================================
// POOL DE FACE PROCESSORS
// ========================================

const POOL_SIZE = parseInt(process.env.FACE_POOL_SIZE) || 2;
const pool = [];
const _esperando = [];
let _prontoCount = 0;
let _resolvePool;
const poolPronto = new Promise(r => { _resolvePool = r; });
let _jobId = 0;

function criarProcesso(index) {
  const proc = fork(path.join(__dirname, '../services/faceProcessor.js'));
  proc.livre = true;
  proc._cb = new Map();

  proc.on('message', msg => {
    if (msg.tipo === 'pronto') {
      _prontoCount++;
      console.log(`[POOL] Processo ${_prontoCount}/${POOL_SIZE} pronto`);
      if (_prontoCount === 1) _resolvePool();
      return;
    }
    const cb = proc._cb.get(msg.id);
    if (cb) { proc._cb.delete(msg.id); cb(msg); }
  });

  proc.on('error', err => console.error(`[POOL ${index}] Erro:`, err.message));

  proc.on('exit', code => {
    if (code !== 0) {
      console.error(`[POOL ${index}] Encerrado (${code}), reiniciando...`);
      const idx = pool.indexOf(proc);
      if (idx !== -1) pool[idx] = criarProcesso(index);
    }
  });

  return proc;
}

for (let i = 0; i < POOL_SIZE; i++) pool.push(criarProcesso(i));

function _liberarProcesso(proc) {
  if (_esperando.length > 0) {
    const next = _esperando.shift();
    _despachar(proc, next.imagePath, next.resolve);
  } else {
    proc.livre = true;
  }
}

function _despachar(proc, imagePath, resolve) {
  proc.livre = false;
  const id = ++_jobId;
  proc._cb.set(id, result => { _liberarProcesso(proc); resolve(result); });
  proc.send({ id, imagePath });
}

async function reconhecerFace(imagePath) {
  await poolPronto;
  return new Promise(resolve => {
    const proc = pool.find(p => p.livre);
    if (proc) _despachar(proc, imagePath, resolve);
    else _esperando.push({ imagePath, resolve });
  });
}

// ========================================
// CACHE DE DESCRITORES EM MEMORIA
// ========================================

let _cache = null;

async function getDescritores() {
  if (_cache) return _cache;
  const rows = await new Promise(resolve => {
    db.all(
      'SELECT nome, descriptor FROM blacklist WHERE descriptor IS NOT NULL AND status = "aprovado"',
      [],
      (err, rows) => resolve(rows || [])
    );
  });
  _cache = rows.map(row => {
    try { return { nome: row.nome, descriptor: JSON.parse(row.descriptor) }; }
    catch (e) { return null; }
  }).filter(Boolean);
  console.log(`[CACHE] ${_cache.length} descritores carregados`);
  return _cache;
}

function invalidarCache() { _cache = null; }

function euclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; sum += d * d; }
  return Math.sqrt(sum);
}

// ========================================
// UPLOAD
// ========================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, '/var/www/visionguard/inputs/'),
  filename: (req, file, cb) => cb(null, Date.now() + '.jpg')
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const tipos = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!tipos.includes(file.mimetype)) return cb(new Error('Apenas imagens JPG ou PNG são permitidas.'));
    cb(null, true);
  }
});

const uploadLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { erro: 'Muitas tentativas. Aguarde 1 hora.' }
});

// ========================================
// ROTAS
// ========================================

router.get('/registrar', (req, res) => res.render('registrar', { erro: null }));

router.post('/registrar/verificar', (req, res) => {
  const codigo = (req.body.codigo || '').toUpperCase().trim();
  db.get('SELECT * FROM lojas WHERE codigo = ? AND ativo = 1', [codigo], (err, loja) => {
    if (err || !loja) return res.render('registrar', { erro: 'Código inválido ou loja desativada.' });
    req.session.loja = loja;
    res.redirect('/registrar/enviar');
  });
});

router.get('/registrar/enviar', (req, res) => {
  if (!req.session.loja) return res.redirect('/registrar');
  res.render('registrar-enviar', { loja: req.session.loja, erro: null, sucesso: null });
});

router.post('/registrar/enviar', uploadLimit, upload.single('foto'), async (req, res) => {
  if (!req.session.loja) return res.redirect('/registrar');
  const loja = req.session.loja;
  if (!req.file) return res.render('registrar-enviar', { loja, erro: 'Selecione uma foto.', sucesso: null });

  const posicao = fila.tamanho() + 1;
  fila.adicionar({
    dados: {
      caminhoImagem: req.file.path,
      nome: `${loja.nome} - ${(req.body.descricao || '').trim()}`,
      caminho: (req.body.caminho || '').trim(),
      lojaId: loja.id,
      dataOcorrencia: req.body.data_ocorrencia || new Date().toISOString()
    },
    fn: processarFoto
  });

  const msg = posicao > 1
    ? `Foto recebida! Posição na fila: ${posicao}. Aguarde a avaliação do operador.`
    : 'Foto recebida! Aguarde a avaliação do operador.';

  return res.render('registrar-enviar', { loja, erro: null, sucesso: msg });
});

router.get('/registrar/status', (req, res) => {
  res.render('registrar-status', { loja: null, registros: null, erro: null, pagina: 1, totalPaginas: 1, codigo: '' });
});

router.post('/registrar/status', (req, res) => {
  const codigo = (req.body.codigo || '').toUpperCase().trim();
  const pagina = parseInt(req.body.pagina) || 1;
  const limite = 10;
  const inicio = (pagina - 1) * limite;

  db.get('SELECT * FROM lojas WHERE codigo = ? AND ativo = 1', [codigo], (err, loja) => {
    if (err || !loja) return res.render('registrar-status', {
      loja: null, registros: null, erro: 'Código inválido ou loja desativada.', pagina: 1, totalPaginas: 1, codigo: ''
    });
    db.get('SELECT COUNT(*) as total FROM blacklist WHERE loja_id = ?', [loja.id], (err2, count) => {
      const total = count ? count.total : 0;
      const totalPaginas = Math.ceil(total / limite) || 1;
      db.all(
        'SELECT * FROM blacklist WHERE loja_id = ? ORDER BY data DESC LIMIT ? OFFSET ?',
        [loja.id, limite, inicio],
        (err3, registros) => res.render('registrar-status', { loja, registros: registros || [], erro: null, pagina, totalPaginas, codigo })
      );
    });
  });
});

// ========================================
// PROCESSAMENTO
// ========================================

async function processarFoto(dados) {
  const { caminhoImagem, nome, caminho, lojaId, dataOcorrencia } = dados;
  const timestamp = Date.now();
  const pastaRestored = `/var/www/GFPGAN/resultados/restored_faces_${timestamp}`;

  try {
    if (!fs.existsSync(pastaRestored)) fs.mkdirSync(pastaRestored, { recursive: true });

    // GFPGAN via servico persistente (sem startup de Python a cada foto)
    const resultadoGfpgan = await gfpgan.melhorar(caminhoImagem, pastaRestored);

    if (resultadoGfpgan.erro) {
      fs.rmSync(pastaRestored, { recursive: true, force: true });
      console.log(`[FILA] GFPGAN sem resultado (${resultadoGfpgan.erro}):`, nome);
      return;
    }

    const pastaFinal = path.join(pastaRestored, 'restored_faces');
    if (!fs.existsSync(pastaFinal) || !fs.readdirSync(pastaFinal).length) {
      fs.rmSync(pastaRestored, { recursive: true, force: true });
      console.log('[FILA] Pasta restored_faces vazia:', nome);
      return;
    }

    const ultimoArquivo = fs.readdirSync(pastaFinal)[0];
    const imagemMelhorada = path.join(pastaFinal, ultimoArquivo);

    // Reconhecimento no pool de processos filhos (nao bloqueia o Express)
    const resultado = await reconhecerFace(imagemMelhorada);

    if (!resultado.descriptor) {
      fs.rmSync(pastaRestored, { recursive: true, force: true });
      console.log('[FILA] Sem descriptor:', nome);
      return;
    }

    const descriptor = resultado.descriptor;

    // Comparacao com cache em memoria (sem consulta ao banco a cada foto)
    const descritores = await getDescritores();
    let reincidente = null;
    let melhorDistancia = 1;

    for (const entry of descritores) {
      const distancia = euclideanDistance(descriptor, entry.descriptor);
      if (distancia < 0.5 && distancia < melhorDistancia) {
        melhorDistancia = distancia;
        reincidente = entry;
      }
    }

    const observacaoFinal = reincidente
      ? `⚠️ Possível reincidente: ${reincidente.nome} (${Math.round((1 - melhorDistancia) * 100)}% similar)`
      : null;

    if (reincidente) console.log('[FILA] Reincidente:', reincidente.nome, Math.round((1 - melhorDistancia) * 100) + '%');

    const destinoPublico = path.join(__dirname, '../public/inputs', ultimoArquivo);
    fs.copyFileSync(imagemMelhorada, destinoPublico);
    const nomeCompleto = caminho ? `${nome} | ${caminho}` : nome;

    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO blacklist (nome, imagem, data, status, loja_id, descriptor, observacao) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [nomeCompleto, '/inputs/' + ultimoArquivo, dataOcorrencia || new Date().toISOString(), 'pendente', lojaId, JSON.stringify(descriptor), observacaoFinal],
        function(err) {
          if (err) { console.error('ERRO DB:', err); reject(err); }
          else { invalidarCache(); resolve(); }
        }
      );
    });

    fs.rmSync(pastaRestored, { recursive: true, force: true });
    console.log('[FILA] Foto processada:', nomeCompleto);

  } catch (err) {
    console.error('[FILA] Erro:', err.message);
    if (fs.existsSync(pastaRestored)) fs.rmSync(pastaRestored, { recursive: true, force: true });
  }
}

module.exports = router;
