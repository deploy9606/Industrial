const express = require("express");
const { estimateMarketData} = require("../services/marketDataService");
const logger = require("../config/logger");

const router = express.Router();

/**
 * GET /api/industrial/:address
 * Obtient les données industrielles pour une adresse donnée
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

		logger.info(`Market data request for address: ${decodedAddress}`);

		const marketData = await estimateMarketData(
			decodedAddress
		);

		if (!marketData) {
			return res.status(404).json({
				success: false,
				error: "No market data available for this location",
			});
		}

		res.json({
			success: true,
			data: marketData,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		logger.error("Error in market data route:", error.message);
		next(error);
	}
});

module.exports = router;
