const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Ajouter un produit au panier
router.post("/add", (req, res) => {
    const { user_id, product_id, quantity } = req.body;

    db.query("SELECT * FROM cart WHERE user_id = ? AND product_id = ?", [user_id, product_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length > 0) {
            db.query("UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?", 
            [quantity, user_id, product_id], (updateErr) => {
                if (updateErr) return res.status(500).json({ error: updateErr.message });
                res.json({ success: true, message: "Quantité mise à jour !" });
            });
        } else {
            db.query("INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)", 
            [user_id, product_id, quantity], (insertErr) => {
                if (insertErr) return res.status(500).json({ error: insertErr.message });
                res.json({ success: true, message: "Produit ajouté au panier !" });
            });
        }
    });
});

// Supprimer un produit du panier
router.delete("/remove/:userId/:productId", (req, res) => {
    const { userId, productId } = req.params;
    db.query("DELETE FROM cart WHERE user_id = ? AND product_id = ?", [userId, productId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Produit retiré du panier !" });
    });
});

// Vider le panier
router.delete("/clear/:user_id", async (req, res) => {
    const { user_id } = req.params;

    try {
        await db.promise().query(
            "DELETE FROM cart WHERE user_id = ?",
            [user_id]
        );
        res.status(200).json({ message: "Panier vidé avec succès." });
    } catch (error) {
        console.error("❌ Erreur vidage panier :", error.message);
        res.status(500).json({ error: "Erreur lors du vidage du panier." });
    }
});


// Diminuer la quantité
router.put("/decrease/:userId/:productId", (req, res) => {
    const { userId, productId } = req.params;
    db.query("UPDATE cart SET quantity = quantity - 1 WHERE user_id = ? AND product_id = ? AND quantity > 1", 
    [userId, productId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Quantité diminuée !" });
    });
});

// Récupérer le panier
router.get("/:userId", (req, res) => {
    const { userId } = req.params;
    db.query("SELECT c.product_id, p.nom, p.prix, p.image_url, c.quantity FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?", 
    [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

module.exports = router;
