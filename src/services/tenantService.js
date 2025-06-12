const logger = require("../config/logger");
const { PROMPT_CONFIG } = require("../utils/constants");
const {
	calculateAIScore,
	calculateOperationalMatch,
	calculateBuildingFit,
} = require("../utils/scoring");
const { callOpenAI, callGemini } = require("./aiApiService");
const { generateAIScoresForTenants } = require("./aiScoringService");

// Nouvelle fonction pour découvrir des locataires moins connus (basée sur le prompt 9606)
async function discoverHiddenTenants(
	propertyData,
	buildingConfig,
	marketAnalysis,
	useAiScoring = true
) {
	logger.info("Discovering emerging companies using 9606 Capital methodology");

	// APPEL IA : Recherche de locataires potentiels moins connus
	const tenantDiscovery = await searchHiddenGemTenants(
		propertyData,
		buildingConfig,
		marketAnalysis
	);

	// Enrichir avec analyse détaillée
	const enrichedTenants = await enrichTenantAnalysis(
		tenantDiscovery.tenants,
		propertyData,
		marketAnalysis
	);

	// Générer les scores avec l'algorithme de base (l'AI scoring sera fait séparément si activé)
	let scoredTenants;

	logger.info("Using algorithmic scoring for base tenant analysis");
	// Utiliser le système de scoring algorithmique de base
	scoredTenants = enrichedTenants.map((tenant) => {
		const scores = calculateTenantScoring(tenant, propertyData, marketAnalysis);

		return {
			...tenant,
			...scores,
			benefitParagraph: generateBenefitParagraph(tenant, propertyData, marketAnalysis),
		};
	});

	// Trier par score final et garder le top 20
	const finalRanking = scoredTenants
		.sort((a, b) => b.score - a.score)
		.slice(0, PROMPT_CONFIG.result_count);

	logger.info(`Discovered ${finalRanking.length} emerging company candidates`);
	return finalRanking;
}

// Recherche de locataires émergents/moins connus
async function searchHiddenGemTenants(propertyData, buildingConfig, marketAnalysis) {
	try {
		logger.info("Searching for emerging and scaling companies");

		const { address, type, squareFootage, features = [] } = propertyData;

		const prompt = `Discover ${Math.max(20, PROMPT_CONFIG.result_count)} ${
			PROMPT_CONFIG.discovery_strategy === "emerging_scaling_companies"
				? "EMERGING and SCALING"
				: "potential"
		} companies (AVOID: ${PROMPT_CONFIG.exclude_companies.join(
			", "
		)}) that could lease this property:

PROPERTY DETAILS:
- Address: ${address}
- Type: ${type}
- Size: ${squareFootage} sq ft
- Configuration: ${buildingConfig.configuration || "Industrial facility"}
- Features: ${features.join(", ") || "Standard industrial"}

AREA GROWTH TRENDS:
- Economic Trends: ${marketAnalysis.areaGrowthTrends || "Growing market"}
- Industry Growth: ${marketAnalysis.nationalIndustryTrend || "Positive trends"}

SEARCH CRITERIA:
- Find companies with operations within ${
			PROMPT_CONFIG.search_radius_miles
		} miles of the property
- Focus on EMERGING, GROWING, SCALING, EXPANDING or MID-SIZED companies
- Strategy: ${PROMPT_CONFIG.discovery_strategy.replace("_", " ")}
- Exclude large corporations (e.g., ${PROMPT_CONFIG.exclude_companies.join(", ")})
- Target industries: ${PROMPT_CONFIG.focus_industries.join(", ")}
- Companies with operational needs matching the building configuration
- Companies benefiting from area economic growth trends

TARGET TYPES:
${PROMPT_CONFIG.target_types.map((type) => `- ${type}`).join("\n")}

For each company, provide detailed AI-generated scoring:
{
  "tenants": [
    {
      "company": "Company Name",
      "nearbyLocation": "specific nearby site/facility (within ${Math.min(
				300,
				PROMPT_CONFIG.search_radius_miles
			)} miles)",
      "distance": "miles from property",
      "operations": "core business description",
      "benefitType": "warehouse_space|office_space|mixed_use|other",
      "industryType": "${PROMPT_CONFIG.focus_industries.join("|")}|Other",
      "aiScoring": {
        "marketFit": "score_1_to_10_based_on_area_growth_and_industry_trends",
        "propertyMatch": "score_1_to_10_based_on_operational_needs_and_building_fit",
        "growthPotential": "score_1_to_10_based_on_capacity_timing_and_competitive_pressure",
        "finalScore": "score_1_to_100_weighted_combination",
        "reasoning": "brief explanation of why this company scores this way"
      }
    }
  ]
}

Focus on: ${PROMPT_CONFIG.target_types.join(", ")}.
Provide at least ${PROMPT_CONFIG.result_count} potential tenants with ${
			PROMPT_CONFIG.tone
		} analysis. 
If you cannot find enough, try to widen the search criteria slightly, or include more significant companies.
Ensure the output is in JSON format. Do not include any other text or explanations outside the JSON structure.
`;

		const response = await callOpenAI(prompt, {
			temperature: 0.3,
			maxTokens: 3000,
		});

		const jsonMatch = response.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error("No JSON found in tenant discovery response");
		}

		const discoveryResult = JSON.parse(jsonMatch[0]);

		logger.info(
			`Discovered ${discoveryResult.tenants?.length || 0} potential emerging companies`
		);
		return discoveryResult;
	} catch (error) {
		logger.error("Emerging company search failed:", error);
		throw error;
	}
}

