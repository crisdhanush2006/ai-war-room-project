const { callGroqStream } = require('../shared/callGPT');
const { makeAgentResponse } = require('../shared/agentSchema');

async function generateSolutionB(analysis, onToken = () => {}) {
  const systemMessage =
    'You are Generator B. You propose an alternative solution to the problem — one that takes a genuinely different approach than a typical first-pass idea, rather than a minor variation of the obvious answer.';

  const prompt = `
Problem analysis:
${analysis}

Propose a solution to this problem. Your solution should take a distinctly different approach than the most obvious, typical first idea — avoid simply restating conventional wisdom.

Explain:
- What the solution is and how it works
- Why it fits the constraints identified in the analysis
- Why it meets the success criteria identified in the analysis
- What makes this approach different from the "obvious" first solution
`;

  const result = await callGroqStream(prompt, systemMessage, onToken);

  return makeAgentResponse({
    agent: 'solution_b',
    analysis: result
  });
}

module.exports = { generateSolutionB };