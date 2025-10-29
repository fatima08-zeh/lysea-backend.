const mysql = require("mysql2"); // ✅ Charger le module MySQL2
require("dotenv").config();

const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "cosmetiquequebec",
    port: 3307, // Ajoutez ce champ si ce n'est pas déjà fait
});


db.getConnection((err, connection) => {
    if (err) {
        console.error("❌ Erreur de connexion à MySQL :", err);
        return;
    }
    console.log("✅ Connecté à la base de données MySQL !");
    connection.release(); 
});

module.exports = db;
