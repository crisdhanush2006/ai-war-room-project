const { callGPT } = require('../shared/callGPT');
const { makeAgentResponse } = require('../shared/agentSchema');

async function analyzeProblem(userProblem) {
  const systemMessage = 'You are a Problem Analyzer. You break down problems clearly, do not solve them yet.';

  const prompt = `
Break down this problem into 3 parts:
1. Core constraints (what limits the solution)
2. Success criteria (what a good solution looks like)
3. Key unknowns (what we don't know yet)

Problem: ${userProblem}
`;

  const result = await callGPT(prompt, systemMessage);

  return makeAgentResponse({
    agent: 'problem_analyzer',
    analysis: result
  });
}

module.exports = { analyzeProblem };