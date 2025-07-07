
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




async function estimateMarketData(
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

Below is an example of how to output the average cap rate market data. Please  refer to your research on the following research companies: Avison Young, JLL, Colliers, Cresa, Savills, Cushman & Wakefield, CBRE, Hoff & Leigh, Newmark, Marcus & Millichap, Transwestern, Costar, Loopnet, Crexi, and all US government data (National, State, County, City)
If cap-rate comps within 10 miles aren’t available post-2023, provide a state-level industrial cap-rate range instead and flag the limitation.
Baltimore Industrial Cap Rates (2024 Market Data)
Average Industrial Cap Rates:
Overall Baltimore Industrial Market: 6.0% - 8.5%
Prime Locations (near BWI/Port): 6.0% - 7.5%
Secondary Locations: 7.5% - 8.5%
Value-Add Properties: 8.0% - 9.5%
Specific to 6051 Olson Rd Area: Given the property's strategic location near BWI Airport (4.6 miles), Port of Baltimore (3.9 miles), and excellent highway access, this would be considered a prime industrial location.
Expected Cap Rate Range for This Property: 7.0% - 8.0%
Market Context:
Cap rates have compressed significantly from 2020 levels due to strong demand
CBRE reported 6% cap rate compression in the Baltimore industrial market through 2024
The Francis Scott Key Bridge collapse has created some uncertainty, potentially adding 25-50 basis points to cap rates in affected areas
Limited supply of large industrial parcels (8+ acres) commands premium pricing and lower cap rates
Comparable Sales Cap Rate Analysis:
Race Road Logistics Center (130,000 SF, Hanover): Estimated 6.5-7.0% cap rate
Peppermill Trade Center (107,000 SF, Glen Burnie): Estimated 6.8-7.3% cap rate
Investment Recommendation: For the 6051 Olson Rd property, targeting a 7.5% - 8.0% stabilized cap rate would be appropriate given:
- Excellent location fundamentals
- Large parcel size (rare in the market)
- Value-add potential
- Current market conditions
 
Respond in valid JSON. Do not include any text or explanations outside of the JSON block. Use this schema:

{
  region: string,
  year: number,
  marketAverages: Array<{ label: string, range: string }>,
  subjectProperty: {
    locationNotes: string,
    classification: string,
    expectedCapRateRange: string
  },
  marketContext: string[],
  comparableSales: Array<{ name: string, size: string, location: string, capRateRange: string, source: string }>,
  investmentRecommendation: {
    targetCapRateRange: string,
    justification: string[]
  }
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
            marketAverages: marketAnalysis.marketAverages,
            subjectProperty: marketAnalysis.subjectProperty,
            marketContext: marketAnalysis.marketContext,
            comparableSales: marketAnalysis.comparableSales,
            investmentRecommendation: marketAnalysis.investmentRecommendation
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
    estimateMarketData,
};