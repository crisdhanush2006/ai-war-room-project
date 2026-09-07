const { callGPTStream } = require('../shared/callGPT');
const { makeAgentResponse } = require('../shared/agentSchema');

async function refineSolution(solutionText, onToken = () => {}) {
  const systemMessage = 'You are a Refiner. You improve an existing solution by fixing weak points and making it sharper.';

  const prompt = `
Here is a proposed solution. Improve it:
- Point out 2-3 weaknesses
- Fix them
- Give the improved, final version of the solution

Solution:
${solutionText}
`;

  const result = await callGPTStream(prompt, systemMessage, onToken);

  return makeAgentResponse({
    agent: 'refiner',
    analysis: result
  });
}

module.exports = { refineSolution };