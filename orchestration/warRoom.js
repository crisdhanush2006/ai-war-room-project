const { findUnresolvedIssues } = require('../agents/judgeIssues');
const { respondToIssuesA } = require('../agents/issueResponseA');
const { respondToIssuesB } = require('../agents/issueResponseB');

const { analyzeProblem } = require('../agents/problemAnalyzer');

const { generateSolutionA } = require('../agents/generatorA');
const { generateSolutionB } = require('../agents/generatorB');

const { refineSolution } = require('../agents/refiner');

const { critiqueCost } = require('../agents/costCritic');
const { critiqueFeasibility } = require('../agents/feasibilityCritic');

const { redTeamSolution } = require('../agents/redTeam');

const { judgeSolutions } = require('../agents/judge');

const { generateRebuttalA } = require('../agents/rebuttalA');
const { generateRebuttalB } = require('../agents/rebuttalB');

const { generateCrossExamA } = require('../agents/crossExamA');
const { generateCrossExamB } = require('../agents/crossExamB');

const { generateVerifier } = require('../agents/verifier');


// ============================================================
// DEBATE LOOP
// ============================================================

async function runDebateLoop(
  analysis,
  onEvent = () => {},
  turns = 6
) {
  let history = '';
  const transcript = [];

  for (let i = 0; i < turns; i++) {
    const isA = i % 2 === 0;
    const speaker = isA ? 'A' : 'B';

    const fn = isA
      ? generateSolutionA
      : generateSolutionB;

    try {
      const turn = await fn(
        analysis,
        (chunk) => onEvent(`turn_${i}:delta`, chunk),
        history
      );

      const text =
        typeof turn === 'string'
          ? turn
          : turn?.analysis || '';

      const safeText = String(text || '').trim();

      onEvent(`turn_${i}`, {
        speaker,
        text: safeText
      });

      history += `\n${speaker}: ${safeText}`;

      transcript.push({
        speaker,
        text: safeText
      });

    } catch (error) {
      console.error(`Debate turn ${i} failed:`, error);

      const errorText =
        `Turn ${i + 1} failed: ${error.message || 'Unknown error'}`;

      onEvent(`turn_${i}`, {
        speaker,
        text: errorText,
        error: true
      });

      history += `\n${speaker}: ${errorText}`;

      transcript.push({
        speaker,
        text: errorText,
        error: true
      });
    }
  }

  return transcript;
}


// ============================================================
// MAIN WAR ROOM
// ============================================================

