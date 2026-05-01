'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');

const SYSTEM_PROMPT = `You are KickBot, an expert AI football analyst embedded inside KickCut — a football highlights platform.
You answer questions about football players, teams, tactics, history, transfer news, competitions and statistics.
Keep answers concise (3-4 sentences max), enthusiastic and insightful.
Use football terminology naturally. Feel free to use emojis.
If asked something unrelated to football, say: "I only talk football! Ask me something about the beautiful game ⚽"`;

const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash'
];

class GeminiBot {
  /**
   * Initializes the GeminiBot service.
   * Gets an API key string.
   * Configures the GoogleGenerativeAI instance if the key is valid, otherwise disables the bot.
   * Returns the initialized bot object.
   */
  constructor(apiKey) {
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      this.enabled = false;
      console.log('[KickBot] No Gemini API key set');
      return;
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.enabled = true;
    console.log('[KickBot] Ready ⚽');
  }

  /**
   * Sends a user question to the Gemini API and retrieves an AI response.
   * Receives the question string.
   * Iterates through fallback models attempting to generate content based on the SYSTEM_PROMPT.
   * Returns the generated answer string, or an error/unavailable message if all models fail.
   */
  async ask(question) {
    if (!this.enabled) {
      return 'KickBot is not configured. Add GEMINI_API_KEY to the root .env file.';
    }

    for (const modelName of MODELS) {
      try {
        console.log(`[KickBot] Trying ${modelName}...`);
        const model = this.genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: SYSTEM_PROMPT,
        });
        const result = await model.generateContent(question);
        const text = result.response.text().trim();
        console.log(`[KickBot] ✅ Success with ${modelName}`);
        return text;
      } catch (err) {
        console.warn(`[KickBot] ❌ ${modelName} failed — ${err.message}`);
        // Always move to the next model, no matter what the error is
      }
    }

    console.error('[KickBot] All models failed.');
    return "Sorry, I couldn't answer that right now due to server demand. Please try again! ⚽";
  }
}

module.exports = GeminiBot;
