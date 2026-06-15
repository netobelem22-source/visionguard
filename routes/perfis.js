const express = require('express');
const router = express.Router();
const verificarLogin = require('../middleware/auth');

// Banco SQLite
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../blacklist.db'));

// LISTAR GRUPOS
router.get('/grupos', verificarLogin, (req, res) => {
  db.all('SELECT * FROM grupos ORDER BY nome ASC', [], (err, grupos) => {
    if (err) return res.json({ erro: err.message });
    res.json(grupos);
  });
});

// CRIAR GRUPO
router.post('/grupos', verificarLogin, (req, res) => {
  const { nome, tipo, descricao } = req.body;
  db.run('INSERT INTO grupos (nome, tipo, descricao) VALUES (?, ?, ?)', [nome, tipo, descricao], function(err) {
    if (err) return res.json({ erro: err.message });
    res.json({ id: this.lastID, nome, tipo, descricao });
  });
});

// LISTAR PESSOAS
router.get('/pessoas', verificarLogin, (req, res) => {
  db.all('SELECT * FROM pessoas ORDER BY nome ASC', [], (err, pessoas) => {
    if (err) return res.json({ erro: err.message });
    res.json(pessoas);
  });
});

// CRIAR PESSOA
router.post('/pessoas', verificarLogin, (req, res) => {
  const { nome, grupo, nome_grupo, observacao } = req.body;
  db.run('INSERT INTO pessoas (nome, grupo, nome_grupo, observacao) VALUES (?, ?, ?, ?)',
    [nome, grupo, nome_grupo, observacao], function(err) {
    if (err) return res.json({ erro: err.message });
    res.json({ id: this.lastID, nome, grupo, nome_grupo, observacao });
  });
});

// VER PERFIL DE UMA PESSOA
// VER PERFIL DE UMA PESSOA
router.get('/pessoas/:id', verificarLogin, (req, res) => {
  db.get('SELECT * FROM pessoas WHERE id = ?', [req.params.id], (err, pessoa) => {
    if (err || !pessoa) return res.redirect('/');
    db.all('SELECT * FROM blacklist WHERE pessoa_id = ? ORDER BY data DESC', [req.params.id], (err2, registros) => {

      // Estatísticas
      const totalOcorrencias = registros.length;
      const primeiraOcorrencia = registros[registros.length - 1] || null;
      const ultimaOcorrencia = registros[0] || null;

      // Lojas únicas
      const lojasMap = {};
      registros.forEach(r => {
        const loja = r.nome || 'Sem nome';
        if (!lojasMap[loja]) lojasMap[loja] = 0;
        lojasMap[loja]++;
      });
      const lojas = Object.entries(lojasMap)
        .map(([nome, total]) => ({ nome, total }))
        .sort((a, b) => b.total - a.total);

      const lojaMaisFrequente = lojas[0] || null;

      res.render('perfil', {
        pessoa,
        registros,
        totalOcorrencias,
        primeiraOcorrencia,
        ultimaOcorrencia,
        lojas,
        lojaMaisFrequente,
        usuario: req.session.usuario
      });
    });
  });
});

// CATEGORIZAR REGISTRO DA BLACKLIST
router.post('/categorizar/:id', verificarLogin, (req, res) => {
  const { grupo, observacao, pessoa_id } = req.body;
  db.run('UPDATE blacklist SET grupo = ?, observacao = ?, pessoa_id = ? WHERE id = ?',
    [grupo, observacao, pessoa_id || null, req.params.id], (err) => {
    if (err) return res.json({ erro: err.message });
    res.json({ sucesso: true });
  });
});
// EXCLUIR PESSOA
router.post('/pessoas/:id/excluir', verificarLogin, (req, res) => {
  db.run('UPDATE blacklist SET pessoa_id = NULL WHERE pessoa_id = ?', [req.params.id], (err) => {
    db.run('DELETE FROM pessoas WHERE id = ?', [req.params.id], (err2) => {
      res.json({ sucesso: true });
    });
  });
});
// LISTAR BOLETINS DE UMA PESSOA
router.get('/pessoas/:id/boletins', verificarLogin, (req, res) => {
  db.all('SELECT * FROM boletins WHERE pessoa_id = ? ORDER BY criado_em DESC', [req.params.id], (err, boletins) => {
    if (err) return res.json({ erro: err.message });
    res.json(boletins);
  });
});

// CRIAR BOLETIM
router.post('/pessoas/:id/boletins', verificarLogin, (req, res) => {
  const { numero_bo, tipo, loja, data_ocorrencia, prejuizo, descricao, medida, status } = req.body;
  db.run(
    'INSERT INTO boletins (pessoa_id, numero_bo, tipo, loja, data_ocorrencia, prejuizo, descricao, medida, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [req.params.id, numero_bo, tipo, loja, data_ocorrencia, prejuizo, descricao, medida, status || 'aberto'],
    function(err) {
      if (err) return res.json({ erro: err.message });
      res.json({ id: this.lastID, sucesso: true });
    }
  );
});

// EXCLUIR BOLETIM
router.post('/boletins/:id/excluir', verificarLogin, (req, res) => {
  db.run('DELETE FROM boletins WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.json({ erro: err.message });
    res.json({ sucesso: true });
  });
});

// ATUALIZAR STATUS DO BOLETIM
router.post('/boletins/:id/status', verificarLogin, (req, res) => {
  const { status } = req.body;
  db.run('UPDATE boletins SET status = ? WHERE id = ?', [status, req.params.id], (err) => {
    if (err) return res.json({ erro: err.message });
    res.json({ sucesso: true });
  });
});
// LISTAR TODOS OS PERFIS
router.get('/perfis', verificarLogin, (req, res) => {
  const busca = req.query.busca || '';
  let query = `SELECT p.*, COUNT(b.id) as total_ocorrencias,
    (SELECT b2.imagem FROM blacklist b2 WHERE b2.pessoa_id = p.id ORDER BY b2.data DESC LIMIT 1) as foto_recente
    FROM pessoas p LEFT JOIN blacklist b ON b.pessoa_id = p.id`;
  const params = [];
  if (busca) {
    query += ' WHERE p.nome LIKE ?';
    params.push('%' + busca + '%');
  }
  query += ' GROUP BY p.id ORDER BY total_ocorrencias DESC';
  db.all(query, params, (err, perfis) => {
    if (err) return res.redirect('/');
    res.render('perfis', { perfis, busca, usuario: req.session.usuario });
  });
});
module.exports = router;
