// 📁 backend/routes/chat.js
const express = require("express");
const router = express.Router();
require("dotenv").config();
const OpenAI = require("openai");
const db = require("../config/db");

// ---- Config ----
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const SAFE_MODE = String(process.env.SAFE_MODE || "").toLowerCase() === "true";
const SKIP_DB   = String(process.env.SKIP_DB   || "").toLowerCase() === "true";
const AI_TIMEOUT_MS = 3000;   // coupe l'IA après 3s (fallback)
const DB_LIMIT = 6;           // nb max de produits renvoyés

console.log("CHAT FLAGS => SAFE_MODE:", SAFE_MODE, "SKIP_DB:", SKIP_DB);

// --- petit extracteur de mots-clés si l'IA est KO ---
const simpleExtract = (text) => {
  const t = (text || "").toLowerCase();
  const dict = [
    ["tonique","toner","lotion tonique"],
    ["hydratant","hydratation","crème hydratante","gel hydratant"],
    ["anti-âge","rides","fermeté","collagène"],
    ["éclat","taches","vitamine c","brightening","glow"],
    ["yeux","cernes","poches","contour des yeux"],
    ["acné","imperfections","boutons","sébum","points noirs"],
    ["sensible","rougeurs","irritations"],
    ["sèche","peau sèche","déshydratée"],
    ["grasse","peau grasse","brillance"],
    ["mixte","peau mixte"]
  ];
  const found = new Set();
  for (const g of dict) if (g.some(k => t.includes(k))) found.add(g[0]);
  if (!found.size) t.split(/\W+/).filter(w=>w.length>3).slice(0,3).forEach(w=>found.add(w));
  return Array.from(found).slice(0,3);
};

router.post("/", async (req, res) => {
  const userMessage = (req.body?.message ?? "").toString().trim();
  if (!userMessage) {
    return res.json({ reply: "Dites-moi ce que vous cherchez 😊 (ex.: tonique, crème hydratante, sérum anti-âge…)" });
  }

  // ---------- 1) CONSEIL + MOTS-CLÉS (IA avec timeout + fallback) ----------
  let advice = "";
  let keywords = [];
  try {
    if (SAFE_MODE) throw new Error("SAFE_MODE");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort("AI timeout"), AI_TIMEOUT_MS);

    const sys = `Tu es conseiller beauté Lyséa. Réponds en JSON strict:
{"advice":"2-3 phrases de conseil", "keywords":["mot1","mot2"]} (1 à 5 mots-clés). Français.`;

    const ai = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: sys },
        { role: "user", content: userMessage },
      ],
      temperature: 0.4,
      max_output_tokens: 200,
      signal: controller.signal,
    });

    clearTimeout(timer);

    let parsed = {};
    try { parsed = JSON.parse(ai.output_text || "{}"); } catch {}
    advice = (parsed.advice || "").trim();
    keywords = Array.isArray(parsed.keywords) ? parsed.keywords.map(s => String(s).toLowerCase()) : [];

    if (!advice) advice = "Commencez par un nettoyant doux, appliquez un soin ciblé, puis un hydratant adapté et une protection solaire le matin.";
    if (!keywords.length) keywords = simpleExtract(userMessage);
  } catch (e) {
    console.warn("⚠️ IA (fallback):", e?.message || e);
    advice = "Commencez par un nettoyant doux, appliquez un soin ciblé, puis un hydratant adapté et une protection solaire le matin.";
    keywords = simpleExtract(userMessage);
  }

// ---------- 2) RECHERCHE PRODUITS (adapté à ton schéma) ----------
let productHTML = "";
try {
  if (!SKIP_DB) {
    // 🔎 Colonnes réelles: nom, brand, description, categorie
    const cols = [
      "LOWER(nom)",
      "LOWER(brand)",
      "LOWER(IFNULL(description,''))",
      "LOWER(IFNULL(categorie,''))",
    ];

    const likeParts = [];
    const params = [];
    const kws = (keywords.length ? keywords : simpleExtract(userMessage)).slice(0, 3);

    for (const kw of kws) {
      const like = `%${kw.toLowerCase()}%`;
      for (const c of cols) {
        likeParts.push(`${c} LIKE ?`);
        params.push(like);
      }
    }

    const where = likeParts.length ? `WHERE ${likeParts.join(" OR ")}` : "";

    const [rows] = await db.promise().query(
      `
      SELECT 
        id,
        nom,
        brand,
        prix,
        LEFT(IFNULL(description,''), 160) AS short_desc
      FROM products
      ${where}
      ORDER BY id DESC
      LIMIT ?
      `,
      [...params, DB_LIMIT]
    );

    if (rows.length) {
      productHTML =
        "<br><br>Voici quelques options :<br><br>" +
        rows
          .map(
            (p) => `
🧴 <strong>${p.nom}</strong>${p.brand ? ` (${p.brand})` : ""}<br>
${p.short_desc ? `📝 ${p.short_desc}<br>` : ""}
💵 ${Number(p.prix ?? 0).toFixed(2)} CAD<br>
👉 <a href="/product/${p.id}" class="chat-link" data-react-router="true">Voir le produit</a>
          `.trim()
          )
          .join("<br><br>");
    } else {
      productHTML =
        "<br><br>Je n’ai rien trouvé avec ces mots. Précisez le type de peau (sèche, grasse, mixte, sensible) ou la catégorie (ex. tonique, crème, sérum).";
    }
  } else {
    productHTML = "<br><br>(Recherche produits désactivée)";
  }
} catch (sqlErr) {
  console.error("❌ SQL:", sqlErr); // garde le log complet
  productHTML =
    "<br><br>(Recherche momentanément indisponible) Dites-moi votre type de peau : sèche, grasse, mixte, sensible ?";
}

  // ---------- 3) RÉPONSE ----------
  return res.json({ reply: `${advice}${productHTML}` });
});

module.exports = router;
