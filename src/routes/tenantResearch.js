const express = require("express");
const router = express.Router();

const progressService = require("../services/progressService");
const logger = require("../config/logger");

/**
 * GET /api/tenant-research/progress/:sessionId
 * Endpoint pour récupérer l'état de progression actuel (polling)
 */
router.get("/progress/:sessionId", (req, res) => {
	const { sessionId } = req.params;

	const progress = progressService.getProgress(sessionId);

	if (!progress) {
		return res.status(404).json({
			error: "Session not found",
			sessionId,
		});
	}

	res.json({
		success: true,
		progress,
		sessionId,
		timestamp: new Date().toISOString(),
	});
});

/**
 * POST /api/tenant-research/analyze-9606
 * Nouvelle analyse 9606 Capital - Découverte de locataires émergents
 * Retour JSON structuré selon le prompt IA fourni
 */
router.post("/analyze-9606", async (req, res, next) => {
	try {
		const { propertyData, withProgress = false, sessionId } = req.body;

		// Validation des champs requis
		if (!propertyData || !propertyData.address || !propertyData.type) {
			return res.status(400).json({
				error: "Missing required fields",
				required: ["propertyData.address", "propertyData.type"],
				received: propertyData,
			});
		}

		logger.info(`Starting 9606 Capital analysis for: ${propertyData.address}`);

		// Utiliser le sessionId fourni par le client s'il est disponible
		let finalSessionId = null;
		if (withProgress && sessionId) {
			finalSessionId = sessionId;
			logger.info(`Using client-provided sessionId: ${finalSessionId}`);
			// Créer la session de progression avec le bon nombre d'étapes basé sur propertyData
			const useAiScoring = propertyData.use_ai_scoring || false;
			progressService.createSession(finalSessionId, useAiScoring);
		}

		// Utiliser le nouveau service d'analyse IA
		const { analyzePropertyWithAI } = require("../services/aiAnalysisService");

		const analysisResults = await analyzePropertyWithAI(propertyData, finalSessionId);

		// Si un sessionId est fourni, marquer comme terminé
		if (finalSessionId) {
			progressService.completeSession(finalSessionId, "analysis_complete");
		}

		// Format JSON structuré selon le prompt 9606 Capital et compatible avec le front-end
		const structuredResponse = {
			// Analyse de propriété pour compatibilité front-end
			propertyAnalysis: {
				configuration: analysisResults.propertyAnalysis.configuration,
				marketFit:
					analysisResults.propertyAnalysis.marketFit ||
					"Propriété adaptée aux besoins industriels",
				keyFeatures:
					analysisResults.propertyAnalysis.keyFeatures ||
					analysisResults.propertyAnalysis.propertyFeatures?.join(", ") ||
					"Caractéristiques industrielles standard",
				propertyFeatures: analysisResults.propertyAnalysis.propertyFeatures || [],
				briefPropertyInfo: analysisResults.propertyAnalysis.briefPropertyInfo || "",
			},

			// Analyse de marché - compatible avec l'interface MarketAnalysis du front-end
			marketContext: {
				// Propriétés attendues par le front-end
				localTrends:
					analysisResults.marketAnalysis.localTrends ||
					analysisResults.marketAnalysis.areaGrowthTrends,
				industryGrowth:
					analysisResults.marketAnalysis.industryGrowth ||
					analysisResults.marketAnalysis.nationalIndustryTrend,
				areaGrowthScore: analysisResults.marketAnalysis.areaGrowthScore || 7,
				demandIndicators: analysisResults.marketAnalysis.demandIndicators || [
					"Croissance industrielle",
					"Demande logistique",
				],
				// Propriétés spécifiques au prompt 9606 Capital
				areaGrowthTrends: analysisResults.marketAnalysis.areaGrowthTrends,
				nationalIndustryTrend: analysisResults.marketAnalysis.nationalIndustryTrend,
				boomingIndustry: analysisResults.marketAnalysis.boomingIndustry,
				recentRealEstateNews: analysisResults.marketAnalysis.recentRealEstateNews,
				competitiveFactors: analysisResults.marketAnalysis.competitiveFactors || [],
			},

			// Top 20 locataires découverts (entreprises émergentes)
			tenantRanking: analysisResults.tenantRanking.map((tenant) => ({
				// Informations de base de l'entreprise
				company: tenant.company,
				contact_info: tenant.contact_info,
				operations: tenant.operations,
				score: tenant.score || 50, // Score unifié qui remplace likelihood et globalScore

				// Localisation et proximité
				nearbyLocation: tenant.nearbyLocation,
				distance: tenant.distance,

				benefitType: tenant.benefitType,
				industryType: tenant.industryType,

				// 3 Scores détaillés pour l'analyse (optionnels à afficher)
				marketFit: tenant.marketFit || 0, // Croissance zone + industrie
				propertyMatch: tenant.propertyMatch || 0, // Adéquation opérationnelle + bâtiment
				growthPotential: tenant.growthPotential || 0, // Capacité + timing + pression concurrentielle

				// Données de scoring IA (nouvelles propriétés)
				aiReasoning: tenant.aiReasoning || null, // Explication du scoring par IA
				keyStrengths: tenant.keyStrengths || [], // Points forts identifiés par IA
				riskFactors: tenant.riskFactors || [], // Facteurs de risque identifiés par IA

				benefitParagraph: tenant.benefitParagraph,
			})),

			// Métadonnées de l'analyse
			metadata: {
				...analysisResults.metadata,
				totalCandidatesAnalyzed: analysisResults.tenantRanking.length,
				rankingCriteria: [
					"area_growth_trends",
					"operational_needs_match",
					"capacity_requirements",
					"industry_growth",
					"building_fit",
				],
				focusStrategy: "emerging_companies",
				contactInfo: "9606 Capital - Contact for leasing details",
				// Informations sur le scoring IA depuis propertyData
				aiScoringEnabled: propertyData.use_ai_scoring || false,
				tenantsWithAIScoring: analysisResults.tenantRanking.filter((t) => t.aiReasoning)
					.length,
			},
		};

		logger.info(
			`Completed 9606 Capital analysis for ${propertyData.address} - Found ${analysisResults.tenantRanking.length} emerging company candidates`
		);

		res.json({
			success: true,
			data: structuredResponse,
			timestamp: new Date().toISOString(),
			version: "9606_v2.0",
			sessionId: finalSessionId, // Inclure le sessionId dans la réponse
		});
	} catch (error) {
		logger.error("Error in 9606 Capital analysis:", error);

		// En cas d'erreur, notifier via le service de progression si applicable
		if (req.body.withProgress && req.body.sessionId) {
			progressService.errorSession(req.body.sessionId, error);
		}

		next(error);
	}
});

module.exports = router;
