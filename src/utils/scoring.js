const { SCORING_WEIGHTS } = require("./constants");

// Calculer le score selon les critères du prompt IA
function calculateAIScore(tenant) {
	const scores = {
		area_growth_trends: tenant.areaGrowthMatch || 5,
		operational_needs_match: tenant.operationalMatch || 5,
		capacity_requirements: tenant.capacityMatch || 5,
		industry_growth: tenant.industryGrowthMatch || 5,
		building_fit: tenant.buildingFitMatch || 5,
	};

	return Object.entries(scores).reduce((total, [key, value]) => {
		return total + value * (SCORING_WEIGHTS[key] || 1);
	}, 0);
}

// Calculer l'adéquation opérationnelle
function calculateOperationalMatch(company, propertyData) {
	let score = 5;

	// Ajustements basés sur le type de propriété et l'entreprise
	if (
		company.toLowerCase().includes("amazon") ||
		company.toLowerCase().includes("fedex")
	) {
		if (propertyData.type === "warehouse") score += 2;
		if (propertyData.squareFootage > 50000) score += 1;
	}

	if (
		company.toLowerCase().includes("walmart") ||
		company.toLowerCase().includes("sysco")
	) {
		if (propertyData.type === "cold-storage") score += 3;
		if (propertyData.squareFootage > 25000) score += 1;
	}

	return Math.min(10, score);
}

// Calculer l'adéquation du bâtiment
function calculateBuildingFit(company, propertyData) {
	let score = 6;

	// Score basé sur les caractéristiques du bâtiment
	if (propertyData.features.some((f) => f.toLowerCase().includes("rail"))) score += 2;
	if (propertyData.features.some((f) => f.toLowerCase().includes("highway"))) score += 1;
	if (propertyData.squareFootage > 100000) score += 1;

	return Math.min(10, score);
}

module.exports = {
	calculateAIScore,
	calculateOperationalMatch,
	calculateBuildingFit,
};
