const sqlite3 =
  require("sqlite3").verbose();

const db =
  new sqlite3.Database(
    "./blacklist.db",
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

});

module.exports = db;