const express = require("express");
const multer = require("multer");
const path = require("path");
const db = require("../config/db");

const router = express.Router();

const storage = multer.diskStorage({
    destination: "./public/uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({
    storage: multer.diskStorage({
        destination: "./public/uploads/",
        filename: (req, file, cb) => {
            console.log("📸 Fichier reçu :", file.originalname);
            cb(null, Date.now() + path.extname(file.originalname));
        },
    }),
});

router.post("/add", upload.single("image"), async (req, res) => {
    console.log("📥 Requête reçue :", req.body); // ✅ Debug

    const { nom, prix, description, brand } = req.body;  // ✅ Assure-toi que c'est `brand`
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    if (!nom || !prix || !description || !brand || !image_url) {
        return res.status(400).json({ error: "Tous les champs sont obligatoires." });
    }

    try {
        await db.promise().query(
            "INSERT INTO products (nom, prix, description, brand, image_url) VALUES (?, ?, ?, ?, ?)", 
            [nom, prix, description, brand, image_url]
        );
        res.status(201).json({ message: "✅ Produit ajouté avec succès !" });
    } catch (error) {
        console.error("❌ Erreur serveur :", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});
router.get("/", async (req, res) => {
    try {
        const [products] = await db.promise().query("SELECT id, nom, description, prix, brand, image_url FROM products");
        console.log("✅ Produits récupérés :", products);  // 🔥 Vérification des résultats
        res.status(200).json(products);
    } catch (error) {
        console.error("❌ Erreur lors de la récupération des produits :", error.message);
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
});


router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    try {
        // Vérifie si le produit existe
        const [rows] = await db.promise().query("SELECT * FROM products WHERE id = ?", [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Produit non trouvé." });
        }

        // Supprime le produit
        await db.promise().query("DELETE FROM products WHERE id = ?", [id]);
        res.status(200).json({ message: "✅ Produit supprimé avec succès !" });

    } catch (error) {
        console.error("❌ Erreur serveur :", error);
        res.status(500).json({ error: "Erreur serveur.", details: error.message });
    }
});

router.put("/:id", upload.single("image"), async (req, res) => {
    const { id } = req.params;
    const { nom, prix, description, brand } = req.body; // ✅ Assure-toi que c'est bien `brand`
    let image_url = req.file ? `/uploads/${req.file.filename}` : null;

    console.log("📥 Requête reçue pour modification :", req.body); // ✅ Debug
    console.log("🖼️ Fichier image :", req.file ? req.file.filename : "Aucune image modifiée");

    try {
        const [[product]] = await db.promise().query("SELECT * FROM products WHERE id = ?", [id]);

        if (!product) {
            return res.status(404).json({ error: "Produit non trouvé." });
        }

        if (!image_url) {
            image_url = product.image_url;
        }

        await db.promise().query(
            "UPDATE products SET nom = ?, prix = ?, description = ?, brand = ?, image_url = ? WHERE id = ?",
            [nom, prix, description, brand, image_url, id]  // ✅ Mise à jour correcte
        );

        res.json({ message: "✅ Produit mis à jour avec succès !" });
    } catch (error) {
        console.error("❌ Erreur mise à jour :", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});


router.get("/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const [[product]] = await db
            .promise()
            .query("SELECT * FROM products WHERE id = ?", [id]);

        if (!product) {
            return res.status(404).json({ error: "Produit non trouvé." });
        }

        // ✅ Vérifier et attribuer une valeur par défaut si brand est NULL
        if (!product.brand) {
            product.brand = "Autre";
        }

        res.json(product);
    } catch (error) {
        console.error("❌ Erreur serveur :", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

  
router.get("/brand/:brand", async (req, res) => {
    const brand = decodeURIComponent(req.params.brand); // ✅ Debug
  
    console.log("📢 Marque demandée :", brand); // ✅ Vérifier la valeur
  
    try {
      const [products] = await db.promise().query(
        "SELECT * FROM products WHERE brand = ?",
        [brand]
      );
  
      console.log("📢 Produits trouvés :", products); // ✅ Vérifier les résultats
  
      res.status(200).json(products);
    } catch (error) {
      console.error("❌ Erreur serveur :", error);
      res.status(500).json({ error: "Erreur serveur." });
    }
  });
  

router.get("/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        const [cartItems] = await db.promise().query("SELECT * FROM cart WHERE user_id = ?", [userId]);

        console.log("📥 Contenu du panier :", cartItems); // 🔍 Debug

        if (!cartItems || cartItems.length === 0) {
            return res.json([]); // ✅ Retourne un tableau vide au lieu d'une erreur
        }

        res.json(cartItems);
    } catch (error) {
        console.error("❌ Erreur chargement panier :", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
});


module.exports = router;
