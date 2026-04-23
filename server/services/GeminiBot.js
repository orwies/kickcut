'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');

const SYSTEM_PROMPT = `You are KickBot, an expert AI football analyst embedded inside KickCut — a football highlights platform.
You answer questions about football players, teams, tactics, history, transfer news, competitions and statistics.
Keep answers concise (3-4 sentences max), enthusiastic and insightful.
Use football terminology naturally. Feel free to use emojis.
If asked something unrelated to football, say: "I only talk football! Ask me something about the beautiful game ⚽"`;

class GeminiBot {
  constructor(apiKey) {
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      this.enabled = false;
      console.log('[KickBot] No Gemini API key set');
      return;
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.enabled = true;
    console.log('[KickBot] Gemini Models ready with fallback support ⚽');
  }

  async ask(question) {
    if (!this.enabled) {
      return `KickBot is not configured. Add GEMINI_API_KEY to server/.env`;
    }

    const maxRetries = 3;
    const baseDelay = 1000;
    
    // Ordered list of models — preferred first. 2.5 Flash is the current free-tier model.
    const fallbackModels = ['gemini-2.5-flash', 'gemini-2.0-flash'];

    for (const modelName of fallbackModels) {
      const activeModel = this.genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_PROMPT,
      });

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const result = await activeModel.generateContent(question);
          return result.response.text().trim();
        } catch (err) {
          const msg = err.message || '';
          console.warn(`[KickBot] Attempt ${attempt} failed with ${modelName}:`, msg);

          // If quota exceeded or not found for this specific model, don't retry, just failover to next model
          if (msg.includes('429') && msg.includes('Quota exceeded')) {
             break; // breaks out of retry loop, moves to next model
          }
          if (msg.includes('404')) {
             break;
          }

          // If it's a 503 or transient error, retry with exponential backoff
          if (attempt === maxRetries) {
            break; // give up on this model after max retries
          }
          
          await new Promise(res => setTimeout(res, baseDelay * Math.pow(2, attempt - 1)));
        }
      }
    }
    
    return `Sorry, I couldn't answer that right now due to server demand. Please try again! ⚽`;
  }
}

module.exports = GeminiBot;
