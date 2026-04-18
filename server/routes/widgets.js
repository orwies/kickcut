'use strict';

const express = require('express');
const GeminiBot = require('../services/GeminiBot');
const router = express.Router();

let cachedFact = null;
let factTimestamp = 0;

router.get('/fact', async (req, res) => {
  try {
    const now = Date.now();
    // Cache for 1 hour (3600000 ms)
    if (cachedFact && (now - factTimestamp < 3600000)) {
      return res.json({ fact: cachedFact });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const kickbot = new GeminiBot(apiKey);
    
    // We get the fact directly
    const fact = await kickbot.ask("Give me a short, fascinating random football (soccer) fact. Only reply with the fact and no conversational text.");
    
    // Only cache if it didn't fail
    if (!fact.includes("Sorry, I couldn't answer that right now")) {
      cachedFact = fact;
      factTimestamp = now;
    }
    
    res.json({ fact });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
