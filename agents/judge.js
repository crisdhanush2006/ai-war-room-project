const { callGPT } = require('../shared/callGPT');
const { makeAgentResponse } = require('../shared/agentSchema');

async function judgeSolutions(solutionA, solutionB) {
  const systemMessage = 'You are a Judge. You compare two solutions fairly and pick the stronger one, with a score.';

  const prompt = `
Compare these two solutions. Decide which is stronger and why.
Give each a score out of 100.

SOLUTION A:
${solutionA}

SOLUTION B:
${solutionB}

At the very end, on its own line, write exactly one of these:
WINNER: A
WINNER: B
`;

  const result = await callGPT(prompt, systemMessage);

  let winner = 'A';
  if (result.includes('WINNER: B')) {
    winner = 'B';
  }

  return makeAgentResponse({
    agent: 'judge',
    analysis: result,
    score: null,
    winner
  });
}

module.exports = { judgeSolutions };