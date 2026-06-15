const pool = require('../database/postgres');

// Cache de usuários verificados (5 minutos)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function verificarLogin(req, res, next) {
  if (!req.session.logado) {
    return res.redirect('/login');
  }
  try {
    const userId = req.session.usuario.id;
    const agora = Date.now();
    const cached = cache.get(userId);

    // Usa cache se ainda válido
    if (cached && agora - cached.time < CACHE_TTL) {
      if (!cached.confirmado) {
        req.session.destroy();
        return res.redirect('/login');
      }
      return next();
    }

    // Consulta banco e atualiza cache
    const result = await pool.query('SELECT confirmado FROM usuarios WHERE id = $1', [userId]);
    if (result.rows.length === 0 || !result.rows[0].confirmado) {
      cache.delete(userId);
      req.session.destroy();
      return res.redirect('/login');
    }

    cache.set(userId, { confirmado: true, time: agora });
    next();
  } catch (err) {
    console.error(err);
    res.redirect('/login');
  }
}

// Limpa cache de usuário bloqueado imediatamente
function invalidarCache(userId) {
  cache.delete(userId);
}

module.exports = verificarLogin;
module.exports.invalidarCache = invalidarCache;
