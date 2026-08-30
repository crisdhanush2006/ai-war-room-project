const { callGPT } = require('../shared/callGPT');
const { makeAgentResponse } = require('../shared/agentSchema');

async function critiqueFeasibility(solutionText) {
  const systemMessage = 'You are a Feasibility Critic. You analyze solutions ONLY from a real-world practicality perspective.';

  const prompt = `
Analyze this solution ONLY from a feasibility perspective:
- What parts are hard or unrealistic to build?
- What technical, legal, or logistical barriers exist?
- Give a feasibility score out of 100 (100 = very realistic, 0 = impossible)

Solution:
${solutionText}
`;

  const result = await callGPT(prompt, systemMessage);

  return makeAgentResponse({
    agent: 'feasibility_critic',
    analysis: result
  });
}

module.exports = { critiqueFeasibility };