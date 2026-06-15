const estados = {};

function criarEstado(usuario) {

if (!estados[usuario]) {

estados[usuario] = {

  modo: null,

  fotos: [],

  timestamp: Date.now()

};

}

return estados[usuario];

}

function limparEstado(usuario) {

delete estados[usuario];

}

module.exports = {

estados,

criarEstado,

limparEstado

};