const logger = require('../config/logger');
const { callClaude, callOpenAI } = require('./aiApiService');


/**
 * Estime le building rate (taux par sq ft) basé sur l'adresse de la propriété
 * @param {string} propertyAddress - L'adresse de la propriété
 * @param {string} propertyType - Le type de propriété (warehouse, manufacturing, etc.)
 * @param {string} buildingSize - La taille du bâtiment en sq ft
 * @param {string} askingPrice - Le prix demandé pour la propriété (optionnel)
 * @returns {Promise<Object>} - Estimation du building rate avec détails
 */
async function getInvestmentRecommendation(
	propertyAddress,
	propertyType,
	buildingSize ,
    askingPrice,
) {
	try {
		const prompt = `
Investment Recommendation and Strategic Positioning
You are an expert in industrial site locations, investments, and leasing. 
The output should resemble all of the information below. Very important NOT to invest or hallucinate data. If you are unaware of the data, 
then say you do not have enough data to provide an accurate response. Do not sugarcoat the results. If the results are bad, then they are bad. 
If the results are good, then they are good. This analysis is used to effectively evaluate whether to purchase the property for our company or another 
investment firm. For every numeric claim (vacancy, cap rate, lease rate), cite the source in parentheses with publication and date. Please browse the web in 
real time to research and acquire the latest market information and metrics. 
Property and Location Strengths and Risks.
Market Strengths and Risks.
Key investment strengths
Risk factors requiring monitoring
Investment opportunity timing
Acquisition Strategy
Summary

PROPERTY TO ANALYZE:
- Address: ${propertyAddress}
- Property Type: ${propertyType || "Not specified"}
- Building Size: ${buildingSize || "Not specified"} sq ft
- Asking Price: ${askingPrice || "Not specified"}

Respond in valid JSON. Do not under any circumstances include any text or explanations outside of the JSON block. Even if you cant find anything you have to answer using this json schema. Use this schema:
REQUIRED RESPONSE (strict JSON format) Respond between <json></json> tags

:
<json>


{
  "propertyAnalysis": {
    "strengths": [
      "Strategic location near interstate highways and distribution hubs",
      "Modern infrastructure with 28' clear height and ample dock doors"
    ],
    "risks": [
      "Limited tenant demand in submarket per CBRE Q1 2024",
      "Older neighboring industrial buildings reduce asset appeal"
    ]
  },
  "marketAnalysis": {
    "strengths": [
      "Growing demand for industrial outdoor storage (IOS)",
      "Recent absorption rate of 2.1M SF in the past 6 months (JLL, May 2024)"
    ],
    "risks": [
      "Rising vacancy rate in nearby tertiary zones",
      "Potential oversupply flagged by Cushman & Wakefield (Q2 2024)"
    ]
  },
  "investmentSummary": {
    "keyStrengths": [
      "Rare large parcel in constrained urban market",
      "IOS-compatible with expansion potential"
    ],
    "risksToMonitor": [
      "Lease-up risk if regional vacancy continues climbing",
      "Zoning updates possibly restricting IOS usage"
    ],
    "timing": "Q3 2025 is optimal given current cap rate trends and limited competitive inventory",
    "strategy": "Acquire at discount, stabilize with long-term IOS tenant, hold for 5–7 years to capitalize on yield compression",
    "summary": "The property presents a strong industrial investment opportunity with strategic upside, though exposure to regional vacancy risk and zoning should be tracked closely. Suitable for value-add or long-term hold strategies."
  }
}

  </json>
response with the json tag at the beginning and end of the response. Do not include any text or explanations outside of the JSON block.
`;

		const responseClaude = await callClaude(prompt, {
			maxOutputTokens: 10000,
			temperature: 0.3,
			model: "claude-sonnet-4-20250514",
		});
        
        console.log("Investment Recommendation:",responseClaude );

		

// 1. Find the `text` response from Claude
const textEntry = Array.isArray(responseClaude)
  ? responseClaude.find((item) => item.type === "text")
  : null;

if (!textEntry || !textEntry.text) {
  throw new Error("Claude did not return a valid text response");
}

let jsonString;

// 2. Try to extract <json>...</json> format
let jsonMatch = textEntry.text.match(/<json>\s*([\s\S]*?)\s*<\/json>/);
if (jsonMatch && jsonMatch[1]) {
  jsonString = jsonMatch[1];
} else {
  // 3. Try fallback for ```json ... ```
  jsonMatch = textEntry.text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    jsonString = jsonMatch[1];
  } else {
    throw new Error("No valid JSON block found in Claude response text");
  }
}

let devData;
try {
  devData = JSON.parse(jsonString);
} catch (e) {
  throw new Error("Failed to parse JSON from Claude response: " + e.message);
}
		logger.info("Investment Recommendation completed", {
            propertyAddress,
            strengths: devData.propertyAnalysis.strengths.length,
            risks: devData.propertyAnalysis.risks.length,
            marketStrengths: devData.marketAnalysis.strengths.length,
            marketRisks: devData.marketAnalysis.risks.length,
            keyStrengths: devData.investmentSummary.keyStrengths.length,
            risksToMonitor: devData.investmentSummary.risksToMonitor.length,
            timing: devData.investmentSummary.timing,
            strategy: devData.investmentSummary.strategy,
		});

		return devData;
	} catch (error) {
		logger.error("Failed to estimate investment recommendation", {
			error: error.message,
			propertyAddress,
		});

		// Return a default estimation in case of error
		return {
			growthStatus: "Unknown",
			growthSummary: "No data available",
			developmentsCount: 0,
			offshoringCount: 0,
		};
	}
}

module.exports = {
    getInvestmentRecommendation,
};