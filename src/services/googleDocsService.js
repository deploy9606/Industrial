const { getDocs, getDrive } = require("../config/google");
const logger = require("../config/logger");

async function saveToGoogleDocs(data, title = "Analysis Report") {
	try {
		const docs = getDocs();
		const drive = getDrive();

		if (!docs || !drive) {
			throw new Error("Google Docs API not initialized");
		}

		// Create a new document
		const doc = await docs.documents.create({
			requestBody: {
				title: title,
			},
		});

		const documentId = doc.data.documentId;

		// Add content to the document
		const content = formatContentForDocs(data);

		await docs.documents.batchUpdate({
			documentId: documentId,
			requestBody: {
				requests: [
					{
						insertText: {
							location: { index: 1 },
							text: content,
						},
					},
				],
			},
		});

		const result = { 
			documentId, 
			url: `https://docs.google.com/document/d/${documentId}` 
		};

		return result;
	} catch (error) {
		logger.error("Google Docs save failed", {
			error: error.message,
			title: title,
		});
		throw error;
	}
}

function formatContentForDocs(data) {
	if (typeof data === "string") {
		return data;
	}

	if (typeof data === "object") {
		return JSON.stringify(data, null, 2);
	}

	return String(data);
}

module.exports = {
	saveToGoogleDocs,
};
