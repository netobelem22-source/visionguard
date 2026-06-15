
const { exec } = require("child_process");
const qrcode = require("qrcode-terminal");

const {
  Client,
  LocalAuth
} = require("whatsapp-web.js");

const fs = require("fs");
const db =
  require("./database");
const path = require("path");


const faceapi = require("face-api.js");
const canvas = require("canvas");
const sharp = require("sharp");

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
// PASTAS
// ========================================

if (!fs.existsSync("uploads")) {

  fs.mkdirSync("uploads");

}

if (!fs.existsSync("models")) {

  fs.mkdirSync("models");

}

if (!fs.existsSync("blacklist.json")) {

  fs.writeFileSync(
    "blacklist.json",
    "[]"
  );

}

// ========================================
// MEMÓRIA
// ========================================

const pendentes = {};
const estados = {};

// ========================================
// CLIENT
// ========================================
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "bot-blacklist"
  }),
  puppeteer: {
    headless: true,
    executablePath: "/usr/bin/chromium-browser",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu"
    ]
  }
});

// ========================================
// CARREGAR MODELOS
// ========================================

async function carregarModelos() {

  await faceapi.nets.tinyFaceDetector.loadFromDisk(
    path.join(__dirname, "models")
  );

  await faceapi.nets.ssdMobilenetv1.loadFromDisk(
    path.join(__dirname, "models")
  );

  await faceapi.nets.faceLandmark68Net.loadFromDisk(
    path.join(__dirname, "models")
  );

  await faceapi.nets.faceRecognitionNet.loadFromDisk(
    path.join(__dirname, "models")
  );

  console.log(
    "MODELOS CARREGADOS"
  );

}

// ========================================
// QR CODE
// ========================================

client.on("qr", qr => {

  console.log(
    "QR CODE GERADO"
  );

  qrcode.generate(qr, {
    small: true
  });

});

// ========================================
// READY
// ========================================

client.on("ready", () => {
  console.log("WHATSAPP CONECTADO");

  // Verificar fila de mensagens a cada 5 segundos
  setInterval(async () => {
    const filaPath = "/var/www/visionguard/fila_mensagens.json";
    try {
      const state = await client.getState();
      if (state !== 'CONNECTED') return;
      const fila = JSON.parse(fs.readFileSync(filaPath));
      if (fila.length > 0) {
        for (const item of fila) {
          try {
            if (item.messageId) {
              await client.sendMessage(item.chatId, item.mensagem, { quotedMessageId: item.messageId });
            } else {
              await client.sendMessage(item.chatId, item.mensagem);
            }
          } catch(e) {
            console.log("Erro ao enviar mensagem:", e.message);
          }
        }
        fs.writeFileSync(filaPath, "[]");
        console.log("Fila enviada:", fila.length, "mensagens");
      }
    } catch(e) {
      console.log("Erro fila:", e.message);
    }
  }, 5000);
});

// ========================================
// MESSAGE
// ========================================
// ========================================
// DESCONECTADO - RECONEXÃO AUTOMÁTICA
// =======================================
client.on("disconnected", (reason) => {
  console.log("WHATSAPP DESCONECTADO:", reason);
  if (reason === 'LOGOUT') {
    console.log("Sessão encerrada pelo usuário.");
    process.exit(0);
  } else {
    console.log("Tentando reconectar em 5 segundos...");
    setTimeout(() => {
      client.initialize();
    }, 5000);
  }
});

client.on("auth_failure", (msg) => {
  console.log("FALHA DE AUTENTICAÇÃO:", msg);
});

