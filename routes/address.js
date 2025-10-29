const express = require("express");
const router = express.Router();
const db = require("../config/db");


router.post("/save", async (req, res) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:3000");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");

    const { user_id, first_name, last_name, phone, address, extra_info, postal_code, is_default } = req.body;

    try {
        await db.execute(
            "INSERT INTO addresses (user_id, first_name, last_name, phone, address, extra_info, postal_code, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [user_id, first_name, last_name, phone, address, extra_info, postal_code, is_default]
        );
        res.status(201).json({ message: "Adresse enregistrée avec succès" });
    } catch (error) {
        console.error("❌ Erreur lors de l'enregistrement de l'adresse :", error);
        res.status(500).json({ error: "Erreur lors de l'enregistrement de l'adresse" });
    }
});
// Route pour récupérer les adresses d'un utilisateur
router.get("/:user_id", async (req, res) => {
    try {
        const { user_id } = req.params;

        const sql = `SELECT * FROM addresses WHERE user_id = ?`;
        const [rows] = await db.promise().query(sql, [user_id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Aucune adresse trouvée." });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error("❌ Erreur lors de la récupération de l'adresse :", error);
        res.status(500).json({ error: "Erreur lors de la récupération de l'adresse." });
    }
});
// Route pour mettre à jour l'adresse existante
router.put("/:user_id", async (req, res) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:3000");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");

    const { user_id } = req.params;
    const { first_name, last_name, phone, address, extra_info, postal_code, is_default } = req.body;

    try {
        const [result] = await db.promise().query(
            "UPDATE addresses SET first_name = ?, last_name = ?, phone = ?, address = ?, extra_info = ?, postal_code = ?, is_default = ? WHERE user_id = ?",
            [first_name, last_name, phone, address, extra_info, postal_code, is_default, user_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Adresse non trouvée pour cet utilisateur." });
        }

        res.status(200).json({ message: "Adresse mise à jour avec succès" });
    } catch (error) {
        console.error("❌ Erreur lors de la mise à jour de l'adresse :", error);
        res.status(500).json({ error: "Erreur lors de la mise à jour de l'adresse" });
    }
});


module.exports = router;
