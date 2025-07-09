const logger = require("../config/logger");
const { analyzeLocalMarket } = require("./marketAnalysisService");
const { discoverHiddenTenants } = require("./tenantService");
const { callGemini, callOpenAI } = require("./aiApiService");
const progressService = require("./progressService");
const { PROMPT_CONFIG } = require("../utils/constants");

// Nouvelle analyse basée sur le prompt IA fourni
async function analyzePropertyWithAI(propertyData, sessionId = null) {
	const useAiScoring = propertyData.use_ai_scoring || false;
	const results = {
		propertyAnalysis: null,
		marketAnalysis: null,
		tenantRanking: null,
		errors: {},
		metadata: {
			analysisDate: new Date().toISOString(),
			promptVersion: "9606_v2.0",
			focusStrategy: "hidden_gem_tenants",
			aiScoringEnabled: useAiScoring,
			totalSteps: useAiScoring ? 5 : 4,
		},
	};

	logger.info("Starting 9606 Capital AI property analysis", {
		address: propertyData.address,
		sessionId: sessionId,
		useAiScoring: useAiScoring,
	});

	// ÉTAPE 1: Analyse de la configuration du bâtiment
	if (sessionId) {
		progressService.updateProgress(
			sessionId,
			1,
			"Building configuration analysis",
			"Using the Gemini API to analyze property characteristics..."
		);
	}

	try {
		results.propertyAnalysis = await analyzeBuildingConfiguration(propertyData);
	} catch (err) {
		logger.error("Building configuration analysis failed", { error: err.message });
		results.errors.propertyAnalysis = "Error during building configuration analysis";
	}

	// ÉTAPE 2: Analyse du marché local et des tendances de croissance
	if (sessionId) {
		progressService.updateProgress(
			sessionId,
			2,
			"Growth trends analysis",
			"Using the OpenAI API to analyze the local market and economic trends..."
		);
	}

	try {
		results.marketAnalysis = await analyzeAreaGrowthTrends(propertyData.address);
	} catch (err) {
		logger.error("Market analysis failed", { error: err.message });
		results.errors.marketAnalysis = "Error during market trends analysis";
	}

	// ÉTAPE 3: Recherche de locataires ciblés
	if (sessionId) {
		progressService.updateProgress(
			sessionId,
			3,
			"Emerging tenant search",
			"Using the OpenAI API to discover emerging businesses..."
		);
	}

	try {
		results.tenantRanking = await discoverHiddenTenants(
			propertyData,
			results.propertyAnalysis,
			results.marketAnalysis,
			useAiScoring
		);
	} catch (err) {
		logger.error("Tenant discovery failed", { error: err.message });
		results.errors.tenantRanking = "Error during tenant discovery";
	}

	// STEP 4 (CONDITIONAL): AI Scoring
	if (useAiScoring && sessionId) {
		progressService.updateProgress(
			sessionId,
			4,
			"AI tenant scoring",
			"Generating advanced scores using artificial intelligence..."
		);

		// Exécuter le scoring IA
		try {
			const { generateAIScoresForTenants } = require("./aiScoringService");

			if (results.tenantRanking && results.tenantRanking.length > 0) {
				const aiScoredTenants = await generateAIScoresForTenants(
					results.tenantRanking,
					propertyData,
					results.marketAnalysis
				);

				// Fusionner les scores IA avec les données existantes des tenants
				results.tenantRanking = results.tenantRanking.map((tenant) => {
					const aiScore = aiScoredTenants.find(
						(aiTenant) => aiTenant.company === tenant.company
					);

					if (aiScore) {
						// Remplacer les scores par ceux de l'IA et ajouter les nouvelles données IA
						return {
							...tenant,
							marketFit: aiScore.marketFit,
							propertyMatch: aiScore.propertyMatch,
							growthPotential: aiScore.growthPotential,
							score: aiScore.finalScore,
							aiReasoning: aiScore.reasoning,
							keyStrengths: aiScore.keyStrengths,
							riskFactors: aiScore.riskFactors,
						};
					} else {
						logger.warn(`Debug: No AI score found for ${tenant.company}`);
					}
					return tenant; // Garder le tenant original si pas de score IA trouvé
				});

				// Re-trier les tenants par score final après application des scores IA
				results.tenantRanking = results.tenantRanking.sort((a, b) => b.score - a.score);

				logger.info("AI scoring completed", {
					address: propertyData.address,
					scoredTenants: aiScoredTenants.length,
				});
			}
		} catch (err) {
			logger.error("AI scoring failed", { error: err.message });
			// On continue sans AI scoring en cas d'erreur
		}
	}

	const hasErrors = Object.keys(results.errors).length > 0;
	logger.info("9606 Capital AI analysis completed", {
		address: propertyData.address,
		tenantsFound: results.tenantRanking?.length || 0,
		aiScoringEnabled: useAiScoring,
		hasErrors: hasErrors,
		errorCount: Object.keys(results.errors).length,
	});

	return results;
}

