const multer =
  require("multer");

const path =
  require("path");
const axios =
  require("axios");

const FormData =
  require("form-data");

const fs =
  require("fs");
const express =
  require("express");

const router =
  express.Router();

const db =
  require("../database");

const verificarLogin =
  require("../middleware/auth");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";


const storage =
  multer.diskStorage({

    destination:
      function (
        req,
        file,
        cb
      ) {

        cb(
          null,
          "inputs/"
        );

      },

    filename:
      function (
        req,
        file,
        cb
      ) {

        cb(

          null,

          Date.now() +
          path.extname(
            file.originalname
          )

        );

      }

  });

const upload =
  multer({
    storage
  });

// ========================================
// DASHBOARD
// ========================================

router.get("/", verificarLogin, (req, res) => {

  const busca =
    req.query.busca || "";

const aba = req.query.aba || 'aprovado' ;
const grupo = req.query.grupo || '';
const dataInicio = req.query.dataInicio || '';
const dataFim = req.query.dataFim || '';
const pagina =
    parseInt(req.query.pagina) || 1;

  const limite = 12;

  const inicio =
    (pagina - 1) * limite;

  const fim =
    inicio + limite;

  const params = [aba, aba];
let query = `SELECT * FROM blacklist WHERE (status = ? OR (status IS NULL AND ? = 'aprovado'))`;
if (busca) { query += ` AND nome LIKE ?`; params.push('%' + busca + '%'); }
if (grupo) { query += ` AND grupo = ?`; params.push(grupo); }
if (dataInicio) { query += ` AND data >= ?`; params.push(dataInicio); }
if (dataFim) { query += ` AND data <= ?`; params.push(dataFim + 'T23:59:59'); }
query += ` ORDER BY id DESC`;

db.all(query, params, (err, blacklist) => {
  if (err) return res.send("Erro banco");
  const filtrados = blacklist;

      const totalPaginas =
        Math.ceil(
          filtrados.length / limite
        );

      const paginaAtual =
        filtrados.slice(
          inicio,
          fim
        );

      db.get(`SELECT COUNT(*) as total FROM blacklist WHERE status = 'pendente'`, [], (errP, pendentes) => {
  res.render("dashboard", {
    blacklist,
    filtrados,
    pagina,
    totalPaginas,
    paginaAtual,
    busca,
    aba,
dataInicio,
dataFim,  
  grupo,
    totalPendentes: pendentes ? pendentes.total : 0,
    usuario: req.session.usuario || null
  });
});

    }

  );

});
// ========================================
// API DASHBOARD
// ========================================

router.get(
  "/api/dashboard",
  verificarLogin,
  (req, res) => {

    db.all(

      `
      SELECT *
      FROM blacklist
      ORDER BY id DESC
      LIMIT 12
      `,

      [],

      (err, blacklist) => {

        if (err) {

          return res.json([]);

        }

        res.json(blacklist);

      }

    );

  }
);
// ========================================
// EXCLUIR
// ========================================

router.post(
  "/excluir",
  verificarLogin,
  (req, res) => {

    const imagem =
      req.body.imagem;

    db.run(

      `
      DELETE FROM blacklist
      WHERE imagem = ?
      `,

      [imagem],

      (err) => {

        if (err) {

          console.log(err);

        }
    const io =
  req.app.get("io");

io.emit(
  "dashboard_update"
);    

        res.redirect("/");

      }

    );

  }

);

// ========================================
// DOWNLOAD
// ========================================
router.get(
  "/download",
  verificarLogin,
  async (req, res) => {
    const arquivo = req.query.arquivo;
    const nomeArquivo = path.basename(arquivo);
    const caminho = fs.existsSync(path.join(__dirname, "../public/inputs", nomeArquivo))
  ? path.join(__dirname, "../public/inputs", nomeArquivo)
  : path.join(__dirname, "../public", nomeArquivo);
    const nomeJpg = nomeArquivo.replace(".png", ".jpg");
    const sharp = require("sharp");
    const buffer = await sharp(caminho).jpeg({ quality: 90 }).toBuffer();
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Content-Disposition", `attachment; filename="${nomeJpg}"`);
    res.send(buffer);
  }
);

