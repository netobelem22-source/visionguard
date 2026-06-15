const db =
  require("./database");

db.all(

  "SELECT * FROM blacklist",

  [],

  (err, rows) => {

    if (err) {

      console.log(err);

    } else {

      console.log(rows);

    }

  }

);