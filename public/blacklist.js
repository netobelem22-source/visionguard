const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("/var/www/visionguard/blacklist.db");

if (!fs.existsSync("blacklist.json")) {
  fs.writeFileSync("blacklist.json", "[]");
}

function lerBlacklist() {
  return JSON.parse(fs.readFileSync("blacklist.json"));
}

function salvarBlacklist(data) {
  const ultimo = data[data.length - 1];
  if (ultimo && ultimo._salvarNoBanco) {
    db.run(
      "INSERT INTO blacklist (nome, imagem, data, status, chat_id) VALUES (?, ?, ?, ?, ?)",
      [ultimo.nome, ultimo.imagem, new Date().toISOString(), "pendente", ultimo.chat_id || null],
      function(err) {
        if (err) console.log("ERRO DB:", err.message);
        else console.log("CADASTRO SALVO NO BANCO - ID:", this.lastID);
      }
    );
  }
  fs.writeFileSync("blacklist.json", JSON.stringify(data, null, 2));
}

module.exports = {
  lerBlacklist,
  salvarBlacklist
};
