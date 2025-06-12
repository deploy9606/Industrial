const logger = require("../config/logger");
const { callOpenAI, callGemini } = require("./aiApiService");

async function analyzeLocalMarket(address) {
	try {
		logger.info("Starting AI market analysis", { address });

		// APPEL UNIQUE OpenAI pour toute l'analyse de marché
		const prompt = `Analyze the industrial real estate market for: ${address}

Provide a complete market analysis in JSON format:
{
  "localTrends": "Brief local economic trends (2-3 sentences)",
  "industryGrowth": "Industrial market growth summary (2-3 sentences)", 
  "areaGrowthScore": numerical_score_1_to_10,
  "demandIndicators": ["factor1", "factor2", "factor3"],
  "marketMetrics": {
    "vacancyRate": "estimated_percentage",
    "averageRent": "estimated_rate_per_sqft", 
    "growthProjection": "annual_percentage"
  },
  "competitiveFactors": ["advantage1", "advantage2"]
}

Focus on practical, business-relevant insights. Be concise but informative.`;

		const response = await callOpenAI(prompt, {
			temperature: 0.3,
			maxTokens: 800, // Réduit de 1200 à 800
		});

		// Parser la réponse
		let marketAnalysis;
		try {
			const jsonMatch = response.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				marketAnalysis = JSON.parse(jsonMatch[0]);

				// Validation simple
				marketAnalysis.areaGrowthScore = Math.min(
					10,
					Math.max(1, parseFloat(marketAnalysis.areaGrowthScore) || 7)
				);

				if (!Array.isArray(marketAnalysis.demandIndicators)) {
					marketAnalysis.demandIndicators = [
						"Strategic location",
						"Market accessibility",
						"Growth potential",
					];
				}
			} else {
				throw new Error("No JSON found in response");
			}
		} catch (parseError) {
			logger.warn("Failed to parse market response, using structured fallback");
			marketAnalysis = generateMarketFallback(address, response);
		}

		logger.info("AI market analysis completed", {
			address,
			growthScore: marketAnalysis.areaGrowthScore,
		});

		return marketAnalysis;
	} catch (err) {
		logger.error("AI market analysis failed", {
			error: err.message,
			address,
		});

		// Fallback rapide sans IA
		return generateMarketFallback(address);
	}
}

// Fallback rapide pour l'analyse de marché
function generateMarketFallback(address, aiResponse = "") {
	// Extraire des insights basiques du texte IA si disponible
	const hasGrowth =
		aiResponse.toLowerCase().includes("growth") ||
		aiResponse.toLowerCase().includes("expansion");
	const hasLogistics =
		aiResponse.toLowerCase().includes("logistics") ||
		aiResponse.toLowerCase().includes("distribution");

	return {
		localTrends: hasGrowth
			? "Growing industrial demand driven by e-commerce and logistics expansion"
			: "Stable industrial market with moderate growth potential",
		industryGrowth: hasLogistics
			? "Strong logistics sector growth with 8-12% annual expansion in industrial space demand"
			: "Industrial sector showing positive indicators with steady demand growth",
		areaGrowthScore: hasGrowth && hasLogistics ? 8 : 7,
		demandIndicators: [
			"E-commerce growth",
			"Strategic location",
			"Transportation infrastructure",
		],
		marketMetrics: {
			vacancyRate: "6-8%",
			averageRent: "$6-8/sq ft",
			growthProjection: "5-8% annually",
		},
		competitiveFactors: ["Accessibility advantage", "Market positioning"],
	};
}

module.exports = {
	analyzeLocalMarket,
	generateMarketFallback,
};
