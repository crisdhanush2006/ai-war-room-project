const { callGPT } = require('../shared/callGPT');
const { makeAgentResponse } = require('../shared/agentSchema');

// Weights must add up to 1.0
const WEIGHTS = {
  feasibility: 0.25,
  practicality: 0.20,
  cost: 0.15,
  reliability: 0.15,
  evidence: 0.10,
  scalability: 0.10,
  novelty: 0.05
};

function computeWeightedScore(scores) {
  let total = 0;
  for (const key in WEIGHTS) {
    const value = Number(scores && scores[key]) || 0;
    total += value * WEIGHTS[key];
  }
  return Math.round(total);
}

function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (e) {
    return null;
  }
}

async function judgeSolutions(solutionA, solutionB, critiques = {}) {
  const systemMessage = 'You are a Judge. You score solutions on fixed criteria using independent critiques as evidence, not just the solutions own pitches. You always respond with valid JSON at the end of your answer.';

  const costReviewA = critiques.costReviewA || 'Not reviewed.';
  const feasibilityReviewA = critiques.feasibilityReviewA || 'Not reviewed.';
  const costReviewB = critiques.costReviewB || 'Not reviewed.';
  const feasibilityReviewB = critiques.feasibilityReviewB || 'Not reviewed.';

  const prompt = 'Score these two solutions on each criterion below, from 0-100. Base your scores primarily on the independent critiques provided, not just the solutions own pitches. A solution with a weak cost or feasibility critique should receive a correspondingly low score on that criterion.\n\n' +
    'SOLUTION A:\n' + solutionA + '\n\n' +
    'COST CRITIQUE OF SOLUTION A:\n' + costReviewA + '\n\n' +
    'FEASIBILITY CRITIQUE OF SOLUTION A:\n' + feasibilityReviewA + '\n\n' +
    'SOLUTION B:\n' + solutionB + '\n\n' +
    'COST CRITIQUE OF SOLUTION B:\n' + costReviewB + '\n\n' +
    'FEASIBILITY CRITIQUE OF SOLUTION B:\n' + feasibilityReviewB + '\n\n' +
    'Criteria to score (0-100 each): feasibility, practicality, cost, reliability, evidence, scalability, novelty.\n\n' +
    'First, write a short paragraph explaining your reasoning for each solution.\n\n' +
    'Then, at the very end, output ONLY a JSON object in exactly this shape (no markdown fences, no extra text after it):\n\n' +
    '{\n' +
    '  "solutionA": { "feasibility": 0, "practicality": 0, "cost": 0, "reliability": 0, "evidence": 0, "scalability": 0, "novelty": 0 },\n' +
    '  "solutionB": { "feasibility": 0, "practicality": 0, "cost": 0, "reliability": 0, "evidence": 0, "scalability": 0, "novelty": 0 }\n' +
    '}';

  const result = await callGPT(prompt, systemMessage);
  const parsed = extractJSON(result);

  let scoreA = null;
  let scoreB = null;
  let winner = 'A';

  if (parsed && parsed.solutionA && parsed.solutionB) {
    scoreA = computeWeightedScore(parsed.solutionA);
    scoreB = computeWeightedScore(parsed.solutionB);
    winner = scoreB > scoreA ? 'B' : 'A';
  } else {
    console.error('Judge: failed to parse structured scores from LLM output.');
  }

  return makeAgentResponse({
    agent: 'judge',
    analysis: result,
    score: winner === 'A' ? scoreA : scoreB,
    scores: { A: scoreA, B: scoreB },
        breakdown: parsed || null,
    winner: winner
  });
}

module.exports = { judgeSolutions };