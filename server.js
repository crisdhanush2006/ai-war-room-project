const express = require('express');
const path = require('path');
const { runWarRoom } = require('./orchestration/warRoom');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

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

app.listen(PORT, () => {
  console.log(`War Room server running at http://localhost:${PORT}`);
});