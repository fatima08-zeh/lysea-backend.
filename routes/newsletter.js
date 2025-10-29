// routes/newsletter.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.post("/subscribe", async (req, res) => {   // ⬅️ chemin aligné
  const { email } = req.body;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Email invalide" });
  }
  try {
    await db.promise().execute(
      "INSERT INTO newsletter_subscribers (email) VALUES (?)",
      [email]
    );
    return res.json({ success: true });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Déjà inscrit" });
    }
    console.error("❌ Erreur newsletter :", e);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
