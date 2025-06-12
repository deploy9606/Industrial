const express = require("express");
const demographicsService = require("../services/demographicsService");
const logger = require("../config/logger");

const router = express.Router();

/**
 * GET /api/demographics/:address
 * Obtient les données démographiques pour une adresse donnée
 */
router.get("/:address", async (req, res, next) => {
	try {
		const { address } = req.params;

		if (!address) {
			return res.status(400).json({
				success: false,
				error: "Address parameter is required",
			});
		}

		// Decode l'adresse URL
		const decodedAddress = decodeURIComponent(address);

		logger.info(`Demographics request for address: ${decodedAddress}`);

		const demographics = await demographicsService.getDemographicsForAddress(
			decodedAddress
		);

		res.json({
			success: true,
			data: demographics,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		logger.error("Error in demographics route:", error.message);
		next(error);
	}
});

module.exports = router;
