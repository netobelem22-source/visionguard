function detectarIntento(texto) {

  texto = texto.toLowerCase();

  if (texto.includes("ping")) {
    return "PING";
  }

  if (texto.includes("menu")) {
    return "MENU";
  }

  if (texto.includes("status")) {
    return "STATUS";
  }

  return "DESCONHECIDO";
}

module.exports = detectarIntento;