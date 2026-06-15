function verificarAdmin(req, res, next) {
  if (req.session.logado && req.session.usuario && req.session.usuario.nivel === 'admin') {
    next();
  } else {
    res.redirect('/');
  }
}
module.exports = verificarAdmin;
