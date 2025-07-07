const express = require("express");
const { getInvestmentRecommendation} = require("../services/investmentRecommendationService");
const logger = require("../config/logger");

const router = express.Router();

/**
 * GET /api/developmentData/:address
 * 
 */
router.post("/", async (req, res) => {
	try {
		const { propertyAddress, propertyType, buildingSize, askingPrice } = req.body;

		// Validation des données requises
		if (!propertyAddress || propertyAddress.trim() === "") {
			return res.status(400).json({
				error: "Property address is required",
				code: "MISSING_ADDRESS",
			});
		}

		logger.info("Investment Recommendation request", {
			propertyAddress,
			propertyType,
			buildingSize,
            askingPrice,
		});

		// Estimer le building rate
		const estimation = await getInvestmentRecommendation(
			propertyAddress,
			propertyType,
			buildingSize,
            askingPrice
		);
		

		res.json({
			success: true,
			data: estimation,
			timestamp: new Date().toISOString(),
		});
		
	} catch (error) {
		logger.error("Investment Recommendation analysis failed", {
			error: error.message,
			stack: error.stack,
		});

		res.status(500).json({
			error: "Error Analyzing Investment Recommendation",
			message: error.message,
			code: "ESTIMATION_FAILED",
		});
	}
});

module.exports = router;



