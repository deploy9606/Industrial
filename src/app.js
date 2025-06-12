const express = require("express");
const cors = require("cors");
const path = require("path");

// Configuration de l'environnement
require("dotenv").config({
	path: path.resolve(__dirname, "../.env"),
});

// Imports des modules
const { initializeGoogleAPI } = require("./config/google");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const logger = require("./config/logger");
const progressService = require("./services/progressService");
logger.info("Starting 9606 Capital AI Tenant Research Server...");

// Imports des routes
const configRoutes = require("./routes/config");
const proxyRoutes = require("./routes/proxy");
const tenantResearchRoutes = require("./routes/tenantResearch");
const demographicsRoutes = require("./routes/demographics");
const industrialRoutes = require("./routes/industrial");

// Créer l'application Express
const app = express();

// Middleware de logging des requêtes
app.use((req, res, next) => {
	const startTime = Date.now();

	// Log une seule fois quand la réponse est terminée
	res.on("finish", () => {
		const duration = Date.now() - startTime;
		const timestamp = new Date().toLocaleString();

		let logMessage = `${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`;

		// Ajouter l'erreur si le status code indique une erreur
		if (res.statusCode >= 400) {
			logMessage += ` - ERROR: ${res.statusMessage || "Error occurred"}`;
			logger.info(logMessage, {
				timestamp,
				method: req.method,
				path: req.path,
				statusCode: res.statusCode,
				duration: `${duration}ms`,
				...(res.statusCode >= 400 && {
					error: {
						message: res.statusMessage || "Error occurred",
						stack: res.stack || "No stack trace available",
						body: req.body || {},
						params: req.params || {},
					},
				}),
			});
		} else {
			logger.info(logMessage);
		}
	});

	next();
});

// Middleware de base
app.use(cors());
app.use(express.json());

// Initialiser l'API Google
initializeGoogleAPI();

// Routes principales
app.use("/api/config", configRoutes);
app.use("/proxy", proxyRoutes);
app.use("/api/tenant-research", tenantResearchRoutes);
app.use("/api/demographics", demographicsRoutes);
app.use("/api/industrial", industrialRoutes);

// Route de santé
app.get("/health", (req, res, next) => {
	res.json({
		status: "OK",
		timestamp: new Date().toISOString(),
		service: "9606 Capital AI Tenant Research Server",
	});
});

// Middleware de gestion d'erreurs
app.use(notFoundHandler);
app.use(errorHandler);

// Nettoyage de sécurité moins fréquent (toutes les 30 minutes)
// La plupart des sessions sont maintenant supprimées automatiquement après 2 minutes
setInterval(() => {
	progressService.cleanup();
}, 30 * 60 * 1000);

module.exports = app;