// Enrichir l'analyse des locataires avec plus de détails
async function enrichTenantAnalysis(tenants, propertyData, marketAnalysis) {
	try {
		logger.info("Enriching tenant analysis with detailed insights");

		const enrichedTenants = tenants.map((tenant) => {
			return {
				...tenant,
				// Insights spécifiques à la propriété (métriques de base seulement)
				strategicFit: calculateStrategicFit(tenant, propertyData),
				marketTiming: calculateMarketTiming(tenant, marketAnalysis),
				competitivePressure: calculateCompetitivePressure(tenant),
			};
		});

		return enrichedTenants;
	} catch (error) {
		logger.error("Tenant enrichment failed:", error);
		return tenants;
	}
}

// Calcul du scoring simplifié et intelligent avec variation
function calculateTenantScoring(tenant, propertyData, marketAnalysis) {
	// Score 1: Market Fit (croissance de zone + industrie) avec variation par entreprise
	const baseMarketScore = Math.min(10, Math.max(1, marketAnalysis?.areaGrowthScore || 7));
	const industryScore = calculateIndustryGrowthScore(tenant.industryType);
	const companyVariation = (tenant.company.length % 3) + 1; // Variation basée sur le nom
	const marketFit = Math.min(
		10,
		Math.max(3, Math.round((baseMarketScore + industryScore + companyVariation) / 3))
	);

	// Score 2: Property Match (adéquation opérationnelle + bâtiment) avec logique métier
	const operationalScore = calculateOperationalMatch(tenant.company, propertyData);
	const buildingScore = calculateBuildingFitScore(tenant, propertyData);
	const distanceBonus = calculateDistanceBonus(tenant.distance);
	const propertyMatch = Math.min(
		10,
		Math.max(2, Math.round((operationalScore + buildingScore + distanceBonus) / 3))
	);

	// Score 3: Growth Potential avec vraie différenciation
	const capacityScore = calculateCapacityMatch(tenant, propertyData);
	const timingScore = calculateMarketTiming(tenant, marketAnalysis);
	const competitiveScore = calculateCompetitivePressure(tenant);
	const growthPotential = Math.min(
		10,
		Math.max(1, Math.round((capacityScore + timingScore + competitiveScore) / 3))
	);

	// Score Final Intelligent (pondéré selon l'importance business) - C'est le score unique affiché
	const finalScore = Math.round(
		(marketFit * 0.35 + propertyMatch * 0.4 + growthPotential * 0.25) * 10
	); // Score sur 100 directement

	return {
		marketFit,
		propertyMatch,
		growthPotential,
		score: Math.min(95, Math.max(15, finalScore)), // Score final sur 100 (remplace likelihood ET globalScore)
	};
}

