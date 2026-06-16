const sqlite3 =
  require("sqlite3").verbose();

const path = require("path");

const dbPath = path.join(
  process.env.DATA_DIR || ".",
  "blacklist.db"
);

const db =
  new sqlite3.Database(
    dbPath,
    (err) => {

      if (err) {

        console.log(
          "Erro banco:",
          err.message
        );

      } else {

        console.log(
          "SQLite conectado"
        );

      }

    }
  );

// ========================================
// TABELA
// ========================================

db.serialize(() => {

  db.run(`

    CREATE TABLE IF NOT EXISTS blacklist (

      id INTEGER PRIMARY KEY AUTOINCREMENT,

      nome TEXT,
      imagem TEXT,
      data TEXT

    )

  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS lojas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      codigo TEXT UNIQUE,
      ativo INTEGER DEFAULT 1
    )
  `);

  const colunasExtras = [
    "status TEXT",
    "loja_id INTEGER",
    "descriptor TEXT",
    "observacao TEXT",
    "grupo TEXT"
  ];

  colunasExtras.forEach((coluna) => {
    db.run(`ALTER TABLE blacklist ADD COLUMN ${coluna}`, () => {});
  });

});

module.exports = db;