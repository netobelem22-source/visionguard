const OpenAI = require("openai");

const openai = new OpenAI({
apiKey: process.env.OPENAI_API_KEY
});

// ========================================
// HANDLER IA
// ========================================

async function messageHandler(
message
) {

try {

const pergunta =
  message.body;

console.log(
  "PERGUNTA:",
  pergunta
);

// ========================================
// OPENAI
// ========================================

const resposta =
  await openai.chat.completions.create({

    model: "gpt-4.1-mini",

    messages: [

      {
        role: "system",

        content:

`Você é uma IA integrada a um sistema de blacklist facial.

Responda de forma:

- curta
- objetiva
- profissional
- natural

Nunca invente informações.`

      },

      {
        role: "user",
        content: pergunta
      }

    ],

    temperature: 0.7

  });

// ========================================
// TEXTO IA
// ========================================

const textoIA =

  resposta.choices[0]
    .message.content;

console.log(
  "RESPOSTA IA:",
  textoIA
);

// ========================================
// ENVIAR WHATSAPP
// ========================================

await message.reply(
  textoIA
);

console.log(
  "RESPOSTA ENVIADA"
);

} catch (erro) {

console.log(
  "ERRO IA:",
  erro
);

}

}

module.exports =
messageHandler;