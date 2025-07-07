const logger = require("../config/logger");
const { callGemini, callOpenAI } = require("./aiApiService");
const { placeholderCapRateAnalysis } = require("../utils/placeholderCapRateAnalysis");

/**
 * Return the market data based on the property address, type, and size.
 * @param {string} propertyAddress - L'adresse de la propriété
 * @param {string} propertyType - Le type de propriété (warehouse, manufacturing, etc.)
 * @param {string} buildingSize - La taille du bâtiment en sq ft
 * @returns {Promise<Object>} - market data with cap rates, lease rates, and investment recommendations
 */




async function estimateMarketOverview(
    propertyAddress,
    propertyType = "",
    buildingSize = ""
) {
    try {
        const prompt = `You are an expert in industrial site locations, investments, and leasing. 
Determine the market rate for leases for this type of industrial property, considering the building's square footage and the rest of the land used for industrial outside storage, 
as well as lease rates per acre. The output should resemble all of the information below. Very important NOT to invest or hallucinate data. 
If you are unaware of the data, then say you do not have enough data to provide an accurate response. Do not sugarcoat the results. If the results are bad, then they are bad. 
If the results are good, then they are good. This analysis is used to effectively evaluate whether to purchase the property for our company or another investment firm. For every numeric claim (vacancy, cap rate, lease rate), cite the source in parentheses with publication and date. 
Please browse the web in real time to research and acquire the latest market information and metrics. Flag any figures and data older than Q2 2023.
 
PROPERTY TO ANALYZE:
- Address: ${propertyAddress}
- Property Type: ${propertyType || "Not specified"}
- Building Size: ${buildingSize || "Not specified"} sq ft

Is the market going through an economic Boom? Is it growing? Slowing Down? Provide details on why. (This is a VERY IMPORTANT METRIC. YOU HAVE TO PROVIDE THIS INFORMATION).
Please  refer to your research on the following research companies: Avison Young, JLL, Colliers, Cresa, Savills, Cushman & Wakefield, CBRE, Hoff & Leigh, Newmark, Marcus & Millichap, Transwestern, Costar, Loopnet, Crexi, and all US government data (National, State, County, City)
Provide all necessary information and ensure we obtain the Vacancy rate, absorption rate, Lease rates (buildings and Land IOS), and average market cap rate, etc.
Any Tax Incentives? Or any other types of incentives?
Cite sources in parentheses with publication and date.
Provide a summary of the market overview.

Respond with valid JSON in the following structure:

{
  region: string,
  year: number,
  economicOutlook: {
    status: "Boom" | "Growing" | "Slowing" | "Stagnant",
    description: string
  },
  vacancyRate: {
    value: string,
    source: string
  },
  absorptionRate: {
    value: string,
    source: string
  },
  leaseRates: {
    buildingRate: {
      average: string,
      range: string,
      source: string
    },
    iosLandRate: {
      average: string,
      range: string,
      source: string
    }
  },
  capRates: {
    average: string,
    range: string,
    source: string
  },
  taxIncentives: Array<{
    name: string,
    description: string,
    source: string
  }>,
  marketSummary: string
}

`
        const responseOpenAI = await callOpenAI(prompt, {
            maxOutputTokens: 2000,
            temperature: 0.3,
            
        });
        console.log("Market Analysis:", responseOpenAI);
         // Extraire le JSON de la réponse
        const jsonMatch = responseOpenAI.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("No valid JSON found in OpenAI response");
        }

        
        const marketAnalysis = JSON.parse(jsonMatch[0]);
        

        // Validation de base des données retournées


        logger.info("Market data estimation completed", {
            region: marketAnalysis.region,
            year: marketAnalysis.year,
            economicOutlook: marketAnalysis.economicOutlook,
            vacancyRate: marketAnalysis.vacancyRate,
            absorptionRate: marketAnalysis.absorptionRate,
            leaseRates: marketAnalysis.leaseRates,
            capRates: marketAnalysis.capRates,
            taxIncentives: marketAnalysis.taxIncentives,
            marketSummary: marketAnalysis.marketSummary
        });
        return marketAnalysis;
    } catch (error) {
        logger.error("Market data estimation failed", {
            error: error.message,
            stack: error.stack,
        });
        return placeholderCapRateAnalysis;
        
    }
}

module.exports = {
    estimateMarketOverview,
};