client.on("auth_failure", (msg) => {
  console.log("FALHA DE AUTENTICAÇÃO:", msg);
  setTimeout(() => {
    console.log("REINICIANDO AUTENTICAÇÃO...");
    client.initialize();
  }, 10000);
});
client.on("message_create", async message => {

  try {

    // ========================================
    // IGNORAR BOT
    // ========================================

    if (message.fromMe) {

      return;

    }

    // ========================================
    // CHAT
    // ========================================

    const chat =
      await message.getChat();

    // ========================================
    // GRUPOS
    // ========================================

    const gruposPermitidos = [

      "App-bot-test",
      "Face Black"

    ];

    if (

      !gruposPermitidos.includes(
        chat.name
      )

    ) {

      return;

    }

    // ========================================
    // USUÁRIO
    // ========================================

    const usuario =
      message.author || message.from;

    // ========================================
    // TEXTO
    // ========================================

    const texto = (
      message.body || ""
    ).toLowerCase().trim();

    // ========================================
    // ESTADO
    // ========================================

    const estadoAtual =
      estados[usuario];

    // ========================================
    // IA AGUARDANDO IMAGEM
    // ========================================

    if (

      estadoAtual ===
        "aguardando_imagem_ia" &&

      message.hasMedia

    ) {

      await message.reply(

`Imagem recebida.

A IA irá analisar as imagens enviadas.`

      );

      delete estados[usuario];

      return;

    }

    // ========================================
    // COMANDOS
    // ========================================

    const comandosCadastro = [

      "loja",
      "lj",
      "bebidas",
      "facial",
      "blacklist",
      "cadastrar"

    ];

    const ehCadastro =
      comandosCadastro.some(c =>
        texto.includes(c)
      );

    // ========================================
    // FOTO + LEGENDA
    // ========================================

    if (

      message.hasMedia &&
      texto !== ""

    ) {

      // ========================================
      // CADASTRO
      // ========================================

      if (ehCadastro) {

        const media =
          await message.downloadMedia();

        await salvarCadastro(

          media,
          texto,
          message

        );

        return;

      }

      // ========================================
      // IA
      // ========================================

      await message.reply(

`Imagem recebida.

A IA irá analisar a imagem enviada.`

      );

      return;

    }

    // ========================================
    // FOTO SEM LEGENDA
    // ========================================

    if (

      message.hasMedia &&
      texto === ""

    ) {

      const media =
        await message.downloadMedia();

      if (!pendentes[usuario]) {

        pendentes[usuario] = {

          fotos: [],
          timestamp: Date.now()

        };

      }

      pendentes[usuario]
        .fotos
        .push(media);

      await message.reply(

`Imagem recebida.

Total:
${pendentes[usuario].fotos.length}

Agora nos informe a LOJA e o HORÁRIO, por favor.`

      );

      return;

    }

    // ========================================
    // LEGENDA APÓS FOTO
    // ========================================

    if (

      !message.hasMedia &&
      ehCadastro

    ) {

      const dados =
        pendentes[usuario];

      if (!dados) {

        await message.reply(

`Nenhuma imagem pendente encontrada.`

        );

        return;

      }

      const fotos =
        dados.fotos;

      for (const media of fotos) {

        await salvarCadastro(

          media,
          texto,
          message

        );

      }

      delete pendentes[usuario];

      return;

    }

    // ========================================
    // IA MELHORAR IMAGEM
    // ========================================

    if (

      texto.includes("consegue melhorar imagem") ||
      texto.includes("melhorar esta imagem") ||
      texto.includes("melhorar foto") ||
      texto.includes("analisar imagem")

    ) {

      estados[usuario] =
        "aguardando_imagem_ia";

      await message.reply(

`Claro.

Envie a imagem que você deseja analisar ou melhorar.`

      );

      return;

    }

    // ========================================
    // IA NORMAL
    // ========================================

// ========================================
// IA SIMPLES
// ========================================

if (

  texto.includes("oi") ||
  texto.includes("olá") ||
  texto.includes("opa")

) {

  await message.reply(

`Olá.

Como posso ajudar?`

  );

  return;

}

// ========================================

if (

  texto.includes("obrigado") ||
  texto.includes("valeu")

) {

  await message.reply(

`Disponha.`

  );

  return;

}

// ========================================

if (

  texto.includes("tudo bem")

) {

  await message.reply(

`Tudo certo por aqui.`

  );

  return;

}

// ========================================

if (

  texto.includes("quem é você")

) {

  await message.reply(

`Sou o sistema de análise facial e suporte.`

  );

  return;

}

// ========================================
// FALLBACK
// ========================================

await message.reply(

`Não entendi sua solicitação.

Você pode:

• enviar imagens
• cadastrar blacklist
• pedir análise`

);

  } catch (erro) {

    console.log(
      "ERRO:",
      erro
    );

  }

});

// ========================================
// SALVAR CADASTRO
// ========================================

