const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../database/postgres');
const mailer = require('../services/mailer');

// LOGIN - GET
router.get('/login', (req, res) => {
  res.render('login', { erro: null });
});

// LOGIN - POST
router.post('/login', async (req, res) => {
  const { usuario: email, senha } = req.body;
  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.render('login', { erro: 'Email ou senha inválidos' });
    }
    const user = result.rows[0];
    if (!user.confirmado) {
      return res.render('login', { erro: 'Confirme seu email antes de entrar' });
    }
    const senhaCorreta = await bcrypt.compare(senha, user.senha);
    if (!senhaCorreta) {
      return res.render('login', { erro: 'Email ou senha inválidos' });
    }
    req.session.logado = true;
    req.session.usuario = { id: user.id, nome: user.nome, email: user.email, nivel: user.nivel };
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.render('login', { erro: 'Erro interno, tente novamente' });
  }
});

// CADASTRO - GET
router.get('/cadastro', (req, res) => {
  res.render('cadastro', { erro: null, sucesso: null });
});

// CADASTRO - POST
router.post('/cadastro', async (req, res) => {
  const { nome, email, senha } = req.body;
  try {
    const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existe.rows.length > 0) {
      return res.render('cadastro', { erro: 'Email já cadastrado', sucesso: null });
    }
    const hash = await bcrypt.hash(senha, 10);
    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO usuarios (nome, email, senha, token_confirmacao, token_expira) VALUES ($1, $2, $3, $4, $5)',
      [nome, email, hash, token, expira]
    );
    res.render('cadastro', { erro: null, sucesso: 'Cadastro realizado! Aguarde a aprovação do administrador.' });
  } catch (err) {
    console.error(err);
    res.render('cadastro', { erro: 'Erro ao cadastrar, tente novamente', sucesso: null });
  }
});

// CONFIRMAR EMAIL
router.get('/confirmar/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE token_confirmacao = $1 AND token_expira > NOW()',
      [token]
    );
    if (result.rows.length === 0) {
      return res.render('login', { erro: 'Link inválido ou expirado' });
    }
    await pool.query(
      'UPDATE usuarios SET confirmado = true, token_confirmacao = NULL, token_expira = NULL WHERE id = $1',
      [result.rows[0].id]
    );
    res.render('login', { erro: null, sucesso: 'Email confirmado! Faça login.' });
  } catch (err) {
    console.error(err);
    res.render('login', { erro: 'Erro ao confirmar email' });
  }
});

// LOGOUT
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;