// MUDAR STATUS
router.post('/blacklist/:id/status', verificarLogin, (req, res) => {
  const { status, observacao } = req.body;
  db.get('SELECT * FROM blacklist WHERE id = ?', [req.params.id], (err, row) => {
    if (err || !row) return res.json({ erro: 'Registro não encontrado' });
    db.run('UPDATE blacklist SET status = ?, observacao = ? WHERE id = ?',
      [status, observacao || null, req.params.id], (err2) => {
        if (err2) return res.json({ erro: err2.message });
        
        res.json({ sucesso: true });
      }
    );
  });
});

router.post(

  "/upload",

  upload.single("imagem"),

  async (req, res) => {

    try {

      const imagem =
        "inputs/" +
        req.file.filename;

      const caminhoImagem =
        req.file.path;

      const form =
        new FormData();

      form.append(

        "file",

        fs.createReadStream(
          caminhoImagem
        )

      );

      const resposta =
        await axios.post(

          `${AI_SERVICE_URL}/detectar`,

          form,

          {

            headers:
              form.getHeaders()

          }

        );

      db.run(

        `
        INSERT INTO blacklist
        (
          nome,
          imagem,
          data
        )
        VALUES (?, ?, ?)
        `,

        [
  "Detectado IA",

  "/inputs/" +
  path.basename(imagem),

  new Date()
    .toISOString()
]

      );

      res.json({

        status: "ok",

        ia:
          resposta.data

      });

    } catch (erro) {

      console.log(erro);

      res.status(500).send(
        "Erro IA"
      );

    }

  }

);
// RELATÓRIOS
router.get('/relatorios', verificarLogin, (req, res) => {


    // Total por status
    db.get(`SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status='aprovado' OR status IS NULL THEN 1 ELSE 0 END) as aprovados,
      SUM(CASE WHEN status='pendente' THEN 1 ELSE 0 END) as pendentes,
      SUM(CASE WHEN status='recusado' THEN 1 ELSE 0 END) as recusados
      FROM blacklist`, [], (err2, totais) => {

      // Por categoria
      db.all(`SELECT grupo, COUNT(*) as total FROM blacklist 
        WHERE grupo IS NOT NULL AND (status='aprovado' OR status IS NULL)
        GROUP BY grupo ORDER BY total DESC`, [], (err3, porGrupo) => {

        // Por loja (extrai número do nome)
        db.all(`SELECT 
  COALESCE(l.nome, b.nome) as nome,
  COUNT(*) as total 
  FROM blacklist b
  LEFT JOIN lojas l ON b.loja_id = l.id
  WHERE b.status='aprovado' OR b.status IS NULL
  GROUP BY COALESCE(l.nome, b.nome)
  ORDER BY total DESC LIMIT 10`, [], (err4, porLoja) => {

          // Por mês
          db.all(`SELECT strftime('%Y-%m', data) as mes, COUNT(*) as total
  FROM blacklist WHERE data IS NOT NULL
  GROUP BY mes ORDER BY mes DESC LIMIT 6`, [], (err5, porMes) => {
          // Por hora
          db.all(`SELECT strftime('%H', data) as hora, COUNT(*) as total
            FROM blacklist WHERE data IS NOT NULL
            GROUP BY hora ORDER BY hora ASC`, [], (err6, porHora) => {
            // Por dia
            db.all(`SELECT strftime('%w', data) as dia, COUNT(*) as total
              FROM blacklist WHERE data IS NOT NULL
              GROUP BY dia ORDER BY dia ASC`, [], (err7, porDia) => {
              res.render('relatorios', {
                totais, porGrupo, porLoja, porMes, porHora, porDia,
                usuario: req.session.usuario || null
              });
            });
          });
        });
      });
    });
  });
});
// COUNT PENDENTES
router.get('/api/pendentes/count', verificarLogin, (req, res) => {
  db.get(`SELECT COUNT(*) as total FROM blacklist WHERE status = 'pendente'`, [], (err, row) => {
    res.json({ total: row ? row.total : 0 });
  });
});
module.exports = router;
