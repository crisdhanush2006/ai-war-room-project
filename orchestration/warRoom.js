const { analyzeProblem } = require('../agents/problemAnalyzer');
const { generateSolutionA } = require('../agents/generatorA');
const { generateSolutionB } = require('../agents/generatorB');
const { refineSolution } = require('../agents/refiner');
const { critiqueCost } = require('../agents/costCritic');
const { critiqueFeasibility } = require('../agents/feasibilityCritic');
const { redTeamSolution } = require('../agents/redTeam');
const { judgeSolutions } = require('../agents/judge');

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

  // Pass all four critiques into the judge
  const verdict = await judgeSolutions(solutionA.analysis, solutionB.analysis, {
    costReviewA: costReviewA.analysis,
    feasibilityReviewA: feasibilityReviewA.analysis,
    costReviewB: costReviewB.analysis,
    feasibilityReviewB: feasibilityReviewB.analysis
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
    verdict, refined, redTeamReview,
    totalPastFindingsUsed
  };

  onEvent('done', result);
  return result;
}

module.exports = { runWarRoom };