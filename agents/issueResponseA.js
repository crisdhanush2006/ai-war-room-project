const { callGPTStream } = require('../shared/callGPT');
const { makeAgentResponse } = require('../shared/agentSchema');

async function respondToIssuesA(solutionA, issues, onToken = () => {}) {
  const systemMessage = 'You are Solution A. The Judge has flagged specific unresolved issues in the debate. Answer them directly and specifically.';

  const prompt = `
Your solution (Solution A):
${solutionA}

The Judge has flagged these unresolved issues:
${issues}

Directly address each issue the Judge raised. Be specific and concrete — do not repeat your original pitch or rebuttal. If you cannot fully resolve an issue, say so honestly rather than deflecting.

Write a short response (3-5 sentences).
`;

  const result = await callGPTStream(prompt, systemMessage, onToken);

  return makeAgentResponse({
    agent: 'issue_response_a',
    analysis: result
  });
}

module.exports = { respondToIssuesA };