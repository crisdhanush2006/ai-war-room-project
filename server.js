require('dotenv').config();

const express = require('express');
const path = require('path');
const { runWarRoom } = require('./orchestration/warRoom');
const { askFollowUp } = require('./agents/followUp');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// ==========================================
// OLD ENDPOINT
// ==========================================
app.post('/api/run', async (req, res) => {
  try {
    const { problem, mode } = req.body;

    const result = await runWarRoom(
      problem,
      mode || 'full'
    );

    res.json(result);

  } catch (error) {
    console.error('=== FULL ERROR /api/run ===');
    console.error('Message:', error.message);
    console.error('Status:', error.status);
    console.error('Stack:', error.stack);
    console.error('==========================');

    if (error.status === 429) {
      res.status(429).json({
        error:
          'Too many people are using the AI right now. Please wait a minute and try again.'
      });
    } else {
      res.status(500).json({
        error:
          'Something went wrong on our end. Please try again shortly.'
      });
    }
  }
});

// ==========================================
// STREAMING ENDPOINT
// ==========================================
app.post('/api/run-stream', async (req, res) => {
  console.log('STREAM REQUEST RECEIVED:', req.body);

  const { problem, mode, debateStyle } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.flushHeaders();

  function sendEvent(name, data) {
    res.write(`event: ${name}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  try {
    await runWarRoom(
      problem,
      mode || 'full',
      (name, data) => {
        sendEvent(name, data);
      },
      debateStyle || 'balanced'
    );

  } catch (error) {
    console.error('=== FULL ERROR /api/run-stream ===');
    console.error('Message:', error.message);
    console.error('Status:', error.status);
    console.error('Stack:', error.stack);
    console.error('==================================');

    const message =
      error.status === 429
        ? 'Too many people are using the AI right now. Please wait a minute and try again.'
        : 'Something went wrong on our end. Please try again shortly.';

    sendEvent('error', {
      error: message
    });

  } finally {
    res.end();
  }
});

// ==========================================
// FOLLOW-UP ENDPOINT
// ==========================================
app.post('/api/followup', async (req, res) => {
  try {
    const { context, question } = req.body;

    const answer = await askFollowUp(
      context,
      question
    );

    res.json({
      answer
    });

  } catch (error) {
    console.error('=== FULL ERROR /api/followup ===');
    console.error('Message:', error.message);
    console.error('Status:', error.status);
    console.error('Stack:', error.stack);
    console.error('================================');

    if (error.status === 429) {
      res.status(429).json({
        error:
          'Too many people are using the AI right now. Please wait a minute and try again.'
      });
    } else {
      res.status(500).json({
        error:
          'Something went wrong. Please try again.'
      });
    }
  }
});

// ==========================================
// START SERVER
// ==========================================
app.listen(PORT, () => {
  console.log('========================================');
  console.log(`War Room server running at http://localhost:${PORT}`);
  console.log('========================================');

  console.log(
    'GROQ API key:',
    process.env.GROQ_API_KEY
      ? 'LOADED'
      : 'MISSING'
  );

  console.log(
    'GEMINI API key:',
    process.env.GEMINI_API_KEY
      ? 'LOADED'
      : 'MISSING'
  );
});