const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use(express.json());

//set cors
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

const db = new sqlite3.Database("./database.sqlite", (err) => {
  if (err) {
    console.error("Error opening database", err.message);
  } else {
    console.log("Connected to SQLite database.");
  }
});

db.run(`
    CREATE TABLE IF NOT EXISTS clothes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code VARCHAR(16) NOT NULL,
        name TEXT,
        price INTEGER NOT NULL,
        fabric_cost INTEGER NOT NULL,
        labor_cost INTEGER NOT NULL,
        other_cost INTEGER NOT NULL,
        image TEXT DEFAULT 'https://i.pinimg.com/736x/25/ed/a6/25eda66bf5b3956248c7c4c05b64e747.jpg'
    );
    `);
db.run(`
        CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clothe_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (clothe_id) REFERENCES clothes(id)
    );`);
if (process.env.SEED_DB) {
  console.log("Seeding the database");
  db.run(`
        INSERT INTO clothes (code, name, price, fabric_cost, labor_cost, other_cost) VALUES
        ('B1D1', 'Uzun köynək və güllü yupka', 155, 25, 25, 10),
        ('A1H1', 'İpli kostyum', 185, 28, 35, 10),
        ('A2İ1L1', 'Boz palto dəsti', 350, 77, 70, 15),
        ('G1', 'İpək bluz', 90, 35, 25, 10),
        ('A3', 'Korsetli şalvar', 140, 20, 25, 10),
        ('A4G2', 'İpək dəst', 140, 25, 25, 10),
        ('A5G3', 'Qara ipək yarıq kəsimli dəst', 135, 25, 25, 10),
        ('G4', 'Qızılı-qara bluz', 60, 15, 20, 10),
        ('A6G5', 'Qırmızı sport dəst', 140, 35, 25, 10),
        ('C1G6', 'Qara şort bluz', 120, 20, 25, 10);`);
}

function handleQueryResult(err, rows, res) {
  if (err) {
    console.log(err);
    return res.status(500).send(err.message);
  } else {
    return res.json(rows);
  }
}
app.get("/clothes", (req, res) => {
  const { query } = req.query;
  if (query) {
    db.all(
      `SELECT c.*, count(o.id) as sold FROM clothes c LEFT JOIN orders o ON o.clothe_id = c.id WHERE name LIKE '%${query}%' OR code LIKE '%${query}%' GROUP BY c.id ORDER BY sold DESC`,
      (err, rows) => handleQueryResult(err, rows, res)
    );
    return;
  }

  db.all(
    "SELECT c.*, count(o.id) as sold FROM clothes c LEFT JOIN orders o ON o.clothe_id = c.id GROUP BY c.id ORDER BY sold DESC",
    (err, rows) => handleQueryResult(err, rows, res)
  );
});

app.get("/clothes/:id", (req, res) => {
  db.get("SELECT * FROM clothes WHERE id = ?", [req.params.id], (err, row) =>
    handleQueryResult(err, row, res)
  );
});

app.post("/orders", (req, res) => {
  console.log(req.body);
  // Check if the clothe_id is provided and is a number in range of 1 to 100
  if (
    !req.body.clothe_id ||
    req.body.clothe_id < 1 ||
    req.body.clothe_id > 100
  ) {
    return res
      .status(400)
      .send(
        "Clothe ID is required and should be a number in range of 1 to 100"
      );
  }
  // Check if the clothe exists
  db.get(
    "SELECT * FROM clothes WHERE id = ?",
    [req.body.clothe_id],
    (err, row) => handleQueryResult(err, row, res)
  );

  db.run(
    "INSERT INTO orders (clothe_id) VALUES (?)",
    [req.body.clothe_id],
    function (err) {
      if (err) {
        console.log(err);
        return res.status(500).send(err.message);
      }
      return res.json({ id: this.lastID });
    }
  );
});

app.delete("/orders/:id", (req, res) => {
  db.run("DELETE FROM orders WHERE id = ?", [req.params.id], (err) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err.message);
    }
    return res.send("Order deleted");
  });
});

app.get("/orders", (req, res) => {
  db.all("SELECT * FROM orders", (err, rows) => {
    if (err) {
      console.log(err);
      res.status(500).send(err.message);
    } else {
      res.json(rows);
    }
  });
});

app.get("/orders/:id", (req, res) => {
  db.get(
    "SELECT * FROM orders JOIN clothes on clothes.id - orders.clothe_id WHERE clothes.id = ?",
    [req.params.id],
    (err, row) => handleQueryResult(err, row, res)
  );
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
