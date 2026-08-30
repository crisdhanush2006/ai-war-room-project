const { callGPT } = require('../shared/callGPT');
const { makeAgentResponse } = require('../shared/agentSchema');

async function judgeSolutions(solutionA, solutionB) {
  const systemMessage = 'You are a Judge. You compare two solutions fairly and pick the stronger one, with a score.';

  const prompt = `
Compare these two solutions. Decide which is stronger and why.
Give each a score out of 100.
State your final verdict clearly at the end.

SOLUTION A:
${solutionA}

SOLUTION B:
${solutionB}
`;

  const result = await callGPT(prompt, systemMessage);

  return makeAgentResponse({
    agent: 'judge',
    analysis: result,
    score: null // Judge writes scores inside the text for now — we can extract numbers later
  });
}

module.exports = { judgeSolutions };