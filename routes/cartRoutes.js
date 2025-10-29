const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Ajouter un produit au panier ou incrémenter la quantité
router.post("/add", async (req, res) => {
    const { user_id, product_id, quantity } = req.body;

    try {
        // Vérifier si le produit existe déjà dans le panier
        const [existingProduct] = await db.promise().query(
            "SELECT * FROM cart WHERE user_id = ? AND product_id = ?",
            [user_id, product_id]
        );

        if (existingProduct.length > 0) {
            // Mettre à jour la quantité si le produit existe déjà
            await db.promise().query(
                "UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?",
                [quantity, user_id, product_id]
            );
        } else {
            // Ajouter le produit si ce n'est pas déjà dans le panier
            await db.promise().query(
                "INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)",
                [user_id, product_id, quantity]
            );
        }

        res.status(201).json({ message: "Produit ajouté au panier !" });
    } catch (error) {
        console.error("❌ Erreur ajout panier :", error.message);
        res.status(500).json({ error: "Erreur lors de l'ajout au panier" });
    }
});

// Récupérer le panier d'un utilisateur
router.get("/:user_id", async (req, res) => {
    const { user_id } = req.params;

    try {
        const [cart] = await db.promise().query(
            `SELECT cart.product_id, cart.quantity, products.nom, products.prix, products.image_url 
             FROM cart 
             JOIN products ON cart.product_id = products.id 
             WHERE cart.user_id = ?`,
            [user_id]
        );

        res.json(cart);
    } catch (error) {
        console.error("❌ Erreur récupération panier :", error.message);
        res.status(500).json({ error: "Erreur lors de la récupération du panier" });
    }
});

// Retirer un produit du panier
router.delete("/remove/:user_id/:product_id", async (req, res) => {
    const { user_id, product_id } = req.params;

    try {
        await db.promise().query(
            "DELETE FROM cart WHERE user_id = ? AND product_id = ?",
            [user_id, product_id]
        );
        res.status(200).json({ message: "Produit retiré du panier !" });
    } catch (error) {
        console.error("❌ Erreur suppression panier :", error.message);
        res.status(500).json({ error: "Erreur lors de la suppression du produit" });
    }
});

// Décrémenter la quantité d'un produit
router.post("/decrease", async (req, res) => {
    const { user_id, product_id } = req.body;

    try {
        const [product] = await db.promise().query(
            "SELECT quantity FROM cart WHERE user_id = ? AND product_id = ?",
            [user_id, product_id]
        );

        if (product.length > 0 && product[0].quantity > 1) {
            await db.promise().query(
                "UPDATE cart SET quantity = quantity - 1 WHERE user_id = ? AND product_id = ?",
                [user_id, product_id]
            );
            res.status(200).json({ message: "Quantité diminuée !" });
        } else {
            await db.promise().query(
                "DELETE FROM cart WHERE user_id = ? AND product_id = ?",
                [user_id, product_id]
            );
            res.status(200).json({ message: "Produit supprimé !" });
        }
    } catch (error) {
        console.error("❌ Erreur décrémentation panier :", error.message);
        res.status(500).json({ error: "Erreur lors de la mise à jour de la quantité" });
    }
});

// ✅ Vider tout le panier d’un utilisateur
router.delete("/clear/:user_id", async (req, res) => {
    const { user_id } = req.params;

    try {
        await db.promise().query(
            "DELETE FROM cart WHERE user_id = ?",
            [user_id]
        );
        res.status(200).json({ message: "Panier vidé avec succès." });
    } catch (error) {
        console.error("❌ Erreur lors du vidage du panier :", error.message);
        res.status(500).json({ error: "Erreur lors du vidage du panier" });
    }
});



module.exports = router;