// Génération du paragraphe de bénéfices selon le format du prompt
function generateBenefitParagraph(tenant, propertyData, marketAnalysis) {
	const { address, squareFootage } = propertyData;
	const { company, nearbyLocation } = tenant;

	const features =
		propertyData.features?.slice(0, 2).join(" and ") || "modern facilities";
	const areaGrowth = marketAnalysis.areaGrowthTrends || "positive economic trends";
	const nationalTrend = marketAnalysis.nationalIndustryTrend || "industry growth";

	return `The property at ${address} benefits ${company} by offering ${squareFootage} sq ft of ${
		tenant.benefitType?.replace("_", " ") || "industrial space"
	} with ${features}, addressing operational needs near ${nearbyLocation}. With ${areaGrowth} and ${nationalTrend}, it provides operational advantages and strategic positioning, making it a top fit among 50 properties.`;
}

// Calculs pour l'enrichissement
function calculateStrategicFit(tenant, propertyData) {
	// Score basé sur l'adéquation stratégique
	let score = 5; // Base score

	// Score basé sur la distance seulement
	if (tenant.distance && parseInt(tenant.distance) < 50) score += 2;
	else if (tenant.distance && parseInt(tenant.distance) < 100) score += 1;

	return Math.min(10, score);
}

function calculateMarketTiming(tenant, marketAnalysis) {
	// Score basé sur le timing du marché avec plus de variation
	let score = 4; // Base score réduite

	// Bonus selon la croissance de la zone
	if (marketAnalysis.areaGrowthScore >= 8) score += 4;
	else if (marketAnalysis.areaGrowthScore >= 6) score += 2;
	else if (marketAnalysis.areaGrowthScore >= 4) score += 1;

	// Bonus selon le type d'industrie et timing
	if (tenant.industryType === "3PL") score += 2; // Logistique en forte demande
	else if (tenant.industryType === "Tech") score += 3; // Tech très dynamique
	else if (tenant.industryType === "Food") score += 1;

	// Variation basée sur la localisation
	const locationBonus = tenant.nearbyLocation?.includes("hub") ? 1 : 0;

	return Math.min(10, score + locationBonus);
}

function calculateCompetitivePressure(tenant) {
	// Score basé sur la pression concurrentielle avec vraie différenciation
	let score = 3; // Base score réduite

	// Secteurs très compétitifs = plus de pression = score plus élevé
	if (tenant.industryType === "3PL") score += 3; // Secteur très compétitif
	else if (tenant.industryType === "Tech") score += 4; // Secteur ultra-compétitif
	else if (tenant.industryType === "Food") score += 2;
	else if (tenant.industryType === "Manufacturing") score += 1;

	// Bonus basé sur les opérations (plus c'est spécialisé, plus c'est compétitif)
	if (
		tenant.operations?.includes("distribution") ||
		tenant.operations?.includes("logistics")
	)
		score += 2;
	if (
		tenant.operations?.includes("manufacturing") ||
		tenant.operations?.includes("assembly")
	)
		score += 1;
	if (tenant.operations?.includes("tech") || tenant.operations?.includes("software"))
		score += 3;

	// Variation basée sur la distance (plus proche = plus de pression)
	const distance = parseInt(tenant.distance) || 50;
	if (distance < 20) score += 2;
	else if (distance < 40) score += 1;

	return Math.min(10, score);
}

// Nouvelle fonction pour bonus de distance
function calculateDistanceBonus(distance) {
	const dist = parseInt(distance) || 50;
	if (dist <= 15) return 9; // Très proche
	if (dist <= 30) return 7; // Proche
	if (dist <= 50) return 5; // Moyen
	if (dist <= 75) return 3; // Loin
	return 1; // Très loin
}

