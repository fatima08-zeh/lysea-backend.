require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./config/db");
const path = require("path");
const bcrypt = require("bcryptjs");
const favoritesRoutes = require("./routes/favorites");

console.log("🛂 PAYPAL_CLIENT_ID:", process.env.PAYPAL_CLIENT_ID);
console.log("🛂 PAYPAL_SECRET:", process.env.PAYPAL_SECRET);

const app = express();
app.use(express.json());
app.use(cors({
origin: process.env.CORS_ORIGIN || "http://localhost:3000",  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  credentials: true 
}));
// ✅ Middleware pour les pré-requêtes (OPTIONS) pour toutes les routes
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  res.sendStatus(200);
});



app.get("/test-cors", (req, res) => {
  res.json({ message: "CORS fonctionne !" });
});


// ✅ Configuration PayPal
if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_SECRET) {
  console.error("❌ Clés PayPal manquantes !");
} else {
  console.log("📌 Clés PayPal chargées ✅");
}


const addressRoutes = require("./routes/address");
const usersRoutes = require("./routes/users");
const productsRoutes = require("./routes/products");
const ordersRoutes = require("./routes/orders");
const checkoutRoutes = require("./routes/checkout");
const cartRoutes = require("./routes/cartRoutes"); // ✅ charger le fichier
const chatRoutes = require("./routes/chat");
const newsletterRoutes = require("./routes/newsletter");


app.use("/api/newsletter", newsletterRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/checkout", require("./routes/checkout"));
app.use("/api/addresses", addressRoutes);
app.use("/api/favorites", favoritesRoutes);
console.log("✅ Route /api/favorites chargée !");
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
console.log("🔄 Chargement des routes...");
app.use("/api/users", usersRoutes);
console.log("✅ Route /api/users chargée !");
console.log("✅ Route /api/products chargée !");
app.use("/api/orders", ordersRoutes);
console.log("✅ Route /api/orders chargée !");
console.log("✅ Route /api/cart chargée !");
app.use("/api/products", require("./routes/products"));
app.use("/api/cart", cartRoutes); // ✅ associer au chemin
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Erreur de connexion à MySQL :", err);
    return;
  }
  if (connection) connection.release();
  console.log("✅ Connecté à la base de données MySQL !");
});


async function createDefaultAdmin() {
  try {
      const [results] = await db.promise().query("SELECT * FROM users WHERE role = 'admin'");

      if (results.length === 0) {
          const bcrypt = require("bcryptjs");
          const hashedPassword = await bcrypt.hash("2002", 10); // Chiffrement du mot de passe

          const adminUser = {
              nom: "fatima",
              email: "fatima@example.com",
              telephone: "4388603575",
              mot_de_passe: hashedPassword,  // Mot de passe haché
              role: "admin",
              is_connected: 0,
              is_blocked: 0
          };

          await db.promise().query(
              "INSERT INTO users (nom, email, telephone, mot_de_passe, role, is_connected, is_blocked) VALUES (?, ?, ?, ?, ?, ?, ?)",
              [adminUser.nom, adminUser.email, adminUser.telephone, adminUser.mot_de_passe, adminUser.role, adminUser.is_connected, adminUser.is_blocked]
          );

          console.log("✅ Administrateur par défaut créé avec succès !");
      } else {
          console.log("ℹ️ Administrateur déjà existant.");
      }
  } catch (error) {
      console.error("❌ Erreur lors de la création de l'administrateur par défaut :", error);
  }
}
// --- DEBUG OpenAI ---
const OpenAI = require("openai");
app.post("/api/chat/ping-openai", async (req, res) => {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const r = await openai.responses.create({
      model: "gpt-4o-mini",
      input: "Dis juste: OK LYSÉA",
      max_output_tokens: 10,
    });
    return res.json({ ok: true, text: r.output_text?.trim() });
  } catch (e) {
    console.error("🔴 OpenAI KO:", e?.response?.data || e?.message || e);
    return res.status(500).json({ ok: false, where: "openai", error: e?.message || "openai error" });
  }
});

createDefaultAdmin();

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});
