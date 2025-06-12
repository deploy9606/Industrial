// Configuration basée sur le prompt IA 9606 Capital - Version Emerging Companies
let PROMPT_CONFIG = {
	focus:
		"AI-driven building configuration analysis, discover emerging companies (non-Fortune 500 tenants) based on property characteristics and area economic trends",
	// Stratégie unifiée de découverte/croissance
	discovery_strategy: "emerging_scaling_companies", // Fusion de discovery_strategy et growth_stage
	exclude_companies: ["Amazon", "Walmart", "FedEx", "UPS", "Home Depot", "Lowe's"], // Éviter les grandes entreprises
	target_types: [
		"Regional 3PL providers",
		"Growing food distributors",
		"Emerging manufacturers",
		"Tech companies needing warehouses",
		"Regional retail distributors",
		"Specialty logistics providers",
	],
	search_radius_miles: 1500, // Augmenter le rayon de recherche pour couvrir plus de zones
	result_count: 20,
	ranking_criteria: [
		"area_growth_trends",
		"operational_needs_match",
		"capacity_requirements",
		"industry_growth",
		"building_fit",
	],
	tone: "analytical, data-driven, precise",
	// Nouveaux critères pour les entreprises émergentes
	preferred_company_size: "emerging_to_midsize", // Éviter les géants
	focus_industries: ["3PL", "Manufacturing", "Food", "Tech", "Retail"],
	// Note: use_ai_scoring retiré - maintenant passé via propertyData
};

// Critères de scoring selon le prompt IA
const SCORING_WEIGHTS = {
	area_growth_trends: 10,
	operational_needs_match: 10,
	capacity_requirements: 10,
	industry_growth: 10,
	building_fit: 10,
};

const DEFAULT_CONFIG = {
	focus:
		"AI-driven building configuration analysis, discover emerging companies (non-Fortune 500 tenants) based on property characteristics and area economic trends",
	discovery_strategy: "emerging_scaling_companies",
	exclude_companies: ["Amazon", "Walmart", "FedEx", "UPS", "Home Depot", "Lowe's"],
	target_types: [
		"Regional 3PL providers",
		"Growing food distributors",
		"Emerging manufacturers",
		"Tech companies needing warehouses",
		"Regional retail distributors",
		"Specialty logistics providers",
	],
	search_radius_miles: 100,
	result_count: 20,
	ranking_criteria: [
		"area_growth_trends",
		"operational_needs_match",
		"capacity_requirements",
		"industry_growth",
		"building_fit",
	],
	tone: "analytical, data-driven, precise",
	preferred_company_size: "emerging_to_midsize",
	focus_industries: ["3PL", "Manufacturing", "Food", "Tech", "Retail"],
};

module.exports = {
	PROMPT_CONFIG,
	SCORING_WEIGHTS,
	DEFAULT_CONFIG,
};
