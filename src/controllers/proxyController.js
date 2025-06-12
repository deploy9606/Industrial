const axios = require("axios");
const logger = require("../config/logger");

// Fonction utilitaire pour appel direct à OpenAI (sans req/res)
async function callOpenAIDirect(requestBody) {
	try {
		const response = await axios.post(
			"https://api.openai.com/v1/chat/completions",
			requestBody,
			{
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
				},
				timeout: 120000, // 120 seconds timeout
			}
		);
		return response.data;
	} catch (error) {
		logger.error("OpenAI direct call error", {
			error: error.message,
			stack: error.stack,
		});
		throw error;
	}
}

// Fonction utilitaire pour appel direct à Gemini (sans req/res)
async function callGeminiDirect(requestBody) {
	try {
		// Extraire le modèle de la requête ou utiliser un modèle par défaut
		const model = requestBody.model || "gemini-2.5-flash-preview-05-20";

		// Créer une copie du body sans le champ model (car il ne doit pas être dans le body pour Gemini)
		const { model: _, ...bodyWithoutModel } = requestBody;

		const response = await axios.post(
			`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
			bodyWithoutModel,
			{
				headers: {
					"Content-Type": "application/json",
				},
				timeout: 120000, // 120 seconds timeout
			}
		);
		return response.data;
	} catch (error) {
		logger.error("Gemini direct call error", {
			error: error.message,
			stack: error.stack,
			model: requestBody.model,
		});
		throw error;
	}
}

// Proxy pour OpenAI
async function openai(req, res) {
	try {
		const response = await callOpenAIDirect(req.body);
		res.json(response);
	} catch (error) {
		logger.error("OpenAI proxy error", {
			error: error.message,
			stack: error.stack,
		});
		res.status(500).json({
			error: "Failed to communicate with OpenAI",
			details: error.response?.data || error.message,
		});
	}
}

// Proxy pour Gemini
async function gemini(req, res) {
	try {
		const response = await callGeminiDirect(req.body);
		res.json(response);
	} catch (error) {
		logger.error("Gemini proxy error", {
			error: error.message,
			stack: error.stack,
			model: req.body.model,
		});
		res.status(500).json({
			error: "Failed to communicate with Gemini",
			details: error.response?.data || error.message,
		});
	}
}

module.exports = {
	openai,
	gemini,
	callOpenAIDirect,
	callGeminiDirect,
};
