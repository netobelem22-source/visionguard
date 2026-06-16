const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const pool = require('../database/postgres');
const verificarLogin = require('../middleware/auth');
const verificarAdmin = require('../middleware/admin');

const DATA_DIR = process.env.DATA_DIR || '/var/www/visionguard';

const CONFIG_DEFAULT = {
  msg_recebimento: '',
  msg_aprovacao: '',
  email_alertas: '',
  alertar_apos: ''
};

function configPath() {
  const arquivo = path.join(DATA_DIR, 'config.json');
  if (!fs.existsSync(arquivo)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(arquivo, JSON.stringify(CONFIG_DEFAULT, null, 2));
  }
  return arquivo;
}

router.get('/admin/usuarios', verificarLogin, verificarAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome, email, nivel, confirmado, criado_em FROM usuarios ORDER BY criado_em DESC');
    res.render('admin-usuarios', { usuarios: result.rows, usuario: req.session.usuario });
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

router.post('/admin/usuarios/:id/aprovar', verificarLogin, verificarAdmin, async (req, res) => {
  await pool.query('UPDATE usuarios SET confirmado = true WHERE id = $1', [req.params.id]);
  res.redirect('/admin/usuarios');
});

router.post('/admin/usuarios/:id/bloquear', verificarLogin, verificarAdmin, async (req, res) => {
  await pool.query('UPDATE usuarios SET confirmado = false WHERE id = $1', [req.params.id]);
  const { invalidarCache } = require('../middleware/auth');
  invalidarCache(parseInt(req.params.id));
  res.redirect('/admin/usuarios');
});

router.post('/admin/usuarios/:id/tornar-admin', verificarLogin, verificarAdmin, async (req, res) => {
  await pool.query("UPDATE usuarios SET nivel = 'admin' WHERE id = $1", [req.params.id]);
  res.redirect('/admin/usuarios');
});

router.post('/admin/usuarios/:id/tornar-normal', verificarLogin, verificarAdmin, async (req, res) => {
  await pool.query("UPDATE usuarios SET nivel = 'normal' WHERE id = $1", [req.params.id]);
  res.redirect('/admin/usuarios');
});

router.post('/admin/usuarios/:id/excluir', verificarLogin, verificarAdmin, async (req, res) => {
  await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
  res.redirect('/admin/usuarios');
});
// CONFIGURAÇÕES - GET
router.get('/configuracoes', verificarLogin, verificarAdmin, async (req, res) => {
  const config = JSON.parse(fs.readFileSync(configPath()));
  res.render('configuracoes', { config, usuario: req.session.usuario });
});

// CONFIGURAÇÕES - POST
router.post('/configuracoes', verificarLogin, verificarAdmin, async (req, res) => {
  const { msg_recebimento, msg_aprovacao, email_alertas, alertar_apos } = req.body;
  const arquivo = configPath();
  const config = JSON.parse(fs.readFileSync(arquivo));
  config.msg_recebimento = msg_recebimento;
  config.msg_aprovacao = msg_aprovacao;
  config.email_alertas = email_alertas;
  config.alertar_apos = alertar_apos;
  fs.writeFileSync(arquivo, JSON.stringify(config, null, 2));
  res.redirect('/configuracoes');
});

// BACKUP
router.post('/configuracoes/backup', verificarLogin, verificarAdmin, (req, res) => {
  const data = new Date().toISOString().split('T')[0];
  const origem = path.join(DATA_DIR, 'blacklist.db');
  const pastaBackups = path.join(DATA_DIR, 'backups');
  const destino = path.join(pastaBackups, `blacklist_${data}.db`);
  if (!fs.existsSync(pastaBackups)) {
    fs.mkdirSync(pastaBackups, { recursive: true });
  }
  fs.copyFileSync(origem, destino);
  res.json({ sucesso: true, arquivo: destino });
});
// LIMPAR REGISTROS ANTIGOS
router.post('/configuracoes/limpar', verificarLogin, verificarAdmin, (req, res) => {
  const db = require('../database');
  const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  db.run(`DELETE FROM blacklist WHERE status = 'recusado' AND data < ?`, [trintaDiasAtras], function(err) {
    if (err) return res.json({ erro: err.message });
    res.json({ sucesso: true, removidos: this.changes });
  });
});
// LISTAR LOJAS
router.get('/admin/lojas', verificarLogin, verificarAdmin, (req, res) => {
  const db = require('../database');
  db.all('SELECT * FROM lojas ORDER BY nome ASC', [], (err, lojas) => {
    res.render('admin-lojas', { lojas, usuario: req.session.usuario });
  });
});

// CRIAR LOJA
router.post('/admin/lojas', verificarLogin, verificarAdmin, (req, res) => {
  const db = require('../database');
  const { nome, codigo } = req.body;
  const codigoFinal = codigo.toUpperCase().trim();
  db.run('INSERT INTO lojas (nome, codigo) VALUES (?, ?)', [nome, codigoFinal], (err) => {
    if (err) return res.redirect('/admin/lojas?erro=1');
    res.redirect('/admin/lojas');
  });
});

// ATIVAR/DESATIVAR LOJA
router.post('/admin/lojas/:id/toggle', verificarLogin, verificarAdmin, (req, res) => {
  const db = require('../database');
  db.run('UPDATE lojas SET ativo = CASE WHEN ativo = 1 THEN 0 ELSE 1 END WHERE id = ?', [req.params.id], (err) => {
    res.redirect('/admin/lojas');
  });
});

// EXCLUIR LOJA
router.post('/admin/lojas/:id/excluir', verificarLogin, verificarAdmin, (req, res) => {
  const db = require('../database');
  db.run('DELETE FROM lojas WHERE id = ?', [req.params.id], (err) => {
    res.redirect('/admin/lojas');
  });
});
module.exports = router;
