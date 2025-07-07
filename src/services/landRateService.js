const logger = require("../config/logger");
const { callGemini, callOpenAI } = require("./aiApiService");

/**
 * Estime le building rate (taux par sq ft) basé sur l'adresse de la propriété
 * @param {string} propertyAddress - L'adresse de la propriété
 * @param {string} propertyType - Le type de propriété (warehouse, manufacturing, etc.)
 * @param {string} buildingSize - La taille du bâtiment en sq ft
 * @returns {Promise<Object>} - Estimation du building rate avec détails
 */
async function estimateLandRate(
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
real time to research and acquire the latest market information and metrics. Flag any figures and data older than Q2 2023.Market Lease Rate for Industrial Outside Storage (IOS) Land
Provide Market Lease Rate in Acres per Month ($/AC/Mo)  for the Industrial Land by displaying Average Market Rate, Lower End and higher End. This is an example:
Industrial Outside Storage has become a critical and increasingly valuable component of the industrial real estate market, particularly in logistics-heavy locations like Memphis. The lease rates for IOS land are typically quoted on a per-acre, per-month basis.
Current Market Rate for IOS in Memphis: Recent listings and market reports indicate a strong demand for IOS land. For example, a nearby 18.33-acre IOS property was listed for lease at $3,500 per acre per month.
Lower-end lease pricing
Higher-end lease pricing
Sunbelt Region Averages: Broader market reports for the Sunbelt region show average IOS rental rates hovering around $5,000 to $6,500 per acre per month.

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
  "averageMarketRate": number, // Estimated rate in USD Acres per Month ($/AC/Mo)
  "estimatedLowerEnd": number, // Lower end of the rate range
  "estimatedUpperEnd": number, // Higher end of the rate range
  "confidence": "high" | "medium" | "low", // Confidence level of the estimation
}

CONSTRAINTS:
- Rate must be in USD per Acres per Month
- Confidence can be: "high", "medium", "low"
- Base your analysis on known real market data
- If data is insufficient, indicate "low" confidence
- Provide only the JSON, no additional text`;

        const responseGemini = await callGemini(prompt, {
            maxOutputTokens: 2000,
            temperature: 0.3,
            model: "gemini-2.0-flash",
        });

        
        // Extraire le JSON de la réponse
        const jsonMatch = responseGemini.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("No valid JSON found in Gemini response");
        }

        const rateEstimation = JSON.parse(jsonMatch[0]);

        // Validation de base des données retournées
        if (!rateEstimation.averageMarketRate || !rateEstimation.confidence) {
            throw new Error("Invalid rate estimation format");
        }

        logger.info("Land rate estimation completed", {
            estimatedRate: rateEstimation.averageMarketRate,
            confidence: rateEstimation.confidence,
            estimatedLowerEnd: rateEstimation.estimatedLowerEnd,
            estimatedUpperEnd: rateEstimation.estimatedUpperEnd,
        });

        return rateEstimation;
    } catch (error) {
        logger.error("Failed to estimate land rate", {
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
async function estimateLandRateOpenAI(
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
real time to research and acquire the latest market information and metrics. Flag any figures and data older than Q2 2023.Market Lease Rate for Industrial Outside Storage (IOS) Land
Provide Market Lease Rate in Acres per Month ($/AC/Mo)  for the Industrial Land by displaying Average Market Rate, Lower End and higher End. This is an example:
Industrial Outside Storage has become a critical and increasingly valuable component of the industrial real estate market, particularly in logistics-heavy locations like Memphis. The lease rates for IOS land are typically quoted on a per-acre, per-month basis.
Current Market Rate for IOS in Memphis: Recent listings and market reports indicate a strong demand for IOS land. For example, a nearby 18.33-acre IOS property was listed for lease at $3,500 per acre per month.
Lower-end lease pricing
Higher-end lease pricing
Sunbelt Region Averages: Broader market reports for the Sunbelt region show average IOS rental rates hovering around $5,000 to $6,500 per acre per month.

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
  "averageMarketRate": number, // Estimated rate in USD Acres per Month ($/AC/Mo)
  "estimatedLowerEnd": number, // Lower end of the rate range
  "estimatedUpperEnd": number, // Higher end of the rate range
  "confidence": "high" | "medium" | "low", // Confidence level of the estimation
}

CONSTRAINTS:
- Rate must be in USD per Acres per Month
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
            throw new Error("No valid JSON found in OpenAI response");
        }
        console.log("LAND Rate ", responseOpenAI);

        const rateEstimation = JSON.parse(jsonMatch[0]);

        // Validation de base des données retournées
        if (!rateEstimation.averageMarketRate || !rateEstimation.confidence) {
            throw new Error("Invalid rate estimation format");
        }

        logger.info("Land rate estimation completed", {
            estimatedRate: rateEstimation.averageMarketRate,
            confidence: rateEstimation.confidence,
            estimatedLowerEnd: rateEstimation.estimatedLowerEnd,
            estimatedUpperEnd: rateEstimation.estimatedUpperEnd,
        });

        return rateEstimation;
    } catch (error) {
        logger.error("Failed to estimate land rate", {
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
    estimateLandRate,
    estimateLandRateOpenAI,
};
