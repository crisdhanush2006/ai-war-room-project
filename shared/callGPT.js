// One function that sends a prompt to Gemini and gets text back.
// All agents use this.

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function callGPT(prompt, systemMessage = 'You are a helpful assistant.') {
  const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
  const fullPrompt = `${systemMessage}\n\n${prompt}`;

  const result = await model.generateContent(fullPrompt);
  return result.response.text();
}

module.exports = { callGPT };