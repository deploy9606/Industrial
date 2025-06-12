const express = require("express");
const {
	getPromptConfig,
	updatePromptConfig,
	resetPromptConfig,
} = require("../controllers/configController");

const router = express.Router();

// Récupérer la configuration IA actuelle
router.get("/prompt", getPromptConfig);

// Mettre à jour la configuration IA
router.post("/prompt", updatePromptConfig);

// Réinitialiser la configuration IA aux valeurs par défaut
router.post("/prompt/reset", resetPromptConfig);

module.exports = router;
