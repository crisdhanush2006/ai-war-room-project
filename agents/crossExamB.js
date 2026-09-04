const { callGPT } = require('../shared/callGPT');
const { makeAgentResponse } = require('../shared/agentSchema');

async function generateCrossExamB(solutionA, solutionB, rebuttalA, rebuttalB) {
  const systemMessage = 'You are Cross-Examination Agent B. You directly respond to Solution A\'s rebuttal, pointing out exactly where it fails to address your strongest points or where it makes a new claim that does not hold up.';

  const prompt = `
Your solution (Solution B):
${solutionB}

Your rebuttal (already given):
${rebuttalB}

The rival's solution (Solution A):
${solutionA}

The rival's rebuttal (Solution A's response to critiques):
${rebuttalA}

Directly respond to Solution A's rebuttal. Point out specifically:
- Any claim in Solution A's rebuttal that is unsupported or contradicts something said earlier
- Any weakness in Solution B that Solution A's rebuttal did NOT actually solve, despite claiming to

Write a short response (3-5 sentences). Be specific and reference A's actual claims — do not just re-state your original position.
`;

  const result = await callGPT(prompt, systemMessage);

  return makeAgentResponse({
    agent: 'cross_exam_b',
    analysis: result
  });
}

module.exports = { generateCrossExamB };