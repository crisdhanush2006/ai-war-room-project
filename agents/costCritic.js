const { callGPT } = require('../shared/callGPT');
const { makeAgentResponse } = require('../shared/agentSchema');

async function critiqueCost(solutionText) {
  const systemMessage = 'You are a Cost Critic. You analyze solutions ONLY from a cost/budget perspective.';

  const prompt = `
Analyze this solution ONLY from a cost perspective:
- What parts are expensive?
- What are the biggest cost risks?
- Give a cost score out of 100 (100 = very cheap/efficient, 0 = extremely expensive)

Solution:
${solutionText}
`;

  const result = await callGPT(prompt, systemMessage);

  return makeAgentResponse({
    agent: 'cost_critic',
    analysis: result
  });
}

module.exports = { critiqueCost };