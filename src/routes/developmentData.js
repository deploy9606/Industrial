const express = require("express");
const { getDevelopmentData} = require("../services/developmentDataService");
const logger = require("../config/logger");

const router = express.Router();

/**
 * GET /api/developmentData/:address
 * 
 */
router.post("/", async (req, res) => {
	try {
		const { propertyAddress, propertyType, buildingSize } = req.body;

		// Validation des données requises
		if (!propertyAddress || propertyAddress.trim() === "") {
			return res.status(400).json({
				error: "Property address is required",
				code: "MISSING_ADDRESS",
			});
		}

		logger.info("Development Data request", {
			propertyAddress,
			propertyType,
			buildingSize,
		});

		// Estimer le building rate
		const estimation = await getDevelopmentData(
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
		logger.error("Development data analysis failed", {
			error: error.message,
			stack: error.stack,
		});

		res.status(500).json({
			error: "Error Analyzing development data",
			message: error.message,
			code: "ESTIMATION_FAILED",
		});
	}
});

module.exports = router;



