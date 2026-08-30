const { analyzeProblem } = require('../agents/problemAnalyzer');
const { generateSolutionA } = require('../agents/generatorA');
const { generateSolutionB } = require('../agents/generatorB');
const { refineSolution } = require('../agents/refiner');
const { critiqueCost } = require('../agents/costCritic');
const { critiqueFeasibility } = require('../agents/feasibilityCritic');
const { redTeamSolution } = require('../agents/redTeam');
const { judgeSolutions } = require('../agents/judge');

// This one function runs the ENTIRE AI War Room pipeline.
// Give it a problem, get back everything: all agent outputs + final verdict.

async function runWarRoom(problem) {
  const analysis = await analyzeProblem(problem);

  const solutionA = await generateSolutionA(analysis.analysis);
  const solutionB = await generateSolutionB(analysis.analysis);

  const refinedA = await refineSolution(solutionA.analysis);

  const costReview = await critiqueCost(solutionB.analysis);
  const feasibilityReview = await critiqueFeasibility(solutionB.analysis);
  const redTeamReview = await redTeamSolution(solutionB.analysis);

  const verdict = await judgeSolutions(refinedA.analysis, solutionB.analysis);

  return {
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