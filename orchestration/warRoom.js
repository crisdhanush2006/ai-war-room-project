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
    const refinedA = await refineSolution(solutionA.analysis);
    onEvent('refinedA', refinedA);

    const result = { mode, problem, analysis, solutionA, refinedA };
    onEvent('done', result);
    return result;
  }

  const solutionB = await generateSolutionB(analysis.analysis);
  onEvent('solutionB', solutionB);

  const costReview = await critiqueCost(solutionB.analysis);
  onEvent('costReview', costReview);

  const feasibilityReview = await critiqueFeasibility(solutionB.analysis);
  onEvent('feasibilityReview', feasibilityReview);

  const verdict = await judgeSolutions(solutionA.analysis, solutionB.analysis);
  onEvent('verdict', verdict);

  const winningSolution = verdict.winner === 'A' ? solutionA.analysis : solutionB.analysis;

  const refined = await refineSolution(winningSolution);
  onEvent('refined', refined);

  const redTeamReview = await redTeamSolution(refined.analysis);
  onEvent('redTeamReview', redTeamReview);

  const result = {
    mode, problem, analysis, solutionA, solutionB,
    costReview, feasibilityReview, verdict, refined, redTeamReview
  };

  onEvent('done', result);
  return result;
}

module.exports = { runWarRoom };