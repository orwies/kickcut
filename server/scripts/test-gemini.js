require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const GeminiBot = require('../services/GeminiBot');

/**
 * Test script to verify the GeminiBot service integration.
 * Takes no arguments.
 * Instantiates the GeminiBot with the environment API key and sends a simple 'hello' prompt.
 * Returns nothing, but logs the bot's response to the console.
 */
async function run() {
  const bot = new GeminiBot(process.env.GEMINI_API_KEY);
  const result = await bot.ask('hello');
  console.log(result);
}

run().catch(console.error);