async function salvarCadastro(media, texto, message) {
  try {
    const nome = texto.trim();
    const buffer = Buffer.from(media.data, "base64");
    const timestamp = Date.now();

    // ========================================
    // SALVAR IMAGEM RECEBIDA
    // ========================================
    if (!fs.existsSync("inputs")) {
      fs.mkdirSync("inputs");
    }

    const caminhoImagem = path.join(__dirname, "inputs", timestamp + ".jpg");
    fs.writeFileSync(caminhoImagem, buffer);
    console.log("CAMINHO IMAGEM:", caminhoImagem);
    console.log("EXISTE:", fs.existsSync(caminhoImagem));

    // ========================================
    // PASTA UNICA POR PROCESSO
    // ========================================
    const pastaRestored = `/var/www/GFPGAN/resultados/restored_faces_${timestamp}`;
    if (!fs.existsSync(pastaRestored)) {
      fs.mkdirSync(pastaRestored, { recursive: true });
    }

    // ========================================
    // GFPGAN
    // ========================================
    await new Promise((resolve, reject) => {
      exec(
        `python3 /var/www/GFPGAN/melhorar.py ${caminhoImagem} ${pastaRestored}`,
        (erro, stdout, stderr) => {
          console.log("GFPGAN STDOUT:", stdout);
          console.log("GFPGAN STDERR:", stderr);
          if (erro) {
            console.log("ERRO GFPGAN:", erro);
            return reject(erro);
          }
          console.log("GFPGAN OK");
          resolve();
        }
      );
    });

    // ========================================
    // PEGAR ARQUIVO GERADO
    // ========================================
    const pastaFinal = path.join(pastaRestored, "restored_faces");

    if (!fs.existsSync(pastaFinal) || !fs.readdirSync(pastaFinal).length) {
  await message.reply("Rosto muito distante ou baixa qualidade.\nConsegue enviar uma foto mais próxima ou com melhor resolução?");
  fs.rmSync(pastaRestored, { recursive: true, force: true });
  return;
}

    const ultimoArquivo = fs.readdirSync(pastaFinal)[0];
    const imagemMelhorada = path.join(pastaFinal, ultimoArquivo);

    // ========================================
    // CAMINHOS
    // ========================================
    const nomeOriginal = caminhoImagem;
    const nomeSharp = path.join(__dirname, "inputs", `melhorada_${timestamp}.jpg`);

    // ========================================
    // CARREGAR IMAGEM
    // ========================================
    const imagemOriginal = await canvas.loadImage(nomeOriginal);

    // ========================================
    // DETECTAR FACE
    // ========================================
    const detections = await faceapi
      .detectAllFaces(imagemOriginal, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }));

    if (!detections.length) {
  await message.reply("Rosto muito distante ou baixa qualidade.\nConsegue enviar uma foto mais próxima ou com melhor resolução?");
  fs.rmSync(pastaRestored, { recursive: true, force: true });
  return;
}

    // ========================================
    // VALIDAR TAMANHO DO ROSTO
    // ========================================
    const face = detections[0];
    if (face.box.width < 30 || face.box.height < 30) {
  await message.reply("Rosto muito distante ou baixa qualidade.\nConsegue enviar uma foto mais próxima ou com melhor resolução?");
  fs.rmSync(pastaRestored, { recursive: true, force: true });
  return;
}

    // ========================================
    // RECORTE
    // ========================================
    const box = detections[0].box;
    const margem = 120;
    const x = Math.max(0, box.x - margem);
    const y = Math.max(0, box.y - margem);
    const width = box.width + margem * 2;
    const height = box.height + margem * 2;

    const faceCanvas = canvas.createCanvas(width, height);
    const ctx = faceCanvas.getContext("2d");
    ctx.drawImage(imagemOriginal, x, y, width, height, 0, 0, width, height);

    const bufferFace = faceCanvas.toBuffer("image/jpeg");
    fs.writeFileSync(nomeOriginal, bufferFace);
    console.log("ROSTO RECORTADO");

    // ========================================
    // SHARP
    // ========================================
    await sharp(nomeOriginal)
      .resize({ width: 320 })
      .normalize()
      .sharpen()
      .jpeg({ quality: 90 })
      .toFile(nomeSharp);
    console.log("SHARP FINALIZADO");

    // ========================================
    // CARREGAR MELHORADA
    // ========================================
    const img = await canvas.loadImage(imagemMelhorada);

    // ========================================
    // DETECÇÃO FINAL
    // ========================================
    const rostos = await faceapi
      .detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
      .withFaceLandmarks()
      .withFaceDescriptors();

    const detection = rostos[0];

    if (!detection) {
      await message.reply(
`Rosto não detectado após processamento.
A imagem possui baixa qualidade, ângulo ruim ou baixa nitidez.
Será analisada manualmente, mas pode ser descartada caso não seja possível identificar um rosto.`
      );
      return;
    }

    // ========================================
    // DESCRIPTOR
    // ========================================
    const descriptor = Array.from(detection.descriptor);

    // ========================================
    // COPIAR PARA PUBLIC
    // ========================================
    const nomeFinal = ultimoArquivo;
    const destinoPublico = path.join(__dirname, "public", nomeFinal);

    if (!fs.existsSync(path.join(__dirname, "public"))) {
      fs.mkdirSync(path.join(__dirname, "public"));
    }

    fs.copyFileSync(imagemMelhorada, destinoPublico);
    const imagemWeb = "/" + nomeFinal;

    // ========================================
    // SALVAR NO BANCO
    // ========================================
    const chat = await message.getChat();
const chatId = chat.id._serialized;
db.run(
  `INSERT INTO blacklist (nome, imagem, data, status, chat_id, message_id) VALUES (?, ?, ?, ?, ?, ?)`,
[texto || "Detectado IA", imagemWeb, new Date().toISOString(), "pendente", chatId, message.id._serialized]
);

    // ========================================
    // SALVAR NO JSON
    // ========================================
    const blacklist = JSON.parse(fs.readFileSync("blacklist.json"));
    blacklist.push({
      nome,
      imagem: nomeSharp,
      descriptor,
      data: new Date().toISOString()
    });
    fs.writeFileSync("blacklist.json", JSON.stringify(blacklist, null, 2));

    // ========================================
    // SUCESSO
    // ========================================
    await message.reply(
`${nome}
Imagem recebida! Aguarde a avaliação do operador.`
);

    // ========================================
    // LIMPAR PASTA TEMPORARIA
    // ========================================
    fs.rmSync(pastaRestored, { recursive: true, force: true });
    console.log("PASTA TEMPORARIA REMOVIDA");

  } catch (erro) {
    console.log("ERRO SALVAR:", erro);
  }
}


// ========================================
// INICIAR
// ========================================

async function iniciar() {

  console.log(
    "INICIANDO SISTEMA..."
  );

  await carregarModelos();

  client.initialize();

}

iniciar();

