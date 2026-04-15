require('dotenv').config();
const GeminiBot = require('../services/GeminiBot');

async function run() {
  const bot = new GeminiBot(process.env.GEMINI_API_KEY);
  const result = await bot.ask('hello');
  console.log(result);
}

run().catch(console.error);
