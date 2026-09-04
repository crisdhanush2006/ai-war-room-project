const fs = require('fs');
const path = require('path');

const { callGPT } = require('../shared/callGPT');
const { makeAgentResponse } = require('../shared/agentSchema');

// ==========================================
// WEIGHTS
// Total = 1.00
// ==========================================
const WEIGHTS = {
  feasibility: 0.25,
  practicality: 0.20,
  cost: 0.15,
  reliability: 0.15,
  evidence: 0.10,
  scalability: 0.10,
  novelty: 0.05
};

// ==========================================
// COMPUTE WEIGHTED SCORE
// ==========================================
function computeWeightedScore(scores) {
  let total = 0;

  for (const key of Object.keys(WEIGHTS)) {
    const value = Number(scores?.[key]) || 0;
    total += value * WEIGHTS[key];
  }

  return Math.round(total);
}

// ==========================================
// EXTRACT JSON FROM LLM RESPONSE
// ==========================================
function extractJSON(text) {
  if (!text || typeof text !== 'string') {
    return {
      parsed: null,
      raw: null
    };
  }

  // Try to find the last JSON object in the response.
  const start = text.lastIndexOf('{');

  if (start === -1) {
    return {
      parsed: null,
      raw: null
    };
  }

  // Since the JSON contains nested objects, use a balanced-brace parser.
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\' && inString) {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;

      if (depth === 0) {
        const raw = text.slice(start, i + 1);

        try {
          return {
            parsed: JSON.parse(raw),
            raw
          };
        } catch (error) {
          return {
            parsed: null,
            raw: null
          };
        }
      }
    }
  }

  return {
    parsed: null,
    raw: null
  };
}

// ==========================================
// JUDGE SOLUTIONS
// ==========================================
async function judgeSolutions(
  solutionA,
  solutionB,
  critiques = {}
) {
  const systemMessage =
    'You are a Judge. You score solutions on fixed criteria using independent critiques as evidence, not just the solutions own pitches. You always respond with valid JSON at the end of your answer.';

  const costReviewA =
    critiques.costReviewA || 'Not reviewed.';

  const feasibilityReviewA =
    critiques.feasibilityReviewA || 'Not reviewed.';

  const costReviewB =
    critiques.costReviewB || 'Not reviewed.';

  const feasibilityReviewB =
    critiques.feasibilityReviewB || 'Not reviewed.';

  const prompt =
    `Score these two solutions on each criterion below, from 0-100.

Base your scores primarily on the independent critiques provided, not just the solutions own pitches.

A solution with a weak cost or feasibility critique should receive a correspondingly low score on that criterion.

SOLUTION A:
${solutionA}

COST CRITIQUE OF SOLUTION A:
${costReviewA}

FEASIBILITY CRITIQUE OF SOLUTION A:
${feasibilityReviewA}

SOLUTION B:
${solutionB}

COST CRITIQUE OF SOLUTION B:
${costReviewB}

FEASIBILITY CRITIQUE OF SOLUTION B:
${feasibilityReviewB}

Criteria to score from 0-100:
- feasibility
- practicality
- cost
- reliability
- evidence
- scalability
- novelty

First, write a short paragraph explaining your reasoning for each solution.

Then, at the very end, output ONLY this JSON object.
Do not use markdown fences.
Do not add anything after the JSON.

{
  "solutionA": {
    "feasibility": 0,
    "practicality": 0,
    "cost": 0,
    "reliability": 0,
    "evidence": 0,
    "scalability": 0,
    "novelty": 0
  },
  "solutionB": {
    "feasibility": 0,
    "practicality": 0,
    "cost": 0,
    "reliability": 0,
    "evidence": 0,
    "scalability": 0,
    "novelty": 0
  }
}`;

  // ==========================================
  // CALL LLM
  // ==========================================
  const result = await callGPT(
    prompt,
    systemMessage
  );

  // ==========================================
  // DEBUG RAW RESPONSE
  // ==========================================
  const rawDebugPath = path.join(
    __dirname,
    '..',
    'debug-raw.txt'
  );

  try {
    fs.writeFileSync(
      rawDebugPath,
      String(result ?? ''),
      'utf8'
    );

    console.log(
      'DEBUG: wrote debug-raw.txt to:',
      rawDebugPath
    );
  } catch (error) {
    console.error(
      'DEBUG WRITE FAILED (raw):',
      error.message
    );
  }

  // ==========================================
  // EXTRACT JSON
  // ==========================================
  const {
    parsed,
    raw
  } = extractJSON(
    String(result ?? '')
  );

  // ==========================================
  // CLEAN ANALYSIS
  // (Strip everything from the first "{" onward,
  // even if the JSON itself is malformed/truncated,
  // so the prose is always clean.)
  // ==========================================
  const rawText = String(result ?? '');
  const jsonStartIndex = rawText.indexOf('{');
  const cleanedAnalysis =
    jsonStartIndex !== -1
      ? rawText.slice(0, jsonStartIndex).trim()
      : rawText.trim();

  // ==========================================
  // DEBUG CLEANED RESPONSE
  // ==========================================
  const cleanedDebugPath = path.join(
    __dirname,
    '..',
    'debug-cleaned.txt'
  );

  try {
    fs.writeFileSync(
      cleanedDebugPath,
      cleanedAnalysis,
      'utf8'
    );

    console.log(
      'DEBUG: wrote debug-cleaned.txt to:',
      cleanedDebugPath
    );
  } catch (error) {
    console.error(
      'DEBUG WRITE FAILED (cleaned):',
      error.message
    );
  }

  // ==========================================
  // CALCULATE SCORES
  // ==========================================
  let scoreA = null;
  let scoreB = null;
  let winner = 'A';

  if (
    parsed &&
    parsed.solutionA &&
    parsed.solutionB
  ) {
    scoreA = computeWeightedScore(
      parsed.solutionA
    );

    scoreB = computeWeightedScore(
      parsed.solutionB
    );

    winner = scoreB > scoreA ? 'B' : 'A';

    console.log(
      `JUDGE SCORES -> A: ${scoreA}, B: ${scoreB}, WINNER: ${winner}`
    );
  } else {
    console.error(
      'Judge: failed to parse structured scores from LLM output.'
    );

    console.error(
      'Judge: raw response was saved to:',
      rawDebugPath
    );
  }

  // ==========================================
  // RETURN STANDARD AGENT RESPONSE
  // ==========================================
  return makeAgentResponse({
    agent: 'judge',

    analysis: cleanedAnalysis,

    score:
      winner === 'A'
        ? scoreA
        : scoreB,

    scores: {
      A: scoreA,
      B: scoreB
    },

    breakdown: parsed || null,

    winner
  });
}

// ==========================================
// EXPORT
// ==========================================
module.exports = {
  judgeSolutions
};