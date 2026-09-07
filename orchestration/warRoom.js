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
  // 2. GENERATE SOLUTION A
  // ============================================================

  const solutionA = await generateSolutionA(
    analysis.analysis,
    streamFor('solutionA'),
    debateStyle
  );

  onEvent('solutionA', solutionA);


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
      solutionA,
      refined
    };

    onEvent('done', result);

    return result;
  }


  // ============================================================
  // 3. GENERATE SOLUTION B
  // ============================================================

  const solutionB = await generateSolutionB(
    analysis.analysis,
    streamFor('solutionB'),
    debateStyle
  );

  onEvent('solutionB', solutionB);


  // ============================================================
  // 4. COST REVIEW - SOLUTION A
  // ============================================================

  const costReviewA = await critiqueCost(
    solutionA.analysis,
    streamFor('costReviewA'),
    debateStyle
  );

  onEvent('costReviewA', costReviewA);


  // ============================================================
  // 5. FEASIBILITY REVIEW - SOLUTION A
  // ============================================================

  const feasibilityReviewA = await critiqueFeasibility(
    solutionA.analysis,
    streamFor('feasibilityReviewA'),
    debateStyle
  );

  onEvent('feasibilityReviewA', feasibilityReviewA);


  // ============================================================
  // 6. COST REVIEW - SOLUTION B
  // ============================================================

  const costReviewB = await critiqueCost(
    solutionB.analysis,
    streamFor('costReviewB'),
    debateStyle
  );

  onEvent('costReviewB', costReviewB);


  // ============================================================
  // 7. FEASIBILITY REVIEW - SOLUTION B
  // ============================================================

  const feasibilityReviewB = await critiqueFeasibility(
    solutionB.analysis,
    streamFor('feasibilityReviewB'),
    debateStyle
  );

  onEvent('feasibilityReviewB', feasibilityReviewB);


  // ============================================================
  // 8. REBUTTAL A
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
  // 9. REBUTTAL B
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
  // 10. CROSS EXAMINATION A
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
  // 11. CROSS EXAMINATION B
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
  // 12. VERIFIER
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
  // 13. FIND UNRESOLVED ISSUES
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
  // 14. ISSUE RESPONSE A
  // ============================================================

  const issueResponseA = await respondToIssuesA(
    solutionA.analysis,
    judgeIssues.analysis,
    streamFor('issueResponseA'),
    debateStyle
  );

  onEvent('issueResponseA', issueResponseA);


  // ============================================================
  // 15. ISSUE RESPONSE B
  // ============================================================

  const issueResponseB = await respondToIssuesB(
    solutionB.analysis,
    judgeIssues.analysis,
    streamFor('issueResponseB'),
    debateStyle
  );

  onEvent('issueResponseB', issueResponseB);


  // ============================================================
  // 16. FINAL JUDGE
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

      verifier: verifier.analysis
    },
    streamFor('verdict')
  );

  onEvent('verdict', verdict);


  // ============================================================
  // 17. SELECT WINNING SOLUTION
  // ============================================================

  const winningSolution =
    verdict.winner === 'B'
      ? solutionB.analysis
      : solutionA.analysis;


  // ============================================================
  // 18. REFINE WINNING SOLUTION
  // ============================================================

  const refined = await refineSolution(
    winningSolution,
    streamFor('refined'),
    debateStyle
  );

  onEvent('refined', refined);


  // ============================================================
  // 19. RED TEAM REVIEW
  // ============================================================

  const redTeamReview = await redTeamSolution(
    refined.analysis,
    streamFor('redTeamReview'),
    debateStyle
  );

  onEvent('redTeamReview', redTeamReview);


  // ============================================================
  // 20. TOTAL PAST FINDINGS
  // ============================================================

  const totalPastFindingsUsed =
    (costReviewA.pastFindingsUsed || 0) +
    (feasibilityReviewA.pastFindingsUsed || 0) +
    (costReviewB.pastFindingsUsed || 0) +
    (feasibilityReviewB.pastFindingsUsed || 0) +
    (redTeamReview.pastFindingsUsed || 0);


  // ============================================================
  // 21. FINAL RESULT
  // ============================================================

  const result = {
    mode,
    problem,

    analysis,

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
  // 22. DONE
  // ============================================================

  onEvent('done', result);

  return result;
}


module.exports = {
  runWarRoom
};