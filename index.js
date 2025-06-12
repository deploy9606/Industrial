// 9606 Capital AI Tenant Research Tool - Server Entry Point
const app = require("./src/app");

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
	console.log("------------------------------------------------");
	console.log(`🚀 9606 Capital AI Tenant Research Server running on port ${PORT}`);
	console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
	console.log("------------------------------------------------");
});
