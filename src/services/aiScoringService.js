const logger = require("../config/logger");
const { callOpenAI, callGemini } = require("./aiApiService");

/**
 * Service pour générer les scores de tenants entièrement par IA
 * Utilise des prompts spécialisés pour évaluer chaque critère
 */

// Génération de scores par IA pour un batch de tenants
async function generateAIScoresForTenants(tenants, propertyData, marketAnalysis) {
	try {
		logger.info(`Generating AI scores for ${tenants.length} tenants`);

		const prompt = `You are a commercial real estate AI analyst for 9606 Capital. Analyze and score these ${
			tenants.length
		} potential tenants for the property.

PROPERTY CONTEXT:
- Address: ${propertyData.address}
- Type: ${propertyData.type}
- Size: ${propertyData.squareFootage} sq ft
- Acreage: ${propertyData.acreage || 0} acres
- Features: ${propertyData.features?.join(", ") || "Standard industrial"}

MARKET CONTEXT:
- Area Growth Score: ${marketAnalysis.areaGrowthScore || 7}/10
- Area Trends: ${marketAnalysis.areaGrowthTrends || "Positive growth"}
- Industry Growth: ${marketAnalysis.nationalIndustryTrend || "Stable growth"}

TENANT CANDIDATES:
${tenants
	.map(
		(tenant, idx) =>
			`${idx + 1}. ${tenant.company} - ${tenant.operations} (${tenant.industryType}, ${
				tenant.distance
			} miles away)`
	)
	.join("\n")}

SCORING CRITERIA (1-10 scale):
1. **Market Fit**: Area growth trends + industry sector alignment
2. **Property Match**: Operational needs + building compatibility  
3. **Growth Potential**: Company capacity + market timing + competitive pressure

For each tenant, provide detailed AI analysis:

{
  "tenantScores": [
    {
      "company": "Tenant Name",
      "marketFit": score_1_to_10,
      "propertyMatch": score_1_to_10, 
      "growthPotential": score_1_to_10,
      "finalScore": weighted_score_1_to_100,
      "reasoning": "Detailed 3-4 sentence value proposition explaining why this property benefits this tenant, including operational advantages, strategic positioning, and market timing. Write it as a compelling business case.",
      "keyStrengths": ["strength1", "strength2", "strength3"],
      "riskFactors": ["risk1", "risk2"]
    }
  ]
}

Calculate finalScore as: (marketFit * 0.35 + propertyMatch * 0.40 + growthPotential * 0.25) * 10

Focus on emerging companies strategy - prioritize growing businesses over large corporations.
Write the reasoning as a compelling value proposition that could be used in leasing presentations.
Provide realistic scores with variation between tenants. Be analytical and data-driven.`;

		const response = await callOpenAI(prompt, {
			temperature: 0.3,
			maxTokens: tenants.length * 200 + 500, // Ajuster en fonction du nombre de tenants
		});

		let aiScores;
		try {
			const jsonMatch = response.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				aiScores = JSON.parse(jsonMatch[0]);
			} else {
				throw new Error("No JSON found in AI response");
			}
		} catch (parseError) {
			logger.warn("Failed to parse AI scores, using enhanced fallback");
			aiScores = generateEnhancedFallbackScores(tenants, propertyData, marketAnalysis);
		}

		// Valider et normaliser les scores
		const validatedScores = validateAndNormalizeScores(aiScores.tenantScores || []);

		logger.info(`Generated AI scores for ${validatedScores.length} tenants`);
		return validatedScores;
	} catch (error) {
		logger.error("AI scoring generation failed:", error);
		return generateEnhancedFallbackScores(tenants, propertyData, marketAnalysis);
	}
}

