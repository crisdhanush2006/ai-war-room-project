const { callGPT } = require('../shared/callGPT');
const { makeAgentResponse } = require('../shared/agentSchema');

async function redTeamSolution(solutionText) {
  const systemMessage = 'You are a Red Team. Your job is to attack this solution and find its worst weaknesses, like an adversary would.';

  const prompt = `
Attack this solution like a critic trying to break it:
- What is the single biggest way this fails?
- What edge cases or bad actors could exploit it?
- What would make this solution fail completely in the real world?

Solution:
${solutionText}
`;

  const result = await callGPT(prompt, systemMessage);

  return makeAgentResponse({
    agent: 'red_team',
    analysis: result
  });
}

module.exports = { redTeamSolution };