const faceapi = require("face-api.js");

const canvas = require("canvas");

const fs = require("fs");

const path = require("path");

const {
lerBlacklist,
salvarBlacklist

} = require("./blacklist");

const {
Canvas,
Image,
ImageData

} = canvas;

faceapi.env.monkeyPatch({

Canvas,
Image,
ImageData

});

async function carregarModelos() {

const modelPath =
path.join(
__dirname,
"models"
);

await faceapi.nets
.tinyFaceDetector
.loadFromDisk(modelPath);

await faceapi.nets
.faceLandmark68Net
.loadFromDisk(modelPath);

await faceapi.nets
.faceRecognitionNet
.loadFromDisk(modelPath);

console.log(
"MODELOS CARREGADOS"
);

}

async function analisarImagem(
media,
legenda,
chatId
) {

const buffer =
Buffer.from(
media.data,
"base64"
);

const nomeArquivo =

"uploads/${Date.now()}.jpg";

fs.writeFileSync(
nomeArquivo,
buffer
);

const img =
await canvas.loadImage(
nomeArquivo
);

const detection =

await faceapi
  .detectSingleFace(

    img,

    new faceapi
      .TinyFaceDetectorOptions()

  )
  .withFaceLandmarks()
  .withFaceDescriptor();

if (!detection) {

return {

  sucesso: false,

  mensagem:
    "Nenhum rosto detectado. \nSerá analisada a imagem, mas o cadastro pode ser rejeitado. \n Por favor, aguarde..."

};

}

const descriptor =
Array.from(
detection.descriptor
);

const blacklist =
await lerBlacklist();

for (const pessoa of blacklist) {

if (!pessoa.descriptor)
  continue;

const distancia =

  faceapi
    .euclideanDistance(

      descriptor,

      pessoa.descriptor

    );

if (distancia < 0.5) {

  return {

    sucesso: true,

    reincidencia: true,

    pessoa

  };

}

}
console.log("SALVANDO NO BANCO:", legenda, chatId);
blacklist.push({
nome: legenda,
imagem: nomeArquivo,
descriptor,
data: new Date(),
chat_id: chatId || null,
_salvarNoBanco: true
});

salvarBlacklist(
blacklist
);

return {

sucesso: true,

reincidencia: false

};

}

module.exports = {

carregarModelos,

analisarImagem

};
