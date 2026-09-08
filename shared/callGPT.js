// ==========================================
// AI API HELPER
// Gemini + Groq
// ==========================================

const { GoogleGenAI } = require('@google/genai');

// ==========================================
// GEMINI CONFIG
// ==========================================

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// ==========================================
// GROQ CONFIG
// ==========================================

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = 'openai/gpt-oss-120b';

// ==========================================
// RETRY CONFIG
// ==========================================

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

// ==========================================
// SLEEP
// ==========================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==========================================
// RETRYABLE ERROR CHECK
// ==========================================

function isRetryableError(error) {
  const status = error?.status;

  return (
    status === 429 ||
    status === 503 ||
    status === 502 ||
    status === 500
  );
}

// ==========================================
// GEMINI NON-STREAMING
// ==========================================

async function callGPT(
  prompt,
  systemMessage = 'You are a helpful assistant.'
) {
  const fullPrompt = `${systemMessage}\n\n${prompt}`;

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: fullPrompt,
        config: {
          maxOutputTokens: 4096
        }
      });

      return result.text;

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

  throw lastError;
}

// ==========================================
// GEMINI STREAMING
// ==========================================

async function callGPTStream(
  prompt,
  systemMessage = 'You are a helpful assistant.',
  onToken = () => {}
) {
  const fullPrompt = `${systemMessage}\n\n${prompt}`;

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let receivedAnyChunks = false;
    let fullText = '';

    try {
      const result = await ai.models.generateContentStream({
        model: 'gemini-3.6-flash',
        contents: fullPrompt,
        config: {
          maxOutputTokens: 4096
        }
      });

      let chunkCount = 0;

      for await (const chunk of result) {
        const chunkText = chunk.text || '';

        chunkCount++;

        if (chunkText) {
          receivedAnyChunks = true;
          fullText += chunkText;

          onToken(chunkText);
        }
      }

      console.log(
        `callGPTStream: stream ended, total chunks = ${chunkCount}`
      );

      return fullText;

    } catch (error) {
      lastError = error;

      if (receivedAnyChunks) {
        console.error(
          `callGPTStream: failed mid-stream: ${error.message}`
        );

        throw error;
      }

      const retryable = isRetryableError(error);

      console.error(
        `callGPTStream: attempt ${attempt}/${MAX_RETRIES} failed` +
        (retryable ? ' (retryable)' : ' (not retryable)') +
        `: ${error.message}`
      );

      if (!retryable || attempt === MAX_RETRIES) {
        break;
      }

      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);

      console.log(
        `callGPTStream: retrying in ${delay}ms...`
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

// ==========================================
// GROQ STREAMING
// ==========================================

async function callGroqStream(
  prompt,
  systemMessage = 'You are a helpful assistant.',
  onToken = () => {}
) {
  if (!GROQ_API_KEY) {
    throw new Error(
      'GROQ_API_KEY is missing. Add GROQ_API_KEY to your .env file.'
    );
  }

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let receivedAnyChunks = false;
    let fullText = '';

    try {
      const response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',

          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({
            model: GROQ_MODEL,

            messages: [
              {
                role: 'system',
                content: systemMessage
              },
              {
                role: 'user',
                content: prompt
              }
            ],

            max_tokens: 4096,
            temperature: 0.7,
            stream: true
          })
        }
      );

      // ==========================================
      // HANDLE API ERROR
      // ==========================================

      if (!response.ok) {
        const errorText = await response.text();

        const error = new Error(
          `Groq API error: ${response.status} ${errorText}`
        );

        error.status = response.status;

        throw error;
      }

      if (!response.body) {
        throw new Error(
          'Groq API returned an empty response body.'
        );
      }

      // ==========================================
      // READ STREAM
      // ==========================================

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = '';
      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, {
          stream: true
        });

        const lines = buffer.split('\n');

        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();

          if (!trimmed.startsWith('data:')) {
            continue;
          }

          const data = trimmed.slice(5).trim();

          if (!data || data === '[DONE]') {
            continue;
          }

          try {
            const json = JSON.parse(data);

            const chunkText =
              json.choices?.[0]?.delta?.content || '';

            chunkCount++;

            if (chunkText) {
              receivedAnyChunks = true;

              fullText += chunkText;

              onToken(chunkText);
            }

          } catch (parseError) {
            console.error(
              'callGroqStream: failed to parse SSE chunk:',
              parseError.message
            );
          }
        }
      }

      // ==========================================
      // PROCESS REMAINING BUFFER
      // ==========================================

      if (buffer.trim()) {
        const trimmed = buffer.trim();

        if (trimmed.startsWith('data:')) {
          const data = trimmed.slice(5).trim();

          if (data && data !== '[DONE]') {
            try {
              const json = JSON.parse(data);

              const chunkText =
                json.choices?.[0]?.delta?.content || '';

              if (chunkText) {
                receivedAnyChunks = true;

                fullText += chunkText;

                onToken(chunkText);
              }

            } catch (parseError) {
              // Ignore incomplete final SSE data
            }
          }
        }
      }

      console.log(
        `callGroqStream: stream ended, total chunks = ${chunkCount}`
      );

      return fullText;

    } catch (error) {
      lastError = error;

      // ==========================================
      // DON'T RETRY AFTER PARTIAL OUTPUT
      // ==========================================

      if (receivedAnyChunks) {
        console.error(
          'callGroqStream: failed after partial output:',
          error.message
        );

        throw error;
      }

      // ==========================================
      // RETRY
      // ==========================================

      const retryable = isRetryableError(error);

      console.error(
        `callGroqStream: attempt ${attempt}/${MAX_RETRIES} failed` +
        (retryable ? ' (retryable)' : ' (not retryable)') +
        `: ${error.message}`
      );

      if (!retryable || attempt === MAX_RETRIES) {
        break;
      }

      const delay =
        BASE_DELAY_MS * Math.pow(2, attempt - 1);

      console.log(
        `callGroqStream: retrying in ${delay}ms...`
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  callGPT,
  callGPTStream,
  callGroqStream
};