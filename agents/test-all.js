const { analyzeProblem } = require('./problemAnalyzer');
const { generateSolutionA } = require('./generatorA');
const { generateSolutionB } = require('./generatorB');
const { refineSolution } = require('./refiner');
const { critiqueCost } = require('./costCritic');
const { critiqueFeasibility } = require('./feasibilityCritic');
const { redTeamSolution } = require('./redTeam');
const { judgeSolutions } = require('./judge');

async function run() {
  const problem = 'How do we reduce food delivery time in a city with heavy traffic?';

  console.log('1. Analyzing problem...');
  const analysis = await analyzeProblem(problem);

  console.log('2. Generating solution A...');
  const solutionA = await generateSolutionA(analysis.analysis);

  console.log('3. Generating solution B...');
  const solutionB = await generateSolutionB(analysis.analysis);

  console.log('4. Refining solution A...');
  const refinedA = await refineSolution(solutionA.analysis);

  console.log('5. Cost critique on solution B...');
  const costReview = await critiqueCost(solutionB.analysis);

  console.log('6. Feasibility critique on solution B...');
  const feasibilityReview = await critiqueFeasibility(solutionB.analysis);

  console.log('7. Red team attacking solution B...');
  const redTeamReview = await redTeamSolution(solutionB.analysis);

  console.log('8. Judge comparing final solutions...');
  const verdict = await judgeSolutions(refinedA.analysis, solutionB.analysis);

  console.log('\n=== FINAL VERDICT ===');
  console.log(verdict.analysis);
}

run();