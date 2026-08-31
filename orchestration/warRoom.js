const { analyzeProblem } = require('../agents/problemAnalyzer');
const { generateSolutionA } = require('../agents/generatorA');
const { generateSolutionB } = require('../agents/generatorB');
const { refineSolution } = require('../agents/refiner');
const { critiqueCost } = require('../agents/costCritic');
const { critiqueFeasibility } = require('../agents/feasibilityCritic');
const { redTeamSolution } = require('../agents/redTeam');
const { judgeSolutions } = require('../agents/judge');

// mode: 'quick' (4 agents) or 'full' (all 8 agents)
async function runWarRoom(problem, mode = 'full') {
  const analysis = await analyzeProblem(problem);
  const solutionA = await generateSolutionA(analysis.analysis);
  const refinedA = await refineSolution(solutionA.analysis);

  if (mode === 'quick') {
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
  const redTeamReview = await redTeamSolution(solutionB.analysis);
  const verdict = await judgeSolutions(refinedA.analysis, solutionB.analysis);

  return {
    mode,
    problem,
    analysis,
    solutionA,
    solutionB,
    refinedA,
    costReview,
    feasibilityReview,
    redTeamReview,
    verdict
  };
}

module.exports = { runWarRoom };