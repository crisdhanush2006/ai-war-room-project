const { callGPTStream } = require('../shared/callGPT');
const { makeAgentResponse } = require('../shared/agentSchema');

async function generateRebuttalB(solutionA, solutionB, costReviewA, feasibilityReviewA, costReviewB, feasibilityReviewB, onToken = () => {}) {
  const systemMessage = 'You are Rebuttal Agent B. You defend Solution B against the critiques it received, and argue why it remains the better choice compared to Solution A.';

  const prompt = `
Solution B proposed:
${solutionB}

Cost critique of Solution B:
${costReviewB}

Feasibility critique of Solution B:
${feasibilityReviewB}

Solution A proposed (the rival):
${solutionA}

Cost critique of Solution A:
${costReviewA}

Feasibility critique of Solution A:
${feasibilityReviewA}

Write a short rebuttal (3-5 sentences) defending Solution B. Address the strongest weaknesses raised against it, and explain why Solution B still holds up better than Solution A overall.
`;

  const result = await callGPTStream(prompt, systemMessage, onToken);

  return makeAgentResponse({
    agent: 'rebuttal_b',
    analysis: result
  });
}

module.exports = { generateRebuttalB };