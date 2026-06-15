require("dotenv").config();

const helmet =
  require("helmet");
const compression = require("compression");
const rateLimit =
  require("express-rate-limit");

const express =
  require("express");

const fs =
  require("fs");

const path =
  require("path");

const session =
  require("express-session");
const SQLiteStore = require('connect-sqlite3')(session);
const db =
  require("./database");
const authRoutes =

  require("./routes/auth");
const dashboardRoutes =

  require("./routes/dashboard");  
const verificarLogin =
  require("./middleware/auth");
const adminRoutes =
  require("./routes/admin");
const perfisRoutes =
  require("./routes/perfis");
const app = express();
const registrarRoutes =
  require("./routes/registrar");
const http =
  require("http");

const server =
  http.createServer(app);

const { Server } =
  require("socket.io");

const io =
  new Server(server);
app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

app.use(
  "/inputs",
  express.static(
    path.join(__dirname, "inputs")
  )
);
app.set("io", io);

app.set("view engine", "ejs");

app.set(
  "views",
  path.join(__dirname, "views")
);



// ========================================
// FORMULÁRIOS
// ========================================
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));

// ========================================
// SESSÃO
// ========================================
app.use(session({
  secret: process.env.SESSION_SECRET || "blacklistkoch123",
  resave: false,
  saveUninitialized: false,
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: '/var/www/visionguard'
  }),
  cookie: {
    expires: false
  }
}));


app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://fonts.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
    }
  }
}));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500
  })
);



// ========================================
// VERIFICAR LOGIN
// ========================================
app.use(authRoutes);
app.use(registrarRoutes);
app.use(dashboardRoutes);
app.use(adminRoutes);
app.use(perfisRoutes);
// ========================================
// RELATÓRIOS
// ========================================
app.get(
  "/relatorios",
  verificarLogin,
  (req, res) => {
    res.render("relatorios");
  }
);



// ========================================
// SERVIDOR
// ========================================

server.listen(

  process.env.PORT || 3000,

  "0.0.0.0",

  () => {

    console.log(
      "Painel iniciado"
    );

  }

);
