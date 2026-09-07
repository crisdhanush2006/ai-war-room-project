const { callGPTStream } = require('../shared/callGPT');
const { makeAgentResponse } = require('../shared/agentSchema');

async function generateRebuttalA(solutionA, solutionB, costReviewA, feasibilityReviewA, costReviewB, feasibilityReviewB, onToken = () => {}) {
  const systemMessage = 'You are Rebuttal Agent A. You defend Solution A against the critiques it received, and argue why it remains the better choice compared to Solution B.';

  const prompt = `
Solution A proposed:
${solutionA}

Cost critique of Solution A:
${costReviewA}

Feasibility critique of Solution A:
${feasibilityReviewA}

Solution B proposed (the rival):
${solutionB}

Cost critique of Solution B:
${costReviewB}

Feasibility critique of Solution B:
${feasibilityReviewB}

Write a short rebuttal (3-5 sentences) defending Solution A. Address the strongest weaknesses raised against it, and explain why Solution A still holds up better than Solution B overall.
`;

  const result = await callGPTStream(prompt, systemMessage, onToken);

  return makeAgentResponse({
    agent: 'rebuttal_a',
    analysis: result
  });
}

module.exports = { generateRebuttalA };