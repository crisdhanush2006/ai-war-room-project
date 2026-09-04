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
    return { parsed: null, raw: null };
  }

  const start = text.indexOf('{'); // FIX: was lastIndexOf — grabbed the inner solutionB brace
                                    // instead of the outer {solutionA, solutionB} wrapper

  if (start === -1) {
    return { parsed: null, raw: null };
  }

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
          return { parsed: JSON.parse(raw), raw };
        } catch (error) {
          return { parsed: null, raw: null };
        }
      }
    }
  }

  return { parsed: null, raw: null };
}

// ==========================================
// VALIDATE PARSED SHAPE
// Returns true only if it has the correct
// solutionA/solutionB wrapper. A flat object
// (scores merged into one) is treated as invalid.
// ==========================================
function isValidShape(parsed) {
  return !!(
    parsed &&
    parsed.solutionA &&
    typeof parsed.solutionA === 'object' &&
    parsed.solutionB &&
    typeof parsed.solutionB === 'object'
  );
}

// ==========================================
// BUILD THE JUDGE PROMPT
// (extracted so we can call it twice: once
// normally, once as a stricter retry)
// ==========================================
function buildPrompt(solutionA, solutionB, critiques, isRetry) {
  const costReviewA = critiques.costReviewA || 'Not reviewed.';
  const feasibilityReviewA = critiques.feasibilityReviewA || 'Not reviewed.';
  const costReviewB = critiques.costReviewB || 'Not reviewed.';
  const feasibilityReviewB = critiques.feasibilityReviewB || 'Not reviewed.';
  const rebuttalA = critiques.rebuttalA || 'No rebuttal provided.';
  const rebuttalB = critiques.rebuttalB || 'No rebuttal provided.';
  const crossExamA = critiques.crossExamA || 'No cross-examination provided.';
  const crossExamB = critiques.crossExamB || 'No cross-examination provided.';

  const retryWarning = isRetry
    ? `\nIMPORTANT: Your previous response did not follow the required format. You MUST return a JSON object with exactly two top-level keys, "solutionA" and "solutionB", each containing their own 7 scores. Do NOT merge or flatten the scores into a single object.\n`
    : '';

  return `Score these two solutions on each criterion below, from 0-100.
${retryWarning}
Base your scores primarily on the independent critiques provided, not just the solutions own pitches.

A solution with a weak cost or feasibility critique should receive a correspondingly low score on that criterion.

Each solution has also had a chance to rebut the critiques against it. Treat these rebuttals as additional evidence to weigh — they can soften a critique's impact if genuinely convincing, but a rebuttal alone must NOT automatically override a critique or determine the winner.

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

REBUTTAL FROM SOLUTION A:
${rebuttalA}

REBUTTAL FROM SOLUTION B:
${rebuttalB}

SOLUTION A'S CROSS-EXAMINATION OF SOLUTION B'S REBUTTAL:
${crossExamA}

SOLUTION B'S CROSS-EXAMINATION OF SOLUTION A'S REBUTTAL:
${crossExamB}

Treat the cross-examination round as further evidence: if one side successfully exposes an unsupported claim or unresolved weakness in the other's rebuttal during cross-examination, that should weigh against the side being exposed. A cross-examination claim that is itself unsupported should not be given weight.

Criteria to score from 0-100:
- feasibility
- practicality
- cost
- reliability
- evidence
- scalability
- novelty

First, write a short paragraph explaining your reasoning for each solution.

Then, at the very end, output ONLY this exact JSON object.
It MUST have a top-level "solutionA" key and a top-level "solutionB" key — do not flatten or merge them into one object, and do not omit either key.
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
}

// ==========================================
// JUDGE SOLUTIONS
// ==========================================
async function judgeSolutions(solutionA, solutionB, critiques = {}) {
  const systemMessage =
    'You are a Judge. You score solutions on fixed criteria using independent critiques as evidence, not just the solutions own pitches. You always respond with valid JSON at the end of your answer.';

  const rawDebugPath = path.join(__dirname, '..', 'debug-raw.txt');
  const cleanedDebugPath = path.join(__dirname, '..', 'debug-cleaned.txt');

  let result = null;
  let parsed = null;
  let cleanedAnalysis = '';

  const MAX_ATTEMPTS = 2;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const isRetry = attempt > 1;
    const prompt = buildPrompt(solutionA, solutionB, critiques, isRetry);

    // ==========================================
    // CALL LLM
    // ==========================================
    try {
      result = await callGPT(prompt, systemMessage);
    } catch (error) {
      console.error(`Judge: callGPT failed on attempt ${attempt}:`, error.message);
      result = '';
    }

    // ==========================================
    // DEBUG RAW RESPONSE
    // ==========================================
    try {
      fs.writeFileSync(rawDebugPath, String(result ?? ''), 'utf8');
    } catch (error) {
      console.error('DEBUG WRITE FAILED (raw):', error.message);
    }

    // ==========================================
    // EXTRACT + VALIDATE JSON
    // ==========================================
    const extracted = extractJSON(String(result ?? ''));
    parsed = extracted.parsed;

    // ==========================================
    // CLEAN ANALYSIS
    // ==========================================
    const rawText = String(result ?? '');
    const jsonStartIndex = rawText.indexOf('{');
    cleanedAnalysis = jsonStartIndex !== -1 ? rawText.slice(0, jsonStartIndex).trim() : rawText.trim();

    try {
      fs.writeFileSync(cleanedDebugPath, cleanedAnalysis, 'utf8');
    } catch (error) {
      console.error('DEBUG WRITE FAILED (cleaned):', error.message);
    }

    if (isValidShape(parsed)) {
      console.log(`Judge: got valid scores on attempt ${attempt}.`);
      break;
    }

    console.error(
      `Judge: attempt ${attempt}/${MAX_ATTEMPTS} returned an invalid/unparseable shape.` +
      (attempt < MAX_ATTEMPTS ? ' Retrying with a stricter prompt...' : ' Giving up.')
    );

    parsed = null;
  }

  // ==========================================
  // CALCULATE SCORES
  // ==========================================
  let scoreA = null;
  let scoreB = null;
  let winner = 'A';

  if (isValidShape(parsed)) {
    scoreA = computeWeightedScore(parsed.solutionA);
    scoreB = computeWeightedScore(parsed.solutionB);
    winner = scoreB > scoreA ? 'B' : 'A';

    console.log(`JUDGE SCORES -> A: ${scoreA}, B: ${scoreB}, WINNER: ${winner}`);
  } else {
    console.error('Judge: failed to parse structured scores from LLM output after all attempts.');
    console.error('Judge: raw response was saved to:', rawDebugPath);
  }

  // ==========================================
  // RETURN STANDARD AGENT RESPONSE
  // ==========================================
  return makeAgentResponse({
    agent: 'judge',
    analysis: cleanedAnalysis,
    score: winner === 'A' ? scoreA : scoreB,
    scores: { A: scoreA, B: scoreB },
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