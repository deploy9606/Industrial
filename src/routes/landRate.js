const express = require("express");
const { estimateLandRate, estimateLandRateOpenAI } = require("../services/landRateService");
const logger = require("../config/logger");

const router = express.Router();

/**
 * POST /api/building-rate/estimate-land
 * Estime le building rate basé sur l'adresse de la propriété
 */
router.post("/estimate-land", async (req, res) => {
    try {
        const { propertyAddress, propertyType, buildingSize } = req.body;

        // Validation des données requises
        if (!propertyAddress || propertyAddress.trim() === "") {
            return res.status(400).json({
                error: "Property address is required",
                code: "MISSING_ADDRESS",
            });
        }

        logger.info("Land rate estimation request", {
            propertyAddress,
            propertyType,
            buildingSize,
        });

        // Estimer le building rate
        const estimation = await estimateLandRate(
            propertyAddress,
            propertyType,
            buildingSize
        );
        const estimationOpenAI = await estimateLandRateOpenAI(
            propertyAddress,
            propertyType,
            buildingSize
        );	

        res.json({
            success: true,
            data: estimation,
            dataOpenAI: estimationOpenAI,
            timestamp: new Date().toISOString(),
        });
        console.log("FFF", estimation);
    } catch (error) {
        logger.error("Land rate estimation failed", {
            error: error.message,
            stack: error.stack,
        });

        res.status(500).json({
            error: "Error estimating land rate",
            message: error.message,
            code: "ESTIMATION_FAILED",
        });
    }
});

module.exports = router;
