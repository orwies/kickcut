require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  console.log("Fetching models...");
  // However, listModels is not in getGenerativeModel, we need to try standard models via REST or looking at the package? 
  // No, the library hasn't exposed a simple list method in older versions maybe? Oh wait, we can just use `gemini-1.5-flash-latest`, or we can fetch via fetch.
  try {
    const list = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await list.json();
    console.log(data.models.map(m => m.name));
  } catch (err) {
    console.error(err);
  }
}
run();
