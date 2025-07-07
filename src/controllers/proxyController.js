const axios = require("axios");
const logger = require("../config/logger");
const res = require("express/lib/response");



// Fonction utilitaire pour appel direct à OpenAI (sans req/res)
async function callOpenAIDirect(requestBody) {
	try {
		const response = await axios.post(
			"https://api.openai.com/v1/responses",
			requestBody,
			{
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
				},
				timeout: 1200000, // 120 seconds timeout
			}
		);
		let data= response.data;
				if (data.status === "in_progress") {
			const responseId = data.id;

			let maxAttempts = 10;
			let attempt = 0;
			const delay = ms => new Promise(res => setTimeout(res, ms));

			while (attempt < maxAttempts) {
				await delay(1000); // wait 1s
				attempt++;

				const pollResponse = await axios.get(
					`https://api.openai.com/v1/responses/${responseId}`,
					{
						headers: {
							Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
						},
					}
				);

				data = pollResponse.data;

				if (data.status === "completed") break;
				if (data.status === "failed" || data.error) {
					throw new Error(`Response failed: ${JSON.stringify(data.error)}`);
				}
			}

			if (data.status !== "completed") {
				throw new Error("Polling timed out before completion");
			}
		}
		
		return response.data;
	} catch (error) {
		logger.error("OpenAI direct call error", {
			error: error.message,
			stack: error.stack,
			data: error.response?.data,
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

// Direct call to Claude (Anthropic)
async function callClaudeDirect(requestBody) {
	try {
		const response = await axios.post(
			"https://api.anthropic.com/v1/messages",
			requestBody,
			{
				headers: {
					"Content-Type": "application/json",
					"X-API-Key": process.env.ANTHROPIC_API_KEY,
					"anthropic-version": "2023-06-01",
				},
				timeout: 120000, // 120 seconds timeout
			}
		);
		return response.data;
	} catch (error) {
		logger.error("Claude direct call error", {
			error: error.message,
			stack: error.stack,
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
// Proxy for Claude
async function claude(req, res) {
	try {
		const response = await callClaudeDirect(req.body);
		res.json(response);
	} catch (error) {
		logger.error("Claude proxy error", {
			error: error.message,
			stack: error.stack,
		});
		res.status(500).json({
			error: "Failed to communicate with Claude",
			details: error.response?.data || error.message,
		});
	}
}


module.exports = {
	openai,
	gemini,
	claude,
	callOpenAIDirect,
	callGeminiDirect,
	callClaudeDirect,
};
