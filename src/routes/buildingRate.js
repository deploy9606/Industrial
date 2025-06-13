const express = require("express");
const { estimateBuildingRate } = require("../services/buildingRateService");
const logger = require("../config/logger");

const router = express.Router();

/**
 * POST /api/building-rate/estimate
 * Estime le building rate basé sur l'adresse de la propriété
 */
router.post("/estimate", async (req, res) => {
	try {
		const { propertyAddress, propertyType, buildingSize } = req.body;

		// Validation des données requises
		if (!propertyAddress || propertyAddress.trim() === "") {
			return res.status(400).json({
				error: "Property address is required",
				code: "MISSING_ADDRESS",
			});
		}

		logger.info("Building rate estimation request", {
			propertyAddress,
			propertyType,
			buildingSize,
		});

		// Estimer le building rate
		const estimation = await estimateBuildingRate(
			propertyAddress,
			propertyType,
			buildingSize
		);

		res.json({
			success: true,
			data: estimation,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		logger.error("Building rate estimation failed", {
			error: error.message,
			stack: error.stack,
		});

		res.status(500).json({
			error: "Error estimating building rate",
			message: error.message,
			code: "ESTIMATION_FAILED",
		});
	}
});

module.exports = router;
