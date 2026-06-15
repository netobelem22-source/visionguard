
const qrcode = require("qrcode-terminal");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(
  "/var/www/visionguard/blacklist.db"
);
const {
  Client,
  LocalAuth
} = require("whatsapp-web.js");

const fs = require("fs");
const path = require("path");

const faceapi = require("face-api.js");
const canvas = require("canvas");

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

// ========================================
// CRIAR PASTAS/ARQUIVOS NECESSÁRIOS
// ========================================

if (!fs.existsSync("uploads")) {

  fs.mkdirSync("uploads");

}

if (!fs.existsSync("blacklist.json")) {

  fs.writeFileSync(
    "blacklist.json",
    "[]"
  );

}

// ========================================
// CLIENT WHATSAPP
// ========================================

const client = new Client({

  authStrategy: new LocalAuth({
    clientId: "bot-blacklist"
  }),

  puppeteer: {
    headless: true
  }

});

// ========================================
// MEMÓRIA TEMPORÁRIA
// ========================================

const pendentes = {};
const timeoutsPendentes = {};

// ========================================
// LIMPAR PENDENTES ANTIGOS
// ========================================

setInterval(() => {

  const agora = Date.now();

  for (const usuario in pendentes) {

    const tempo =
      agora - pendentes[usuario].timestamp;

    // 2 minutos
    if (tempo > 120000) {

      delete pendentes[usuario];

      console.log(
        `Pendente removido: ${usuario}`
      );

      // cancelar timeout
      if (timeoutsPendentes[usuario]) {

        clearTimeout(
          timeoutsPendentes[usuario]
        );

        delete timeoutsPendentes[usuario];

      }

    }

  }

}, 60000);

// ========================================
// CARREGAR MODELOS
// ========================================

async function carregarModelos() {

  await faceapi.nets.tinyFaceDetector.loadFromDisk(
    path.join(__dirname, "models")
  );

  console.log("Modelos carregados");

}

carregarModelos();

// ========================================
// QR CODE
// ========================================

client.on("qr", qr => {

  console.log("QR CODE GERADO");

  qrcode.generate(qr, {
    small: true
  });

});

// ========================================
// CONECTADO
// ========================================

client.on("ready", () => {
  console.log("WhatsApp conectado");

  // Verificar fila de mensagens a cada 5 segundos
  setInterval(() => {
    const filaPath = "/var/www/visionguard/fila_mensagens.json";
    try {
      const fila = JSON.parse(fs.readFileSync(filaPath));
      if (fila.length > 0) {
        fila.forEach(item => {
          client.sendMessage(item.chatId, item.mensagem);
        });
        fs.writeFileSync(filaPath, "[]");
        console.log("Fila enviada:", fila.length, "mensagens");
      }
    } catch(e) {
      console.log("Erro fila:", e.message);
    }
  }, 5000);
});

// ========================================
// DESCONECTADO
// ========================================

client.on("disconnected", reason => {

  console.log(
    "WhatsApp desconectado:",
    reason
  );

});

// ========================================
// FALHA AUTENTICAÇÃO
// ========================================

client.on("auth_failure", msg => {

  console.log(
    "Falha autenticação:",
    msg
  );

});

// ========================================
// MENSAGENS
// ========================================

client.on("message_create", async message => {

  try {

    const chat = await message.getChat();

    // ========================================
    // GRUPOS PERMITIDOS
    // ========================================

    const gruposPermitidos = [

      "Face Black",
      "App-bot-test"

    ];

    if (

      !gruposPermitidos.includes(
        chat.name
      )

    ) {

      return;

    }

    // ========================================
    // IDENTIFICADOR USUÁRIO
    // ========================================

    const usuario =
      message.author || message.from;

    // ========================================
    // TEXTO
    // ========================================

    const texto = (
      message.body || ""
    ).toLowerCase();

    // ========================================
    // COMANDOS ACEITOS
    // ========================================

    const comandosCadastro = [

      "loja",
      "lj",
      "bebidas",
      "diversos",
      "carnes",
      "catalogo",
      "catálogo",
      "produto",
      "produtos",
      "comprar"

    ];

    // ========================================
    // DETECTAR COMANDO
    // ========================================

    const comandoDetectado =
      comandosCadastro.some(comando =>
        texto.includes(comando)
      );

    // ========================================
    // CASO 1
    // FOTO + LEGENDA
    // ========================================

    if (

      message.hasMedia &&
      comandoDetectado

    ) {

      console.log(
        "FOTO + LEGENDA"
      );

      await processarCadastro(
        message,
        texto
      );

      return;

    }

    // ========================================
    // CASO 2
    // FOTO SEM LEGENDA
    // ========================================

    if (

      message.hasMedia &&
      texto.trim() === ""

    ) {

      console.log(
        "FOTO SEM LEGENDA"
      );

      const media =
        await message.downloadMedia();

      pendentes[usuario] = {

        media,
        timestamp: Date.now()

      };

      console.log(
        "Imagem aguardando legenda"
      );

      // ========================================
      // CANCELAR TIMEOUT ANTIGO
      // ========================================

      if (timeoutsPendentes[usuario]) {

        clearTimeout(
          timeoutsPendentes[usuario]
        );

      }

      // ========================================
      // NOVO TIMEOUT
      // ========================================

      timeoutsPendentes[usuario] = setTimeout(async () => {

        // ainda existe pendente?
        if (pendentes[usuario]) {

          await message.reply(

            "Imagem recebida.\nEnvie a informação para concluir o cadastro."

          );

        }

      }, 20000);

      return;

    }

    // ========================================
    // CASO 3
    // LEGENDA APÓS FOTO
    // ========================================

    if (

      !message.hasMedia &&
      comandoDetectado

    ) {

      console.log(
        "LEGENDA RECEBIDA"
      );

      const pendente =
        pendentes[usuario];

      // ========================================
      // EXISTE FOTO PENDENTE
      // ========================================

      if (pendente) {

        console.log(
          "USANDO FOTO PENDENTE"
        );

        // ========================================
        // CANCELAR TIMEOUT
        // ========================================

        if (timeoutsPendentes[usuario]) {

          clearTimeout(
            timeoutsPendentes[usuario]
          );

          delete timeoutsPendentes[usuario];

        }

        await processarCadastroPendente(

          pendente.media,
          texto,
          message

        );

        // ========================================
        // LIMPAR MEMÓRIA
        // ========================================

        delete pendentes[usuario];

      }

      return;

    }

  } catch (erro) {

    console.log(
      "ERRO:",
      erro
    );

  }

});

