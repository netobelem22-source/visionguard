const OpenAI = require("openai");

const openai = new OpenAI({

apiKey:
process.env.OPENAI_API_KEY

});

async function responderIA(message) {

try {

const pergunta =
  message.body;

const resposta =

  await openai.chat
    .completions.create({

      model:
        "gpt-4.1-mini",

      messages: [

        {

          role: "system",

          content:

`Você é uma IA integrada a um sistema de reconhecimento facial.

Você consegue:

- conversar
- orientar usuários
- pedir imagens
- ajudar em cadastros

Se o usuário pedir:

- melhorar imagem
- analisar imagem
- verificar rosto

peça para enviar a imagem.`

        },

        {

          role: "user",

          content:
            pergunta

        }

      ]

    });

return resposta
  .choices[0]
  .message.content;

} catch (erro) {

console.log(
  "ERRO IA:",
  erro
);

return "Erro na IA.";

}

}

module.exports = {
responderIA
};