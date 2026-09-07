const { callGPTStream } = require('../shared/callGPT');
const { makeAgentResponse } = require('../shared/agentSchema');

async function generateVerifier(solutionA, solutionB, crossExamA, crossExamB, onToken = () => {}) {
  const systemMessage = 'You are a Fact Verifier. You do NOT debate, argue, or pick a winner. Your only job is to identify factual claims made by either side and check whether they are well-supported, plausible, overstated, or false.';

  const prompt = `
Below are two competing solutions and their cross-examination of each other.

SOLUTION A:
${solutionA}

SOLUTION B:
${solutionB}

SOLUTION A'S CROSS-EXAMINATION:
${crossExamA}

SOLUTION B'S CROSS-EXAMINATION:
${crossExamB}

Find every specific factual claim made (statistics, industry standards, technical assertions, security claims, percentages, named technologies). For EACH claim, output one line in this exact format:

[SOLUTION A or B] "short quote of the claim" — VERDICT: Verified / Plausible-but-unsourced / Overstated / False — Reason: one sentence why.

Only include claims that are actually checkable (skip vague opinions like "this is better"). List at least 3 and at most 8 claims total, across both solutions. Be strict — if a claim has no cited source and sounds convenient for the side making it, mark it "Plausible-but-unsourced" rather than "Verified."
`;

  const result = await callGPTStream(prompt, systemMessage, onToken);

  const fs = require('fs');
  const path = require('path');
  try {
    fs.writeFileSync(path.join(__dirname, '..', 'verifier-proof.txt'), String(result || 'EMPTY'), 'utf8');
  } catch (e) {
    console.error('VERIFIER PROOF WRITE FAILED:', e.message);
  }

  return makeAgentResponse({
    agent: 'verifier',
    analysis: result
  });
}

module.exports = { generateVerifier };