// Validation et normalisation des scores IA
function validateAndNormalizeScores(scores) {
	return scores.map((score) => ({
		company: score.company || "Unknown",
		marketFit: Math.min(10, Math.max(1, parseFloat(score.marketFit) || 5)),
		propertyMatch: Math.min(10, Math.max(1, parseFloat(score.propertyMatch) || 5)),
		growthPotential: Math.min(10, Math.max(1, parseFloat(score.growthPotential) || 5)),
		finalScore: Math.min(100, Math.max(10, parseFloat(score.finalScore) || 50)),
		reasoning: score.reasoning || "AI analysis completed",
		keyStrengths: score.keyStrengths || ["Operational fit", "Market position"],
		riskFactors: score.riskFactors || ["Market competition", "Economic factors"],
	}));
}

// Fallback intelligent pour scores IA
function generateEnhancedFallbackScores(tenants, propertyData, marketAnalysis) {
	return tenants.map((tenant, index) => {
		// Logique de scoring intelligent basée sur les données disponibles
		const baseMarketScore = marketAnalysis.areaGrowthScore || 7;
		const industryMultiplier = getIndustryMultiplier(tenant.industryType);
		const sizeMultiplier = getSizeCompatibility(tenant, propertyData);
		const distanceMultiplier = getDistanceMultiplier(tenant.distance);

		const marketFit = Math.min(
			10,
			Math.max(3, Math.round(baseMarketScore * industryMultiplier))
		);
		const propertyMatch = Math.min(
			10,
			Math.max(2, Math.round(6 * sizeMultiplier * distanceMultiplier))
		);
		const growthPotential = Math.min(
			10,
			Math.max(1, Math.round(5 + industryMultiplier * 2 + (index % 3)))
		);

		const finalScore = Math.round(
			(marketFit * 0.35 + propertyMatch * 0.4 + growthPotential * 0.25) * 10
		);

		return {
			company: tenant.company,
			marketFit,
			propertyMatch,
			growthPotential,
			finalScore: Math.min(95, Math.max(15, finalScore)),
			reasoning: `Enhanced algorithmic analysis: ${tenant.industryType} company with ${
				sizeMultiplier > 1 ? "good" : "moderate"
			} size compatibility and ${
				distanceMultiplier > 1 ? "excellent" : "adequate"
			} location proximity.`,
			keyStrengths: generateKeyStrengths(tenant, propertyData),
			riskFactors: ["Market competition", "Economic uncertainty"],
		};
	});
}

// Fonctions utilitaires pour le scoring
function getIndustryMultiplier(industryType) {
	const multipliers = {
		"3PL": 1.3, // Logistique en forte demande
		Tech: 1.4, // Tech très dynamique
		Food: 1.1, // Alimentaire stable
		Manufacturing: 1.0, // Traditionnel
		Retail: 0.9, // En difficulté
		Other: 1.0,
	};
	return multipliers[industryType] || 1.0;
}

function getSizeCompatibility(tenant, propertyData) {
	const propertySize = propertyData.squareFootage || 0;
	const idealRanges = {
		"3PL": { min: 80000, max: 300000 },
		Manufacturing: { min: 40000, max: 200000 },
		Food: { min: 50000, max: 150000 },
		Tech: { min: 20000, max: 100000 },
		Retail: { min: 30000, max: 200000 },
	};

	const range = idealRanges[tenant.industryType] || { min: 30000, max: 200000 };

	if (propertySize >= range.min && propertySize <= range.max) return 1.3;
	if (propertySize >= range.min * 0.7 && propertySize <= range.max * 1.3) return 1.1;
	return 0.9;
}

function getDistanceMultiplier(distance) {
	const dist = parseInt(distance) || 50;
	if (dist <= 20) return 1.3;
	if (dist <= 40) return 1.1;
	if (dist <= 75) return 1.0;
	return 0.8;
}

function generateKeyStrengths(tenant, propertyData) {
	const strengths = ["Market position"];

	if (tenant.industryType === "3PL") strengths.push("Logistics expertise");
	if (tenant.industryType === "Tech") strengths.push("Innovation capacity");
	if (parseInt(tenant.distance) <= 30) strengths.push("Strategic location");
	if (propertyData.squareFootage >= 100000) strengths.push("Scale operations");

	return strengths.slice(0, 3);
}

module.exports = {
	generateAIScoresForTenants,
	validateAndNormalizeScores,
	generateEnhancedFallbackScores,
};
