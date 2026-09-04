// One function that sends a prompt to Gemini and gets text back.
// All agents use this.
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ==========================================
// RETRY CONFIG
// ==========================================
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1s, then 2s, then 4s

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Treat 503 (overloaded) and 429 (rate limited) as retryable.
// Everything else (bad API key, invalid request, etc.) fails fast.
function isRetryableError(error) {
  const status = error?.status;
  return status === 503 || status === 429;
}

async function callGPT(prompt, systemMessage = 'You are a helpful assistant.') {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    generationConfig: {
      maxOutputTokens: 4096
    }
  });

  const fullPrompt = `${systemMessage}\n\n${prompt}`;

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(fullPrompt);
      return result.response.text();
    } catch (error) {
      lastError = error;

      const retryable = isRetryableError(error);

      console.error(
        `callGPT: attempt ${attempt}/${MAX_RETRIES} failed` +
        (retryable ? ' (retryable)' : ' (not retryable)') +
        `: ${error.message}`
      );

      if (!retryable || attempt === MAX_RETRIES) {
        break;
      }

      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`callGPT: retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  // All retries exhausted (or non-retryable error) — surface it.
  throw lastError;
}

module.exports = { callGPT };