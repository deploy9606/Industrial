const logger = require("../config/logger");
const { callGemini } = require("./aiApiService");

/**
 * Estime le building rate (taux par sq ft) basé sur l'adresse de la propriété
 * @param {string} propertyAddress - L'adresse de la propriété
 * @param {string} propertyType - Le type de propriété (warehouse, manufacturing, etc.)
 * @param {string} buildingSize - La taille du bâtiment en sq ft
 * @returns {Promise<Object>} - Estimation du building rate avec détails
 */
async function estimateBuildingRate(
	propertyAddress,
	propertyType = "",
	buildingSize = ""
) {
	try {
		const prompt = `You are an expert in industrial real estate valuation. Analyze this property and provide an estimation of the annual lease rate per square foot.

PROPERTY TO ANALYZE:
- Address: ${propertyAddress}
- Property Type: ${propertyType || "Not specified"}
- Building Size: ${buildingSize || "Not specified"} sq ft

ANALYSIS CONTEXT:
This property will be evaluated for an industrial real estate investment. The lease rate is crucial for calculating NOI (Net Operating Income) and cap rate.

ANALYSIS INSTRUCTIONS:
1. Analyze the local industrial real estate market in this area
2. Consider the following factors:
   - Geographic location and logistics access
   - Dominant industry type in the region
   - Local vacancy rate
   - Market demand for this property type
   - Proximity to highways, ports, airports
   - Zoning and local regulations
   - Recent comparables in the area

REQUIRED RESPONSE (strict JSON format):
{
  "estimatedRate": number, // Estimated rate in USD per sq ft per year
  "confidence": "high" | "medium" | "low", // Confidence level of the estimation
}

CONSTRAINTS:
- Rate must be in USD per sq ft per year
- Confidence can be: "high", "medium", "low"
- Base your analysis on known real market data
- If data is insufficient, indicate "low" confidence
- Provide only the JSON, no additional text`;

		const response = await callGemini(prompt, {
			maxOutputTokens: 2000,
			temperature: 0.3,
			model: "gemini-2.0-flash",
		});

		// Extraire le JSON de la réponse
		const jsonMatch = response.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error("No valid JSON found in Gemini response");
		}

		const rateEstimation = JSON.parse(jsonMatch[0]);

		// Validation de base des données retournées
		if (!rateEstimation.estimatedRate || !rateEstimation.confidence) {
			throw new Error("Invalid rate estimation format");
		}

		logger.info("Building rate estimation completed", {
			estimatedRate: rateEstimation.estimatedRate,
			confidence: rateEstimation.confidence,
		});

		return rateEstimation;
	} catch (error) {
		logger.error("Failed to estimate building rate", {
			error: error.message,
			propertyAddress,
		});

		// Return a default estimation in case of error
		return {
			estimatedRate: 7.0,
			confidence: "low",
			error: true,
		};
	}
}

module.exports = {
	estimateBuildingRate,
};
