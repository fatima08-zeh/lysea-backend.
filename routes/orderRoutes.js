const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.post("/create", async (req, res) => {
    const { userId, products, totalPrice } = req.body;
    try {
        const [orderResult] = await db.execute(
            "INSERT INTO orders (user_id, total_price) VALUES (?, ?)",
            [userId, totalPrice]
        );

        const orderId = orderResult.insertId;

        for (const product of products) {
            await db.execute(
                "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
                [orderId, product.productId, product.quantity, product.price]
            );
        }

        await db.execute("DELETE FROM cart WHERE user_id = ?", [userId]);

        res.status(201).json({ message: "Commande validée avec succès", orderId });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
});

router.get("/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
        const [orders] = await db.execute("SELECT * FROM orders WHERE user_id = ?", [userId]);
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
});

module.exports = router;