// ========================================
// PROCESSAR FOTO + LEGENDA
// ========================================

async function processarCadastro(
  message,
  texto
) {

  const media =
    await message.downloadMedia();

  await salvarCadastro(
    media,
    texto,
    message
  );

}

// ========================================
// PROCESSAR FOTO PENDENTE
// ========================================

async function processarCadastroPendente(
  media,
  texto,
  message
) {

  await salvarCadastro(
    media,
    texto,
    message
  );

}

// ========================================
// SALVAR CADASTRO
// ========================================

async function salvarCadastro(
  media,
  texto,
  message
) {

  // ========================================
  // PEGAR NOME
  // ========================================

  const nome = texto.trim();

  console.log(
    "NOME:",
    nome
  );

  // ========================================
  // BUFFER
  // ========================================

  const buffer = Buffer.from(
    media.data,
    "base64"
  );

  // ========================================
  // NOME ARQUIVO
  // ========================================

  const nomeArquivo =
    `uploads/${Date.now()}.jpg`;

  // ========================================
  // SALVAR IMAGEM
  // ========================================

  fs.writeFileSync(
    nomeArquivo,
    buffer
  );

  console.log(
    "Imagem salva"
  );

  // ========================================
  // ANALISAR ROSTO
  // ========================================

  const img =
    await canvas.loadImage(
      nomeArquivo
    );

  const detections =
    await faceapi.detectAllFaces(

      img,

      new faceapi.TinyFaceDetectorOptions()

    );

  // ========================================
  // SEM ROSTO
  // ========================================

  if (detections.length === 0) {

    console.log(
      "SEM ROSTO"
    );

    fs.unlinkSync(
      nomeArquivo
    );

    message.reply(

      "Nenhum rosto detectado.\n A imagem vai passar pela análise, mas o cadastro pode ser rejeitado."

    );

    return;

  }

  console.log(
    "ROSTO DETECTADO"
  );
// ========================================
  // SALVAR NO BANCO
  // ========================================
  const chat = await message.getChat();
  const chatId = chat.id._serialized;
  const imagem = "/inputs/" + path.basename(nomeArquivo);
// Copiar imagem para pasta do painel
const origem = `/var/www/visionguard/uploads/${path.basename(nomeArquivo)}`;
const destino = `/var/www/visionguard/public/inputs/${path.basename(nomeArquivo)}`;
fs.copyFileSync(origem, destino);

  db.run(
    "INSERT INTO blacklist (nome, imagem, data, status, chat_id) VALUES (?, ?, ?, ?, ?)",
    [nome, imagem, new Date().toISOString(), "pendente", chatId],
    function(err) {
      if (err) console.log("ERRO DB:", err);
      else console.log("CADASTRO SALVO NO BANCO");
    }
  );
  // ========================================
  // RESPOSTA FINAL
  // ========================================
  message.reply(
`${nome}
Imagem recebida! Aguarde a avaliação do operador.`
  );
  
// ========================================
// ERROS GLOBAIS
// ========================================

process.on("unhandledRejection", err => {

  console.log(
    "ERRO NÃO TRATADO:",
    err
  );

});

process.on("uncaughtException", err => {

  console.log(
    "EXCEÇÃO NÃO TRATADA:",
    err
  );

});

// ========================================
// INICIAR
// ========================================

client.initialize();