// Analyse configuration du bâtiment basée sur le prompt 9606 Capital
async function analyzeBuildingConfiguration(propertyData) {
	const { type, squareFootage, acreage, features = [], address } = propertyData;

	// Prompt adapté du système 9606 Capital
	const prompt = `Analyze this industrial property using 9606 Capital methodology:

PROPERTY DATA:
Address: ${address}
Type: ${type}
Square Footage: ${squareFootage} sq ft
Acreage: ${acreage || "N/A"} acres
Features: ${features.join(", ") || "Standard industrial features"}

ANALYZE FOR:
1. Building configuration (e.g., "warehouse with X loading docks", "office with Y parking spaces")
2. Property features that match operational needs
3. Brief property info (zoning, proximity advantages)

Return JSON:
{
  "configuration": "detailed building layout description with dock count, parking, etc.",
  "propertyFeatures": ["feature1", "feature2", "feature3"],
  "briefPropertyInfo": "zoning and location advantages",
  "marketFit": "suitability for target tenant types",
  "technicalSpecs": {
    "buildingType": "${type}",
    "totalArea": ${squareFootage || 0},
    "landArea": ${acreage || 0},
    "loadingDocks": "estimated_count",
    "clearHeight": "estimated_height",
    "parkingSpaces": "estimated_count"
  },
  "targetUseTypes": ["warehouse_space", "office_space", "mixed_use", "other"]
}

Focus on practical operational details that emerging companies would need.`;

	const response = await callGemini(prompt, {
		maxOutputTokens: 4500,
		temperature: 0.3,
		model: "gemini-2.0-flash",
	});

	const jsonMatch = response.match(/\{[\s\S]*\}/);
	if (!jsonMatch) {
		throw new Error("No JSON found in building analysis response");
	}

	const analysisResult = JSON.parse(jsonMatch[0]);

	logger.info("Building configuration analysis completed", {
		address,
		configuration: analysisResult.configuration,
	});

	return analysisResult;
}

// Analyse des tendances de croissance de la zone (remplace analyzeLocalMarket)
async function analyzeAreaGrowthTrends(address) {
	logger.info("Analyzing area growth trends", { address });

	const prompt = `Analyze area growth trends and economic patterns for: ${address}

Focus on emerging business opportunities and economic indicators that would attract growing companies:

Return JSON:
{
  "areaGrowthTrends": "economic patterns benefiting new businesses (job growth, infrastructure, etc.)",
  "nationalIndustryTrend": "broader industry trends affecting this area",
  "boomingIndustry": "high-demand sectors in this region",
  "recentRealEstateNews": "relevant local real estate developments",
  "localTrends": "2-3 sentence summary of local economic conditions",
  "industryGrowth": "industrial market growth summary",
  "areaGrowthScore": numerical_score_1_to_10,
  "demandIndicators": ["economic_factor1", "economic_factor2", "economic_factor3"],
  "competitiveFactors": ["location_advantage1", "location_advantage2"]
}

Focus on factors that would attract emerging, growing companies rather than large corporations.`;

	const response = await callOpenAI(prompt, {
		temperature: 0.3,
		maxTokens: 1000,
		model: "o3-mini",
	});

	const jsonMatch = response.match(/\{[\s\S]*\}/);
	if (!jsonMatch) {
		throw new Error("No JSON found in area growth analysis response");
	}

	const analysisResult = JSON.parse(jsonMatch[0]);

	logger.info("Area growth trends analysis completed", {
		address,
		growthScore: analysisResult.areaGrowthScore,
	});

	return analysisResult;
}

module.exports = {
	analyzePropertyWithAI: analyzePropertyWithAI,
	analyzeBuildingConfigurationWithAI: analyzeBuildingConfiguration,
	analyzeAreaGrowthTrends: analyzeAreaGrowthTrends,
};
