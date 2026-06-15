const { Client, LocalAuth } = require("whatsapp-web.js");

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "bot-blacklist"
    }),

    puppeteer: {
        headless: false,

        executablePath:
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",

        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage"
        ]
    }
});

module.exports = client;