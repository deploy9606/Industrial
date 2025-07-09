const logger = require("../config/logger");
const { callGemini, callOpenAI } = require("./aiApiService");

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
		const prompt = `
You are an expert in industrial site locations, investments, and leasing. Determine the market rate for leases for this type of industrial property, 
considering the building's square footage and the rest of the land used for industrial outside storage, as well as lease rates per acre. 
The output should resemble all of the information below. Very important NOT to invest or hallucinate data. If you are unaware of the data, 
then say you do not have enough data to provide an accurate response. Do not sugarcoat the results. If the results are bad, then they are bad. 
If the results are good, then they are good. This analysis is used to effectively evaluate whether to purchase the property for our company or another 
investment firm. For every numeric claim (vacancy, cap rate, lease rate), cite the source in parentheses with publication and date. Please browse the web in 
real time to research and acquire the latest market information and metrics. Flag any figures and data older than Q2 2023.Provide Market Lease Rate in Sq. Ft per Year for the Industrial Buildings by 
displaying Average Market Rate, Lower End, and higher End. This is an example:

Average Market Rate: The current market for industrial and warehouse space in Memphis ranges from $4.00 to $6.00 per square foot per year (NNN) for standard bulk space.
Lower End ($2.60 - $4.00/sf/yr): This applies to older buildings with lower clear heights, fewer amenities, and less efficient layouts.
Higher End ($6.00 - $8.00+/sf/yr): This is typically for newer construction, facilities with specialized features like temperature control, or smaller, in-demand units.


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
  "estimatedLowerEnd": number, // Lower end of the rate range
  "estimatedUpperEnd": number, // Higher end of the rate range
  "confidence": "high" | "medium" | "low", // Confidence level of the estimation
}

CONSTRAINTS:
- Rate must be in USD per sq ft per year
- Confidence can be: "high", "medium", "low"
- Base your analysis on known real market data
- If data is insufficient, indicate "low" confidence
- Provide only the JSON, no additional text`;

		const responseGemini = await callGemini(prompt, {
			maxOutputTokens: 10000,
			temperature: 0.3,
			
		});

		

		// Extraire le JSON de la réponse
		const jsonMatch = responseGemini.match(/\{[\s\S]*\}/);
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
			estimatedLowerEnd: rateEstimation.estimatedLowerEnd,
			estimatedUpperEnd: rateEstimation.estimatedUpperEnd,
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
/**
 * Estime le building rate (taux par sq ft) basé sur l'adresse de la propriété
 * @param {string} propertyAddress - L'adresse de la propriété
 * @param {string} propertyType - Le type de propriété (warehouse, manufacturing, etc.)
 * @param {string} buildingSize - La taille du bâtiment en sq ft
 * @returns {Promise<Object>} - Estimation du building rate avec détails
 */
async function estimateBuildingRateOpenAI(
	propertyAddress,
	propertyType = "",
	buildingSize = ""
) {
	try {
		const prompt = `
You are an expert in industrial site locations, investments, and leasing. Determine the market rate for leases for this type of industrial property, 
considering the building's square footage and the rest of the land used for industrial outside storage, as well as lease rates per acre. 
The output should resemble all of the information below. Very important NOT to invest or hallucinate data. If you are unaware of the data, 
then say you do not have enough data to provide an accurate response. Do not sugarcoat the results. If the results are bad, then they are bad. 
If the results are good, then they are good. This analysis is used to effectively evaluate whether to purchase the property for our company or another 
investment firm. For every numeric claim (vacancy, cap rate, lease rate), cite the source in parentheses with publication and date. Please browse the web in 
real time to research and acquire the latest market information and metrics. Flag any figures and data older than Q2 2023.Provide Market Lease Rate in Sq. Ft per Year for the Industrial Buildings by 
displaying Average Market Rate, Lower End, and higher End. This is an example:

Average Market Rate: The current market for industrial and warehouse space in Memphis ranges from $4.00 to $6.00 per square foot per year (NNN) for standard bulk space.
Lower End ($2.60 - $4.00/sf/yr): This applies to older buildings with lower clear heights, fewer amenities, and less efficient layouts.
Higher End ($6.00 - $8.00+/sf/yr): This is typically for newer construction, facilities with specialized features like temperature control, or smaller, in-demand units.


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
  "estimatedLowerEnd": number, // Lower end of the rate range
  "estimatedUpperEnd": number, // Higher end of the rate range
  "confidence": "high" | "medium" | "low", // Confidence level of the estimation
}

CONSTRAINTS:
- Rate must be in USD per sq ft per year
- Confidence can be: "high", "medium", "low"
- Base your analysis on known real market data
- If data is insufficient, indicate "low" confidence
- Provide only the JSON, no additional text`;

		const responseOpenAI = await callOpenAI(prompt, {
			maxTokens: 2000, //figure out the max tokens based on your needs
			temperature: 0.3,
			
		});

		

		// Extraire le JSON de la réponse
		const jsonMatch = responseOpenAI.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error("No valid JSON found in OpenAI o3 response");
		}
		console.log("RESPNSE FOR BUILD ", responseOpenAI);

		const rateEstimation = JSON.parse(jsonMatch[0]);

		// Validation de base des données retournées
		if (!rateEstimation.estimatedRate || !rateEstimation.confidence) {
			throw new Error("Invalid rate estimation format");
		}

		logger.info("Building rate openAI estimation completed", {
			estimatedRate: rateEstimation.estimatedRate,
			confidence: rateEstimation.confidence,
			estimatedLowerEnd: rateEstimation.estimatedLowerEnd,
			estimatedUpperEnd: rateEstimation.estimatedUpperEnd,
		});

		return rateEstimation;
	} catch (error) {
		logger.error("Failed to estimate openAI building rate", {
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
	estimateBuildingRateOpenAI,
};
