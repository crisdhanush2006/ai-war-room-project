const { callGPTStream } = require('../shared/callGPT');
const { makeAgentResponse } = require('../shared/agentSchema');

async function findUnresolvedIssues(solutionA, solutionB, crossExamA, crossExamB, onToken = () => {}) {
  const systemMessage = 'You are a Judge doing a pre-verdict check. Your only job right now is to spot unresolved issues in the debate — not to score or pick a winner yet.';

  const prompt = `
Solution A:
${solutionA}

Solution B:
${solutionB}

Cross-Examination from A (attacking B's rebuttal):
${crossExamA}

Cross-Examination from B (attacking A's rebuttal):
${crossExamB}

Identify the 1-2 most important unresolved issues from this debate — questions or claims that neither side has actually settled, that would change your verdict if answered clearly.

Write them as a short numbered list (1-2 items max), each 1-2 sentences. Be specific — name the actual claim or assumption in question, not a generic category.
`;

  const result = await callGPTStream(prompt, systemMessage, onToken);

  return makeAgentResponse({
    agent: 'judge_issues',
    analysis: result
  });
}

module.exports = { findUnresolvedIssues };