const fs = require('fs');
const path = require('path');

const { callGPT, callGPTStream } = require('../shared/callGPT');
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

  const start = text.indexOf('{');

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
  const issueResponseA = critiques.issueResponseA || 'No response provided.';
  const issueResponseB = critiques.issueResponseB || 'No response provided.';
  const verifier = critiques.verifier || 'No verification performed.';

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

FACT-CHECK RESULTS FROM AN INDEPENDENT VERIFIER:
${verifier}

Treat "Verified" claims as strong evidence for the "evidence" score. Treat "Overstated" or "False" claims as evidence AGAINST the side that made them — this should meaningfully lower their "evidence" score, and can also affect "reliability" if the false claim was central to their argument.
SOLUTION A'S RESPONSE TO THE JUDGE'S FLAGGED ISSUES:
${issueResponseA}

SOLUTION B'S RESPONSE TO THE JUDGE'S FLAGGED ISSUES:
${issueResponseB}

These are each side's final, most direct chance to resolve the specific unresolved issues. If a side honestly admits it cannot fully resolve an issue, weigh that as an unresolved risk, not as a full failure — honesty about a limitation should not be penalized more harshly than evasion.

Criteria to score from 0-100:
- feasibility
- practicality
- cost
- reliability
- evidence
- scalability
- novelty

If both solutions rest on unresolved assumptions that neither side has adequately addressed — even after rebuttals, cross-examination, and issue responses — score them honestly rather than artificially inflating one side to force a winner. A close or ambiguous case is still valid; the scores themselves will reflect that.

First, write a short paragraph explaining your reasoning for each solution. If the case is genuinely too close or too unresolved to declare a clear winner, say so explicitly in this paragraph and explain what specific evidence would be needed to break the tie.

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
// STREAM GATE
// Forwards text to onToken ONLY up until the
// JSON blob starts. Once we see the opening
// "{", we stop forwarding (so the raw JSON
// never flashes on screen) but keep collecting
// the full text internally so it can still be
// parsed once the stream finishes.
// ==========================================
function createStreamGate(onToken) {
  let seenSoFar = '';
  let forwardedLength = 0;
  let jsonStarted = false;

  return function handleChunk(chunkText) {
    seenSoFar += chunkText;

    if (jsonStarted) {
      return; // already past the reasoning paragraph, stay quiet
    }

    const braceIndex = seenSoFar.indexOf('{');

    if (braceIndex === -1) {
      // No JSON yet — forward everything new
      const newText = seenSoFar.slice(forwardedLength);
      if (newText) {
        onToken(newText);
        forwardedLength = seenSoFar.length;
      }
      return;
    }

    // JSON just started somewhere in this chunk —
    // forward only the reasoning text that comes before it
    const newPrefixText = seenSoFar.slice(forwardedLength, braceIndex);
    if (newPrefixText) {
      onToken(newPrefixText);
    }
    forwardedLength = braceIndex;
    jsonStarted = true;
  };
}

// ==========================================
// JUDGE SOLUTIONS
// ==========================================
async function judgeSolutions(solutionA, solutionB, critiques = {}, onToken = () => {}) {
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
    // Only stream live on the first attempt.
    // A retry (rare) just runs quietly and the
    // final "verdict" event still updates the UI
    // with the correct final text.
    // ==========================================
    try {
      if (!isRetry) {
        const streamGate = createStreamGate(onToken);
        result = await callGPTStream(prompt, systemMessage, streamGate);
      } else {
        result = await callGPT(prompt, systemMessage);
      }
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

  const TIE_THRESHOLD = 3;

  if (isValidShape(parsed)) {
    scoreA = computeWeightedScore(parsed.solutionA);
    scoreB = computeWeightedScore(parsed.solutionB);

    if (Math.abs(scoreA - scoreB) <= TIE_THRESHOLD) {
      winner = 'NONE';
    } else {
      winner = scoreB > scoreA ? 'B' : 'A';
    }

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

module.exports = {
  judgeSolutions
};