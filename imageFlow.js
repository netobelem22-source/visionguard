const {
criarEstado,
limparEstado

} = require("./state");

const {
analisarImagem

} = require("./vision");

async function processarImagem(
usuario,
media
) {

const estado =
criarEstado(usuario);

estado.fotos.push(
media
);

estado.timestamp =
Date.now();

}

async function finalizarCadastro(

usuario,
legenda,
message

) {

const estado =
criarEstado(usuario);

for (const media of estado.fotos) {

const chat = await message.getChat();
const chatId = chat.id._serialized;
const resultado =
  await analisarImagem(
    media,
    legenda,
    chatId
  );

if (!resultado.sucesso) {

  await message.reply(
    resultado.mensagem
  );

  continue;

}

if (
  resultado.reincidencia
) {

  await message.reply(

` POSSÍVEL REINCIDÊNCIA DETECTADA

Cadastro semelhante encontrado:

${resultado.pessoa.nome}`

  );

  continue;

}

await message.reply(

`${legenda}

Imagem recebida! Aguarde a avaliação do operador.`

);

}

limparEstado(usuario);

}

module.exports = {

processarImagem,

finalizarCadastro

};