async function runWarRoom(
  problem,
  mode = 'full',
  onEvent = () => {},
  debateStyle = 'balanced'
) {

  function streamFor(key) {
    return (chunk) => onEvent(`${key}:delta`, chunk);
  }


  // ============================================================
  // 1. PROBLEM ANALYSIS
  // ============================================================

  const analysis = await analyzeProblem(
    problem,
    streamFor('analysis')
  );

  onEvent('analysis', analysis);


  // ============================================================
  // 2. LIVE DEBATE (A vs B, TURN BY TURN)
  // ============================================================

  const transcript = await runDebateLoop(
    analysis.analysis,
    onEvent,
    6
  );

  onEvent('debateTranscript', transcript);


  // ============================================================
  // GET LAST A AND B DEBATE TURNS
  // ============================================================

  const aTurns = transcript.filter(
    (turn) => turn.speaker === 'A'
  );

  const bTurns = transcript.filter(
    (turn) => turn.speaker === 'B'
  );

  const lastATurn = aTurns[aTurns.length - 1];
  const lastBTurn = bTurns[bTurns.length - 1];


  // ============================================================
  // SAFETY FALLBACK
  // ============================================================

  const solutionA = {
    analysis: lastATurn?.text || ''
  };

  const solutionB = {
    analysis: lastBTurn?.text || ''
  };


  onEvent('solutionA', solutionA);
  onEvent('solutionB', solutionB);


  // ============================================================
  // QUICK MODE
  // ============================================================

  if (mode === 'quick') {

    const refined = await refineSolution(
      solutionA.analysis,
      streamFor('refined'),
      debateStyle
    );

    onEvent('refined', refined);

    const result = {
      mode,
      problem,
      analysis,
      transcript,
      solutionA,
      refined
    };

    onEvent('done', result);

    return result;
  }


  // ============================================================
  // 3. COST REVIEW - SOLUTION A
  // ============================================================

  const costReviewA = await critiqueCost(
    solutionA.analysis,
    streamFor('costReviewA'),
    debateStyle
  );

  onEvent('costReviewA', costReviewA);


  // ============================================================
  // 4. FEASIBILITY REVIEW - SOLUTION A
  // ============================================================

  const feasibilityReviewA = await critiqueFeasibility(
    solutionA.analysis,
    streamFor('feasibilityReviewA'),
    debateStyle
  );

  onEvent('feasibilityReviewA', feasibilityReviewA);


  // ============================================================
  // 5. COST REVIEW - SOLUTION B
  // ============================================================

  const costReviewB = await critiqueCost(
    solutionB.analysis,
    streamFor('costReviewB'),
    debateStyle
  );

  onEvent('costReviewB', costReviewB);


  // ============================================================
  // 6. FEASIBILITY REVIEW - SOLUTION B
  // ============================================================

  const feasibilityReviewB = await critiqueFeasibility(
    solutionB.analysis,
    streamFor('feasibilityReviewB'),
    debateStyle
  );

  onEvent('feasibilityReviewB', feasibilityReviewB);


  // ============================================================
  // 7. REBUTTAL A
  // ============================================================

  const rebuttalA = await generateRebuttalA(
    solutionA.analysis,
    solutionB.analysis,
    costReviewA.analysis,
    feasibilityReviewA.analysis,
    costReviewB.analysis,
    feasibilityReviewB.analysis,
    streamFor('rebuttalA'),
    debateStyle
  );

  onEvent('rebuttalA', rebuttalA);


  // ============================================================
  // 8. REBUTTAL B
  // ============================================================

  const rebuttalB = await generateRebuttalB(
    solutionA.analysis,
    solutionB.analysis,
    costReviewA.analysis,
    feasibilityReviewA.analysis,
    costReviewB.analysis,
    feasibilityReviewB.analysis,
    streamFor('rebuttalB'),
    debateStyle
  );

  onEvent('rebuttalB', rebuttalB);


  // ============================================================
  // 9. CROSS EXAMINATION A
  // ============================================================

  const crossExamA = await generateCrossExamA(
    solutionA.analysis,
    solutionB.analysis,
    rebuttalA.analysis,
    rebuttalB.analysis,
    streamFor('crossExamA'),
    debateStyle
  );

  onEvent('crossExamA', crossExamA);


  // ============================================================
  // 10. CROSS EXAMINATION B
  // ============================================================

  const crossExamB = await generateCrossExamB(
    solutionA.analysis,
    solutionB.analysis,
    rebuttalA.analysis,
    rebuttalB.analysis,
    streamFor('crossExamB'),
    debateStyle
  );

  onEvent('crossExamB', crossExamB);


  // ============================================================
  // 11. VERIFIER
  // ============================================================

  const verifier = await generateVerifier(
    solutionA.analysis,
    solutionB.analysis,
    crossExamA.analysis,
    crossExamB.analysis,
    streamFor('verifier')
  );

  onEvent('verifier', verifier);


  // ============================================================
  // 12. FIND UNRESOLVED ISSUES
  // ============================================================

  const judgeIssues = await findUnresolvedIssues(
    solutionA.analysis,
    solutionB.analysis,
    crossExamA.analysis,
    crossExamB.analysis,
    streamFor('judgeIssues'),
    debateStyle
  );

  onEvent('judgeIssues', judgeIssues);


  // ============================================================
  // 13. ISSUE RESPONSE A
  // ============================================================

  const issueResponseA = await respondToIssuesA(
    solutionA.analysis,
    judgeIssues.analysis,
    streamFor('issueResponseA'),
    debateStyle
  );

  onEvent('issueResponseA', issueResponseA);


  // ============================================================
  // 14. ISSUE RESPONSE B
  // ============================================================

  const issueResponseB = await respondToIssuesB(
    solutionB.analysis,
    judgeIssues.analysis,
    streamFor('issueResponseB'),
    debateStyle
  );

  onEvent('issueResponseB', issueResponseB);


  // ============================================================
  // 15. FINAL JUDGE
  // ============================================================

  const verdict = await judgeSolutions(
    solutionA.analysis,
    solutionB.analysis,
    {
      costReviewA: costReviewA.analysis,
      feasibilityReviewA: feasibilityReviewA.analysis,

      costReviewB: costReviewB.analysis,
      feasibilityReviewB: feasibilityReviewB.analysis,

      rebuttalA: rebuttalA.analysis,
      rebuttalB: rebuttalB.analysis,

      crossExamA: crossExamA.analysis,
      crossExamB: crossExamB.analysis,

      verifier: verifier.analysis,

      judgeIssues: judgeIssues.analysis,

      issueResponseA: issueResponseA.analysis,
      issueResponseB: issueResponseB.analysis
    },
    streamFor('verdict')
  );

  onEvent('verdict', verdict);


  // ============================================================
  // 16. SELECT WINNING SOLUTION
  // ============================================================

  const winningSolution =
    verdict?.winner === 'B'
      ? solutionB.analysis
      : solutionA.analysis;


  // ============================================================
  // 17. REFINE WINNING SOLUTION
  // ============================================================

  const refined = await refineSolution(
    winningSolution,
    streamFor('refined'),
    debateStyle
  );

  onEvent('refined', refined);


  // ============================================================
  // 18. RED TEAM REVIEW
  // ============================================================

  const redTeamReview = await redTeamSolution(
    refined.analysis,
    streamFor('redTeamReview'),
    debateStyle
  );

  onEvent('redTeamReview', redTeamReview);


  // ============================================================
  // 19. TOTAL PAST FINDINGS
  // ============================================================

  const totalPastFindingsUsed =
    (costReviewA.pastFindingsUsed || 0) +
    (feasibilityReviewA.pastFindingsUsed || 0) +
    (costReviewB.pastFindingsUsed || 0) +
    (feasibilityReviewB.pastFindingsUsed || 0) +
    (redTeamReview.pastFindingsUsed || 0);


  // ============================================================
  // 20. FINAL RESULT
  // ============================================================

  const result = {
    mode,
    problem,

    analysis,

    transcript,

    solutionA,
    solutionB,

    costReviewA,
    feasibilityReviewA,

    costReviewB,
    feasibilityReviewB,

    rebuttalA,
    rebuttalB,

    crossExamA,
    crossExamB,

    verifier,

    judgeIssues,

    issueResponseA,
    issueResponseB,

    verdict,

    refined,

    redTeamReview,

    totalPastFindingsUsed
  };


  // ============================================================
  // 21. DONE
  // ============================================================

  onEvent('done', result);

  return result;
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  runWarRoom,
  runDebateLoop
};