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

async function runWarRoom(problem, mode = 'full', onEvent = () => {}) {
  const analysis = await analyzeProblem(problem);
  onEvent('analysis', analysis);

  const solutionA = await generateSolutionA(analysis.analysis);
  onEvent('solutionA', solutionA);

  if (mode === 'quick') {
    const refined = await refineSolution(solutionA.analysis);
    onEvent('refined', refined);

    const result = { mode, problem, analysis, solutionA, refined };
    onEvent('done', result);
    return result;
  }

  const solutionB = await generateSolutionB(analysis.analysis);
  onEvent('solutionB', solutionB);

  // Critique BOTH solutions on cost and feasibility
  const costReviewA = await critiqueCost(solutionA.analysis);
  onEvent('costReviewA', costReviewA);

  const feasibilityReviewA = await critiqueFeasibility(solutionA.analysis);
  onEvent('feasibilityReviewA', feasibilityReviewA);

  const costReviewB = await critiqueCost(solutionB.analysis);
  onEvent('costReviewB', costReviewB);

  const feasibilityReviewB = await critiqueFeasibility(solutionB.analysis);
  onEvent('feasibilityReviewB', feasibilityReviewB);

  // Rebuttal round — each side defends itself against the other + critiques
  const rebuttalA = await generateRebuttalA(
    solutionA.analysis, solutionB.analysis,
    costReviewA.analysis, feasibilityReviewA.analysis,
    costReviewB.analysis, feasibilityReviewB.analysis
  );
  onEvent('rebuttalA', rebuttalA);

  const rebuttalB = await generateRebuttalB(
    solutionA.analysis, solutionB.analysis,
    costReviewA.analysis, feasibilityReviewA.analysis,
    costReviewB.analysis, feasibilityReviewB.analysis
  );
  onEvent('rebuttalB', rebuttalB);

  // Cross-examination round — each side directly responds to the other's rebuttal
  const crossExamA = await generateCrossExamA(
    solutionA.analysis, solutionB.analysis,
    rebuttalA.analysis, rebuttalB.analysis
  );
  onEvent('crossExamA', crossExamA);

  const crossExamB = await generateCrossExamB(
    solutionA.analysis, solutionB.analysis,
    rebuttalA.analysis, rebuttalB.analysis
  );
  onEvent('crossExamB', crossExamB);

  // Pass all critiques + rebuttals + cross-exam into the judge
  const verdict = await judgeSolutions(solutionA.analysis, solutionB.analysis, {
    costReviewA: costReviewA.analysis,
    feasibilityReviewA: feasibilityReviewA.analysis,
    costReviewB: costReviewB.analysis,
    feasibilityReviewB: feasibilityReviewB.analysis,
    rebuttalA: rebuttalA.analysis,
    rebuttalB: rebuttalB.analysis,
    crossExamA: crossExamA.analysis,
    crossExamB: crossExamB.analysis
  });
  onEvent('verdict', verdict);

  const winningSolution = verdict.winner === 'A' ? solutionA.analysis : solutionB.analysis;

  const refined = await refineSolution(winningSolution);
  onEvent('refined', refined);

  const redTeamReview = await redTeamSolution(refined.analysis);
  onEvent('redTeamReview', redTeamReview);
  const totalPastFindingsUsed =
    (costReviewA.pastFindingsUsed || 0) +
    (feasibilityReviewA.pastFindingsUsed || 0) +
    (costReviewB.pastFindingsUsed || 0) +
    (feasibilityReviewB.pastFindingsUsed || 0) +
    (redTeamReview.pastFindingsUsed || 0);

  const result = {
    mode, problem, analysis, solutionA, solutionB,
    costReviewA, feasibilityReviewA, costReviewB, feasibilityReviewB,
    rebuttalA, rebuttalB,
    crossExamA, crossExamB,
    verdict, refined, redTeamReview,
    totalPastFindingsUsed
  };

  onEvent('done', result);
  return result;
}

module.exports = { runWarRoom };