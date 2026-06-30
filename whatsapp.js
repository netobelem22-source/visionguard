const { Client, LocalAuth } = require("whatsapp-web.js");

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "bot-blacklist" }),
  puppeteer: { headless: true }
});

module.exports = client;
