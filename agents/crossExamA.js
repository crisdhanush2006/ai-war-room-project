const { callGPT } = require('../shared/callGPT');
const { makeAgentResponse } = require('../shared/agentSchema');

async function generateCrossExamA(solutionA, solutionB, rebuttalA, rebuttalB) {
  const systemMessage = 'You are Cross-Examination Agent A. You directly respond to Solution B\'s rebuttal, pointing out exactly where it fails to address your strongest points or where it makes a new claim that does not hold up.';

  const prompt = `
Your solution (Solution A):
${solutionA}

Your rebuttal (already given):
${rebuttalA}

The rival's solution (Solution B):
${solutionB}

The rival's rebuttal (Solution B's response to critiques):
${rebuttalB}

Directly respond to Solution B's rebuttal. Point out specifically:
- Any claim in Solution B's rebuttal that is unsupported or contradicts something said earlier
- Any weakness in Solution A that Solution B's rebuttal did NOT actually solve, despite claiming to

Write a short response (3-5 sentences). Be specific and reference B's actual claims — do not just re-state your original position.
`;

  const result = await callGPT(prompt, systemMessage);

  return makeAgentResponse({
    agent: 'cross_exam_a',
    analysis: result
  });
}

module.exports = { generateCrossExamA };