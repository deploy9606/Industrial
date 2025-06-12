const winston = require("winston");
require("winston-daily-rotate-file");

// Configuration pour la rotation des logs en production
const createRotatingTransport = (filename, level = "info") => {
	return new winston.transports.DailyRotateFile({
		filename: `logs/${filename}-%DATE%.log`,
		datePattern: "YYYY-MM-DD",
		zippedArchive: false, // Ne pas compresser - supprimer directement
		maxSize: "10m", // Taille max par fichier : 10MB
		maxFiles: "3d", // Garder les logs pendant seulement 3 jours puis supprimer
		level: level,
	});
};

// Logger configuration
const logger = winston.createLogger({
	level: process.env.NODE_ENV === "production" ? "error" : "info",
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.errors({ stack: true }),
		winston.format.json()
	),
	transports: [
		// Console transport (toujours actif)
		new winston.transports.Console({
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.simple(),
				winston.format.printf(({ timestamp, level, message, ...meta }) => {
					const formattedTimestamp = new Date(timestamp).toLocaleString();
					let log = `${formattedTimestamp} [${level}]: ${message}`;
					if (Object.keys(meta).length > 0) {
						log += `\n${JSON.stringify(meta, null, 2)}`;
					}
					return log;
				})
			),
		}),
	],
});

// Configuration différente selon l'environnement
if (process.env.NODE_ENV === "production") {
	// En production : rotation des logs avec limites strictes
	logger.add(createRotatingTransport("error", "error"));
	logger.add(createRotatingTransport("combined", "info"));
} else {
	// En développement : logs simples avec rotation pour éviter l'accumulation
	logger.add(
		new winston.transports.File({
			filename: "error.log",
			level: "error",
			maxsize: 2097152, // 2MB max
			maxFiles: 2, // Garder seulement 2 fichiers
		})
	);
	logger.add(
		new winston.transports.File({
			filename: "combined.log",
			level: "info",
			maxsize: 2097152, // 2MB max
			maxFiles: 2, // Garder seulement 2 fichiers
		})
	);
}

module.exports = logger;
