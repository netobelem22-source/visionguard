const responderIA = require("./ai");
const estados = require("./state");

async function executarComando(intento, message) {

  switch (intento) {

   case "CADASTRO_FACIAL":

  estados[message.from] = "AGUARDANDO_FOTO";

  await message.reply(
    "📸 Envie a foto da pessoa para cadastro."
  );

  break;

    case "STATUS":
      await message.reply("✅ Sistema online");
      break;

    case "DESCONHECIDO":

      const resposta = await responderIA(message.body);

      await message.reply(resposta);

      break;

    default:
      console.log("Comando desconhecido");
  }

}

module.exports = executarComando;