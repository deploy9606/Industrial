const express = require("express");
const { openai, gemini } = require("../controllers/proxyController");

const router = express.Router();

// Proxy pour OpenAI
router.post("/openai", openai);

// Proxy pour Gemini
router.post("/gemini", gemini);

module.exports = router;
