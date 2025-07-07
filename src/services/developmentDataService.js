const logger = require('../config/logger');
const { callClaude, callOpenAI } = require('./aiApiService');


/**
 * Estime le building rate (taux par sq ft) basé sur l'adresse de la propriété
 * @param {string} propertyAddress - L'adresse de la propriété
 * @param {string} propertyType - Le type de propriété (warehouse, manufacturing, etc.)
 * @param {string} buildingSize - La taille du bâtiment en sq ft
 * @returns {Promise<Object>} - Estimation du building rate avec détails
 */
async function getDevelopmentData(
	propertyAddress,
	propertyType,
	buildingSize 
) {
	try {
		const prompt = `
You are an expert in industrial site locations, investments, and leasing. Determine the market rate for leases for this type of industrial property, 
considering the building's square footage and the rest of the land used for industrial outside storage, as well as lease rates per acre. 
The output should resemble all of the information below. Very important NOT to invest or hallucinate data. If you are unaware of the data, 
then say you do not have enough data to provide an accurate response. Do not sugarcoat the results. If the results are bad, then they are bad. 
If the results are good, then they are good. This analysis is used to effectively evaluate whether to purchase the property for our company or another 
investment firm. For every numeric claim (vacancy, cap rate, lease rate), cite the source in parentheses with publication and date. Please browse the web in 
real time to research and acquire the latest market information and metrics. Flag any figures and data older than Q2 2023. List the top 10 new Business Developments and Major Investments Within a 30-mile Radius

Is the city experiencing growth or decline?
List all new developments in detail that will affect either negatively or positively the property in question. Be thorough and provide detailed information to easily see which new projects or projects that have just been developed will affect the property investment.
Provide companies coming for offshoring and forecasting to come in
Provide any necessary additional and detailed information about companies' offshoring in these areas.
Provide a summary of the New Business Development

PROPERTY TO ANALYZE:
- Address: ${propertyAddress}
- Property Type: ${propertyType || "Not specified"}
- Building Size: ${buildingSize || "Not specified"} sq ft

Respond in valid JSON. Do not under any circumstances include any text or explanations outside of the JSON block. Even if you cant find anything you have to answer using this json schema. Use this schema:
REQUIRED RESPONSE (strict JSON format) Respond between <json></json> tags

:
<json>


{
    "warning": any warning or intro message that doesnt fit in the schema,
  "region": "South Chicago Heights, IL",
  "analysisDate": "2025-06-23",
  "growthStatus": "Growing", 
  "growthSummary": "The region is currently experiencing steady industrial growth, particularly in the logistics and e-commerce sectors. Multiple infrastructure and distribution hub investments are underway, and several companies are expanding offshoring operations into nearby industrial parks.",
  "developments": [
    {
      "name": "Amazon Fulfillment Center Expansion",
      "type": "Industrial / Logistics",
      "distanceFromSubject": "12 miles",
      "impact": "positive",
      "description": "Amazon is expanding its distribution center in Joliet, IL, adding 800,000 sq ft of warehouse space and creating 1,500 new jobs.",
      "status": "Under Construction",
      "investmentValue": "$230M",
      "completionDate": "2025-11",
      "source": "CBRE Market Report, Q2 2025"
    }

    // Add 8 more developments here
  ],
  "offshoringActivity": [
    {
      "company": "Samsung Electronics",
      "activity": "Establishing a logistics hub for North American operations",
      "location": "Matteson, IL",
      "forecastImpact": "positive",
      "description": "Samsung has begun site planning for a large-scale logistics center focused on appliance distribution.",
      "timeline": "Q4 2025",
      "source": "Loopnet Industrial Trends, April 2025"
    },

  ],
  "developmentSummary": "Within a 30-mile radius of South Chicago Heights, 10 major business developments totaling over $2.3 billion in investment have been identified. These include new e-commerce hubs, automotive facility upgrades, and several corporate offshoring expansions expected to drive job creation, infrastructure upgrades, and increased industrial space demand through 2026."
}
  </json>
response with the json tag at the beginning and end of the response. Do not include any text or explanations outside of the JSON block.
`;

		const responseClaude = await callClaude(prompt, {
			maxOutputTokens: 2000,
			temperature: 0.3,
			model: "claude-sonnet-4-20250514",
		});
        
        console.log("Development Data:",responseClaude );

		

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
		logger.info("Building rate estimation completed", {
            region: devData.region,
            analysisDate: devData.analysisDate,
			growthStatus: devData.growthStatus,
			growthSummary: devData.growthSummary,
            developmentsCount: devData.developments.length,
            offshoringCount: devData.offshoringActivity.length,
		});

		return devData;
	} catch (error) {
		logger.error("Failed to estimate development data", {
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
    getDevelopmentData,
};