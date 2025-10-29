const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const db = require("../config/db");

const router = express.Router();

console.log("🔄 Chargement du fichier users.js...");

const upload = multer({
    storage: multer.diskStorage({
        destination: "./public/uploads/",
        filename: (req, file, cb) => {
            cb(null, Date.now() + path.extname(file.originalname));
        },
    }),
});

 
router.post("/register", async (req, res) => {
    console.log("📩 Requête reçue :", req.body);

    const { nom, email, telephone, mot_de_passe, role } = req.body;

    if (!nom || !email || !telephone || !mot_de_passe) {
        console.log("❌ Champ(s) manquant(s)");
        return res.status(400).json({ error: "Tous les champs sont obligatoires." });
    }

    try {
        const [results] = await db.promise().query("SELECT * FROM users WHERE email = ?", [email]);

        if (results.length > 0) {
            return res.status(400).json({ error: "Cet email est déjà utilisé." });
        }

        const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
        const userRole = role === "admin" ? "admin" : "client";  // Vérification du rôle

        await db.promise().query(
            "INSERT INTO users (nom, email, telephone, mot_de_passe, role, is_connected, is_blocked) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [nom, email, telephone, hashedPassword, userRole, 0, 0]
        );

        console.log("✅ Inscription réussie pour :", email);
        res.status(201).json({ message: "Inscription réussie !" });

    } catch (error) {
        console.error("❌ Erreur serveur :", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});


router.post("/login", async (req, res) => {
    const { email, mot_de_passe } = req.body;

    try {
        const [results] = await db.promise().query("SELECT * FROM users WHERE email = ?", [email]);

        if (results.length === 0) {
            return res.status(400).json({ error: "Email incorrect." });
        }

        const user = results[0];

        // ✅ Vérifier si l'utilisateur est bloqué
        if (user.is_blocked) {
            return res.status(403).json({ error: "⚠️ Votre compte est bloqué. Veuillez contacter l'administration." });
        }

        const isMatch = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
        if (!isMatch) {
            return res.status(400).json({ error: "Mot de passe incorrect." });
        }

        // ✅ Mettre à jour l'état `is_connected` à 1
        await db.promise().query("UPDATE users SET is_connected = 1 WHERE id = ?", [user.id]);

        res.status(200).json({
            message: "Connexion réussie !",
            user: { id: user.id, nom: user.nom, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error("❌ Erreur serveur :", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});




router.post("/logout/:id", async (req, res) => {
    const { id } = req.params;

    try {
        await db.promise().query("UPDATE users SET is_connected = 0 WHERE id = ?", [id]);
        res.status(200).json({ message: "Utilisateur déconnecté avec succès !" });

    } catch (error) {
        console.error("❌ Erreur serveur :", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

router.get("/all", async (req, res) => {
    try {
        const [users] = await db.promise().query(
            "SELECT id, nom, email, telephone, role, is_connected, is_blocked FROM users"
        );
        console.log("🔄 Liste des utilisateurs récupérée :", users); // ✅ Debug
        res.status(200).json(users);
    } catch (error) {
        console.error("❌ Erreur serveur :", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

router.get("/connected", async (req, res) => {
    try {
        const [users] = await db.promise().query(
            "SELECT id, nom, email, role FROM users WHERE is_connected = 1"
        );
        res.status(200).json(users);
    } catch (error) {
        console.error("❌ Erreur serveur :", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});
    
router.get("/", (req, res) => {
    db.query("SELECT * FROM products", (err, results) => {
        if (err) {
            console.error("❌ Erreur récupération produits :", err);
            return res.status(500).json({ error: "Erreur serveur lors de la récupération des produits." });
        }
        res.status(200).json(results);
    });
});
router.put("/:id", upload.single("image"), async (req, res) => {
    const { id } = req.params;
    const { nom, prix } = req.body;
    let image_url = req.file ? `/uploads/${req.file.filename}` : null;

    try {
        if (image_url) {
            await db.promise().query("UPDATE products SET nom=?, prix=?, image_url=? WHERE id=?", [nom, prix, image_url, id]);
        } else {
            await db.promise().query("UPDATE products SET nom=?, prix=? WHERE id=?", [nom, prix, id]);
        }
        res.status(200).json({ message: "Produit mis à jour !" });
    } catch (error) {
        console.error("❌ Erreur mise à jour produit :", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});


router.put("/block/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await db.promise().query(
            "UPDATE users SET is_blocked = 1 WHERE id = ?", [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Utilisateur non trouvé." });
        }

        console.log(`✅ Utilisateur ${id} bloqué avec succès`);
        res.status(200).json({ message: "Utilisateur bloqué avec succès !" });
    } catch (error) {
        console.error("❌ Erreur serveur :", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

router.put("/unblock/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await db.promise().query(
            "UPDATE users SET is_blocked = 0 WHERE id = ?", [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Utilisateur non trouvé." });
        }

        console.log(`✅ Utilisateur ${id} débloqué avec succès`);
        res.status(200).json({ message: "Utilisateur débloqué avec succès !" });
    } catch (error) {
        console.error("❌ Erreur serveur :", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});


module.exports = router;
