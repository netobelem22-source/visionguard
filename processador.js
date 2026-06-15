const sharp = require("sharp");

async function melhorarImagem(input, output) {

  await sharp(input)

    // aumenta resolução
    .resize({
      width: 900
    })

    // melhora nitidez
    .sharpen()

    // melhora contraste
    .normalize()

    // remove ruído leve
    .median(1)

    .jpeg({
      quality: 100
    })

    .toFile(output);

  return output;
}

module.exports = {
  melhorarImagem
};