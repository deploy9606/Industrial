const logger = require("../config/logger");

// Middleware de gestion d'erreurs
function errorHandler(err, req, res, next) {
	// Log l'erreur avec des détails contextuels
	logger.error("Unhandled error caught by middleware", {
		error: err.message,
		stack: err.stack,
		url: req.url,
		method: req.method,
		userAgent: req.get("User-Agent"),
		ip: req.ip || req.connection.remoteAddress,
		timestamp: new Date().toISOString(),
		body: req.body,
		params: req.params,
		query: req.query,
		statusCode: err.status || 500,
	});

	// Réponse d'erreur générique
	const isDevelopment = process.env.NODE_ENV === "development";

	res.status(err.status || 500).json({
		error: err.message || "Internal Server Error",
		timestamp: new Date().toISOString(),
		path: req.path,
		...(isDevelopment && { stack: err.stack }),
	});
}

// Middleware pour les routes non trouvées
function notFoundHandler(req, res) {
	logger.warn("Route not found", {
		path: req.path,
		method: req.method,
		userAgent: req.get("User-Agent"),
		ip: req.ip || req.connection.remoteAddress,
		timestamp: new Date().toISOString(),
	});

	res.status(404).json({
		error: "Route not found",
		path: req.path,
		method: req.method,
		timestamp: new Date().toISOString(),
	});
}

module.exports = {
	errorHandler,
	notFoundHandler,
};
