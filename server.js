const express = require('express');
const path = require('path');
const { runWarRoom } = require('./orchestration/warRoom');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

app.post('/api/run', async (req, res) => {
  try {
    const { problem } = req.body;
    const result = await runWarRoom(problem);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.listen(PORT, () => {
  console.log(`War Room server running at http://localhost:${PORT}`);
});