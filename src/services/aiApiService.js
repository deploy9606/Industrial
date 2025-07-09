const logger = require("../config/logger");
const { callOpenAIDirect, callGeminiDirect, callClaudeDirect } = require("../controllers/proxyController");

/**
 * Appel à OpenAI via le proxyController
 * @param {string} prompt - Le prompt à envoyer à OpenAI
 * @param {object} options - Options pour la requête
 * @returns {Promise<string>} - Réponse de OpenAI
 */
async function callOpenAI(prompt, options = {}) {
	try {
		const { model = "o3-pro", maxTokens = 1500, temperature = 0.3 } = options;
		console.log("options", options);
		logger.info("Calling OpenAI API via proxyController", {
			promptLength: prompt.length,
			model,
		});

		const requestBody = {
			model,
			input: [

				{
					role: "user",
					content: prompt,
				},
			],
			
			


		};

		const response = await callOpenAIDirect(requestBody);
		

		const result = response?.output?.[1]?.content?.[0]?.text;

		

		if (!result) {
			throw new Error("No content received from OpenAI" );
		}
		logger.info("OPENAID RESPONSE ", response);
		logger.info("OpenAI API call successful", {
			responseLength: result.length,
		});

		return result;
	} catch (error) {
		logger.error("OpenAI API call failed", {
			error: error.message,
			data: error.data
		});

		throw error;
	}
}

/**
 * Appel à Gemini via le proxyController
 * @param {string} prompt - Le prompt à envoyer à Gemini
 * @param {object} options - Options pour la requête
 * @returns {Promise<string>} - Réponse de Gemini
 */
async function callGemini(prompt, options = {}) {
	try {
		const {
			maxOutputTokens = 1000,
			temperature = 0.3,
			model = "gemini-2.5-flash-preview-05-20",
		} = options;

		logger.info("Calling Gemini API via proxyController", {
			promptLength: prompt.length,
			model,
		});

		const requestBody = {
			contents: [
				{
					parts: [
						{
							text: prompt,
						},
					],
				},
			],
			generationConfig: {
				maxOutputTokens,
				temperature,
			},
			model,
		};

		const response = await callGeminiDirect(requestBody);

		const result = response?.candidates?.[0]?.content?.parts?.[0]?.text;

		if (!result) {
			// Vérifier si l'erreur est liée aux tokens et si on n'utilise pas déjà gemini-2.0-flash
			const finishReason = response?.candidates?.[0]?.finishReason;
			if (finishReason === "MAX_TOKENS" && model !== "gemini-2.0-flash") {
				logger.warn(
					"MAX_TOKENS reached, retrying with gemini-2.0-flash (previous model : " +
						model +
						")"
				);

				// Relancer avec gemini-2.0-flash
				return await callGemini(prompt, { ...options, model: "gemini-2.0-flash" });
			}

			throw new Error("No content received from Gemini");
		}

		logger.info("Gemini API call successful", {
			responseLength: result.length,
			model,
		});

		return result;
	} catch (error) {
		// Vérifier si l'erreur est liée aux tokens et si on n'utilise pas déjà gemini-2.0-flash
		const finishReason = error.response?.data?.candidates?.[0]?.finishReason;
		const currentModel = options.model || "gemini-2.5-flash-preview-05-20";

		if (finishReason === "MAX_TOKENS" && currentModel !== "gemini-2.0-flash") {
			logger.warn("MAX_TOKENS error, retrying with gemini-2.0-flash", {
				originalModel: currentModel,
				error: error.message,
			});

			// Relancer avec gemini-2.0-flash
			return await callGemini(prompt, { ...options, model: "gemini-2.0-flash" });
		}

		logger.error("Gemini API call failed", {
			error: error.message,
			model: currentModel,
		});

		throw error;
	}
}
/**
 * Call Claude via proxyController
 */
async function callClaude(prompt, options = {}) {
	try {
		const { model = "claude-opus-4-20250514", maxTokens = 9000, temperature = 0.3 } = options;

		logger.info("Calling Claude API via proxyController", {
			promptLength: prompt.length,
			model,
		});
		console.log("Prompt sent to Claude:", prompt);

		const requestBody = {
			model,
			max_tokens: maxTokens,
			system:"You are a JSON API. You must respond only with valid JSON. Never include explanatory text outside the JSON structure.",
			temperature,
			messages: [
				{
					role: "user",
					content: prompt,
				},
			],
			
			"tools": [{
            "type": "web_search_20250305",
            "name": "web_search",
            "max_uses": 5
        }]
		};

		const response = await callClaudeDirect(requestBody);
		const result = response?.content?.[0]?.text || response?.content;

		if (!result) {
			throw new Error("No content received from Claude");
		}

		logger.info("Claude API call successful", {
			responseLength: result.length,
			model,
		});

		return result;
	} catch (error) {
		logger.error("Claude API call failed", {
			error: error.message,
			data: error.response?.data || {},
		});
		throw error;
	}
}


module.exports = {
	callOpenAI,
	callGemini,
	callClaude
};
