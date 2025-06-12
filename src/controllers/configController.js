const { PROMPT_CONFIG, DEFAULT_CONFIG } = require("../utils/constants");
const logger = require("../config/logger");

// Récupérer la configuration IA actuelle
function getPromptConfig(req, res) {
	res.json(PROMPT_CONFIG);
}

// Mettre à jour la configuration IA
function updatePromptConfig(req, res) {
	try {
		const updates = req.body;

		// Valider les champs requis
		if (updates.result_count && (updates.result_count < 1 || updates.result_count > 50)) {
			return res.status(400).json({
				error: "result_count must be between 1 and 50",
			});
		}

		// Mettre à jour la configuration
		Object.assign(PROMPT_CONFIG, updates);

		res.json({
			status: "success",
			message: "Configuration IA mise à jour avec succès",
			config: PROMPT_CONFIG,
		});
	} catch (err) {
		logger.error("Config update failed", {
			error: err.message,
			updateFields: Object.keys(req.body || {}),
		});
		res.status(500).json({
			error: "Failed to update configuration",
			details: err.message,
		});
	}
}

// Réinitialiser la configuration IA aux valeurs par défaut
function resetPromptConfig(req, res) {
	try {
		Object.assign(PROMPT_CONFIG, DEFAULT_CONFIG);

		res.json({
			status: "success",
			message: "Configuration IA réinitialisée aux valeurs par défaut",
			config: PROMPT_CONFIG,
		});
	} catch (err) {
		logger.error("Config reset failed", {
			error: err.message,
		});
		res.status(500).json({
			error: "Failed to reset configuration",
			details: err.message,
		});
	}
}

module.exports = {
	getPromptConfig,
	updatePromptConfig,
	resetPromptConfig,
};
