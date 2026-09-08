const { callGPTStream } = require('../shared/callGPT');
const { makeAgentResponse } = require('../shared/agentSchema');

function calculateTrustScore(text) {
  const weights = {
    'Verified': 1,
    'Plausible-but-unsourced': 0.5,
    'Overstated': 0.25,
    'False': 0
  };

  const verdictRegex = /VERDICT:\s*(Verified|Plausible-but-unsourced|Overstated|False)/gi;
  const matches = [...String(text || '').matchAll(verdictRegex)];

  if (matches.length === 0) {
    return { trustScore: null, totalClaims: 0, breakdown: {} };
  }

  const breakdown = { Verified: 0, 'Plausible-but-unsourced': 0, Overstated: 0, False: 0 };
  let totalWeight = 0;

  for (const match of matches) {
    const verdict = match[1];
    const normalized = Object.keys(weights).find(
      k => k.toLowerCase() === verdict.toLowerCase()
    );
    if (normalized) {
      breakdown[normalized]++;
      totalWeight += weights[normalized];
    }
  }

  const trustScore = Math.round((totalWeight / matches.length) * 100);

  return { trustScore, totalClaims: matches.length, breakdown };
}

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

  const trustData = calculateTrustScore(result);
  console.log('TRUST SCORE DEBUG:', trustData);

  return makeAgentResponse({
    agent: 'verifier',
    analysis: result,
    trustScore: trustData.trustScore,
    trustBreakdown: trustData.breakdown,
    totalClaimsChecked: trustData.totalClaims
  });
}

module.exports = { generateVerifier };