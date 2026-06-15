const qrcode = require("qrcode-terminal");

const {
  Client
} = require("whatsapp-web.js");

const client = new Client();

client.on("qr", qr => {

  console.log("ESCANEIE O QR CODE:");

  qrcode.generate(qr, {
    small: true
  });

});

client.on("ready", () => {

  console.log("WhatsApp conectado");

});

client.on("message", async message => {

  console.log("Mensagem recebida:");
  console.log(message.body);

});

client.initialize();