const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("/var/www/visionguard/blacklist.db");

if (!fs.existsSync("blacklist.json")) {
  fs.writeFileSync("blacklist.json", "[]");
}

function lerBlacklist() {
  return new Promise((resolve) => {
    db.all('SELECT nome, imagem, descriptor FROM blacklist WHERE descriptor IS NOT NULL AND (status = "aprovado" OR status IS NULL)', [], (err, rows) => {
      if (err || !rows) return resolve([]);
      resolve(rows.map(r => ({
        nome: r.nome,
        imagem: r.imagem,
        descriptor: r.descriptor ? JSON.parse(r.descriptor) : null
      })));
    });
  });
}

function salvarBlacklist(data) {
  const ultimo = data[data.length - 1];
  if (ultimo && ultimo._salvarNoBanco) {
    const descriptor = ultimo.descriptor ? JSON.stringify(Array.from(ultimo.descriptor)) : null;
    db.run(
      "INSERT INTO blacklist (nome, imagem, data, status, chat_id, descriptor) VALUES (?, ?, ?, ?, ?, ?)",
      [ultimo.nome, ultimo.imagem, new Date().toISOString(), "pendente", ultimo.chat_id || null, descriptor],
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
