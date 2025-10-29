const express = require("express");
const router = express.Router();
const db = require("../config/db"); 
router.post("/create", async (req, res) => {
    try {
        console.log("🛒 Données reçues :", req.body); 
        const { userId, products, totalPrice } = req.body;

        if (!userId || !products.length || !totalPrice) {
            return res.status(400).json({ success: false, message: "Données invalides" });
        }

        const [orderResult] = await db.execute(
            "INSERT INTO orders (id_user, produits, date, statut, status) VALUES (?, ?, NOW(), 'En attente', 'Actif')",
            [userId, JSON.stringify(products)]
        );

        console.log("✅ Commande ajoutée à la DB, ID :", orderResult.insertId);

        res.json({ success: true, orderId: orderResult.insertId });

    } catch (error) {
        console.error("❌ Erreur lors de la création de commande :", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});
router.get("/user/:userId", async (req, res) => {
    const { userId } = req.params;
  
    try {
      const [orders] = await db.promise().query(
        "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
        [userId]
      );
      res.status(200).json(orders);
    } catch (error) {
      console.error("❌ Erreur récupération commandes :", error);
      res.status(500).json({ error: "Erreur lors du chargement des commandes." });
    }
  });
  


module.exports = router;