// Fonction pour calculer la correspondance de capacité
function calculateCapacityMatch(tenant, propertyData) {
	let score = 4; // Base score

	const propertySize = propertyData.squareFootage || 0;

	// Score basé sur l'industrie et les besoins de capacité
	if (tenant.industryType === "3PL") {
		if (propertySize >= 100000) score += 4; // 3PL a besoin de beaucoup d'espace
		else if (propertySize >= 50000) score += 2;
		else score += 1;
	} else if (tenant.industryType === "Manufacturing") {
		if (propertySize >= 75000) score += 3; // Manufacturing besoin d'espace moyen-élevé
		else if (propertySize >= 40000) score += 2;
		else score += 1;
	} else if (tenant.industryType === "Tech") {
		if (propertySize >= 25000 && propertySize <= 100000)
			score += 3; // Tech besoin modéré mais qualité
		else if (propertySize >= 15000) score += 2;
		else score += 1;
	} else if (tenant.industryType === "Food") {
		if (propertySize >= 60000) score += 3; // Food distribution besoin d'espace
		else if (propertySize >= 30000) score += 2;
		else score += 1;
	}

	// Bonus pour les opérations spécifiques
	if (tenant.operations?.includes("distribution") && propertySize >= 80000) score += 2;
	if (tenant.operations?.includes("warehouse") && propertySize >= 60000) score += 1;
	if (tenant.operations?.includes("assembly") && propertySize >= 40000) score += 1;

	return Math.min(10, score);
}

function calculateIndustryGrowthScore(industryType) {
	const growthScores = {
		"3PL": 9, // Logistique en pleine expansion
		Tech: 10, // Tech = croissance maximale
		Food: 6, // Alimentaire stable mais croissance modérée
		Manufacturing: 5, // Industrie traditionnelle
		Retail: 4, // Commerce en difficulté
		Other: 5, // Par défaut
	};
	return growthScores[industryType] || 5;
}

function calculateBuildingFitScore(tenant, propertyData) {
	let score = 2; // Base score réduite pour plus de variation

	// Correspondance du type de bâtiment (plus important)
	if (tenant.benefitType === "warehouse_space" && propertyData.type === "warehouse") {
		score += 5; // Correspondance parfaite
	} else if (tenant.benefitType === "mixed_use") {
		score += 3; // Flexible
	} else if (tenant.benefitType === "office_space" && propertyData.type === "warehouse") {
		score += 1; // Peut être aménagé
	}

	// Bonus basé sur la taille de propriété (plus spécifique)
	const propertySize = propertyData.squareFootage || 0;
	if (propertySize >= 100000 && propertySize <= 200000) {
		score += 3; // Taille optimale pour la plupart des entreprises
	} else if (propertySize >= 50000 && propertySize <= 300000) {
		score += 2; // Taille acceptable
	} else if (propertySize >= 25000 && propertySize <= 500000) {
		score += 1; // Taille possible
	}

	// Bonus selon le type d'industrie et besoins spécifiques
	if (tenant.industryType === "3PL" && propertySize >= 100000) score += 2; // 3PL a besoin d'espace
	if (tenant.industryType === "Food" && propertyData.features?.includes("cold"))
		score += 3; // Froid pour alimentaire
	if (tenant.industryType === "Manufacturing" && propertySize >= 75000) score += 2; // Manufacturing besoin d'espace

	return Math.min(10, score);
}

// Calcul simple de capacité pour nouveaux locataires
function calculateCapacityMatch(tenant, propertyData) {
	const propertySize = propertyData.squareFootage || 0;

	// Scoring basé sur des tailles génériques par industrie
	const industryRanges = {
		"3PL": { min: 50000, max: 300000 },
		Manufacturing: { min: 25000, max: 200000 },
		Food: { min: 30000, max: 150000 },
		Tech: { min: 20000, max: 100000 },
		Retail: { min: 40000, max: 250000 },
	};

	const range = industryRanges[tenant.industryType] || { min: 30000, max: 200000 };

	if (propertySize >= range.min && propertySize <= range.max) {
		return 9; // Perfect fit
	} else if (propertySize >= range.min * 0.7 && propertySize <= range.max * 1.3) {
		return 7; // Good fit
	} else {
		return 5; // Moderate fit
	}
}

module.exports = {
	discoverHiddenTenants: discoverHiddenTenants,
	searchHiddenGemTenants: searchHiddenGemTenants,
	enrichTenantAnalysis: enrichTenantAnalysis,
	calculateTenantScoring: calculateTenantScoring,
	generateBenefitParagraph: generateBenefitParagraph,
	calculateCapacityMatch: calculateCapacityMatch,
};
