const { callGPT } = require('../shared/callGPT');
const { makeAgentResponse } = require('../shared/agentSchema');

async function generateSolutionA(problemBreakdown) {
  const systemMessage = 'You are Generator A. You propose one clear, practical solution to a problem.';

  const prompt = `
Based on this problem breakdown, propose ONE solution.
Explain how it works and why it fits the constraints.

Problem breakdown:
${problemBreakdown}
`;

  const result = await callGPT(prompt, systemMessage);

  return makeAgentResponse({
    agent: 'generator_a',
    analysis: result
  });
}

module.exports = { generateSolutionA };