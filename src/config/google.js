const { google } = require("googleapis");
const logger = require("./logger");

let docs, drive;

function initializeGoogleAPI() {
	try {
		if (
			!process.env.GOOGLE_CLIENT_ID ||
			!process.env.GOOGLE_CLIENT_SECRET ||
			!process.env.GOOGLE_REFRESH_TOKEN
		) {
			logger.warn("Google API credentials not found in environment variables");
			console.log("⚠️ Google API setup skipped - credentials not configured");
			return { docs: null, drive: null };
		}

		const oauth2Client = new google.auth.OAuth2(
			process.env.GOOGLE_CLIENT_ID,
			process.env.GOOGLE_CLIENT_SECRET,
			"http://localhost:8080/auth/callback"
		);
		oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
		docs = google.docs({ version: "v1", auth: oauth2Client });
		drive = google.drive({ version: "v3", auth: oauth2Client });

		logger.info("Google API successfully initialized");
		return { docs, drive };
	} catch (err) {
		logger.error("Google API setup error", { error: err.message, stack: err.stack });
		console.log("❌ Google API setup failed - continuing without docs integration");
		return { docs: null, drive: null };
	}
}

module.exports = {
	initializeGoogleAPI,
	getDocs: () => docs,
	getDrive: () => drive,
};
