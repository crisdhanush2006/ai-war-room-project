require('dotenv').config();

const express = require('express');
const path = require('path');
const { runWarRoom } = require('./orchestration/warRoom');
const { askFollowUp } = require('./agents/followUp');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// OLD endpoint - kept exactly as before, still works if anything still calls it
app.post('/api/run', async (req, res) => {
  try {
    const { problem, mode } = req.body;
    const result = await runWarRoom(problem, mode || 'full');
    res.json(result);
  } catch (error) {
    console.error(error);

    if (error.status === 429) {
      res.status(429).json({ error: 'Too many people are using the AI right now. Please wait a minute and try again.' });
    } else {
      res.status(500).json({ error: 'Something went wrong on our end. Please try again shortly.' });
    }
  }
});

// NEW endpoint - streams each agent result live using Server-Sent Events
app.post('/api/run-stream', async (req, res) => {
  const { problem, mode } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  function sendEvent(name, data) {
    res.write(`event: ${name}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  try {
    await runWarRoom(problem, mode || 'full', (name, data) => {
      sendEvent(name, data);
    });
  } catch (error) {
    console.error(error);

    const message = error.status === 429
      ? 'Too many people are using the AI right now. Please wait a minute and try again.'
      : 'Something went wrong on our end. Please try again shortly.';

    sendEvent('error', { error: message });
  } finally {
    res.end();
  }
});

app.post('/api/followup', async (req, res) => {
  try {
    const { context, question } = req.body;
    const answer = await askFollowUp(context, question);
    res.json({ answer });
  } catch (error) {
    console.error(error);

    if (error.status === 429) {
      res.status(429).json({ error: 'Too many people are using the AI right now. Please wait a minute and try again.' });
    } else {
      res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  }
});

app.listen(PORT, () => {
  console.log(`War Room server running at http://localhost:${PORT}`);
});