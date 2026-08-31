const { analyzeProblem } = require('../agents/problemAnalyzer');
const { generateSolutionA } = require('../agents/generatorA');
const { generateSolutionB } = require('../agents/generatorB');
const { refineSolution } = require('../agents/refiner');
const { critiqueCost } = require('../agents/costCritic');
const { critiqueFeasibility } = require('../agents/feasibilityCritic');
const { redTeamSolution } = require('../agents/redTeam');
const { judgeSolutions } = require('../agents/judge');

async function runWarRoom(problem, mode = 'full') {
  const analysis = await analyzeProblem(problem);
  const solutionA = await generateSolutionA(analysis.analysis);

  if (mode === 'quick') {
    const refinedA = await refineSolution(solutionA.analysis);
    return {
      mode,
      problem,
      analysis,
      solutionA,
      refinedA
    };
  }

  const solutionB = await generateSolutionB(analysis.analysis);
  const costReview = await critiqueCost(solutionB.analysis);
  const feasibilityReview = await critiqueFeasibility(solutionB.analysis);

  const verdict = await judgeSolutions(solutionA.analysis, solutionB.analysis);
  const winningSolution = verdict.winner === 'A' ? solutionA.analysis : solutionB.analysis;

  const refined = await refineSolution(winningSolution);
  const redTeamReview = await redTeamSolution(refined.analysis);

  return {
    mode,
    problem,
    analysis,
    solutionA,
    solutionB,
    costReview,
    feasibilityReview,
    verdict,
    refined,
    redTeamReview
  };
}

module.exports = { runWarRoom };