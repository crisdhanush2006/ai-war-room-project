const { callGPT } = require('../shared/callGPT');
const { makeAgentResponse } = require('../shared/agentSchema');

async function generateSolutionB(problemBreakdown) {
  const systemMessage = 'You are Generator B. You propose a DIFFERENT solution than a typical first idea — think of an alternative approach.';

  const prompt = `
Based on this problem breakdown, propose ONE solution.
Make it a different approach or angle than an obvious first idea would be.
Explain how it works and why it fits the constraints.

Problem breakdown:
${problemBreakdown}
`;

  const result = await callGPT(prompt, systemMessage);

  return makeAgentResponse({
    agent: 'generator_b',
    analysis: result
  });
}

module.exports = { generateSolutionB };