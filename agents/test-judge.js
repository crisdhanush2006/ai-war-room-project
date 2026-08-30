const { analyzeProblem } = require('./problemAnalyzer');
const { generateSolutionA } = require('./generatorA');
const { refineSolution } = require('./refiner');
const { judgeSolutions } = require('./judge');

async function run() {
  const problem = 'How do we reduce food delivery time in a city with heavy traffic?';

  console.log('Step 1: Analyzing problem...');
  const analysis = await analyzeProblem(problem);

  console.log('Step 2: Generating solution A...');
  const solutionA = await generateSolutionA(analysis.analysis);

  console.log('Step 3: Refining solution A...');
  const refinedA = await refineSolution(solutionA.analysis);

  // Fake solution B for now (your friend will build the real Generator B later)
  const fakeSolutionB = 'Solution B: Use drones for all deliveries within a 5km radius, bypassing roads entirely.';

  console.log('Step 4: Judge comparing solutions...');
  const verdict = await judgeSolutions(refinedA.analysis, fakeSolutionB);
  console.log(JSON.stringify(verdict, null, 2));
}

run();