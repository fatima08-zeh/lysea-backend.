const express = require("express");
const db = require("../config/db");
const router = express.Router();

router.post("/add", async (req, res) => {
    const { user_id, product_id } = req.body;

    try {
        if (!user_id || !product_id) {
            return res.status(400).json({ error: "Données manquantes" });
        }

        await db.promise().query(
            "INSERT INTO favorites (user_id, product_id) VALUES (?, ?)",
            [user_id, product_id]
        );
        res.status(201).json({ message: "Produit ajouté aux favoris !" });
    } catch (error) {
        console.error("❌ Erreur gestion des favoris :", error.message);
        res.status(500).json({ error: "Erreur lors de l'ajout aux favoris." });
    }
});

// Récupérer les favoris d'un utilisateur
router.get("/:user_id", async (req, res) => {
    const { user_id } = req.params;

    try {
        const [favorites] = await db.promise().query(
            `SELECT products.* FROM favorites 
             JOIN products ON favorites.product_id = products.id 
             WHERE favorites.user_id = ?`,
            [user_id]
        );
        res.json(favorites);
    } catch (error) {
        console.error("❌ Erreur lors de la récupération des favoris :", error);
        res.status(500).json({ error: "Erreur lors de la récupération des favoris." });
    }
});

// Supprimer un produit des favoris
router.delete("/remove", async (req, res) => {
    const { user_id, product_id } = req.body;

    try {
        const [result] = await db.promise().query(
            "DELETE FROM favorites WHERE user_id = ? AND product_id = ?",
            [user_id, product_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Produit non trouvé dans les favoris." });
        }

        res.json({ message: "Produit retiré des favoris !" });
    } catch (error) {
        console.error("❌ Erreur lors de la suppression des favoris :", error);
        res.status(500).json({ error: "Erreur lors de la suppression du favori." });
    }
});


module.exports = router;
