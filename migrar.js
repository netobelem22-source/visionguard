const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const db = new sqlite3.Database('/var/www/visionguard/blacklist.db');
const json = JSON.parse(fs.readFileSync('/var/www/visionguard/blacklist.json'));
let atualizados = 0;
json.forEach(function(item) {
  if (!item.descriptor || !item.imagem) return;
  const desc = JSON.stringify(item.descriptor);
  db.run('UPDATE blacklist SET descriptor = ? WHERE imagem = ?', [desc, item.imagem], function(err) {
    if (err) return;
    if (this.changes > 0) atualizados++;
  });
});
setTimeout(function() {
  console.log('Descritores migrados:', atualizados);
  db.close();
}, 3000);
