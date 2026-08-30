const { analyzeProblem } = require('./problemAnalyzer');
const { generateSolutionA } = require('./generatorA');
const { refineSolution } = require('./refiner');

async function run() {
  const problem = 'How do we reduce food delivery time in a city with heavy traffic?';

  console.log('Step 1: Analyzing problem...');
  const analysis = await analyzeProblem(problem);

  console.log('Step 2: Generating solution A...');
  const solutionA = await generateSolutionA(analysis.analysis);

  console.log('Step 3: Refining solution...');
  const refined = await refineSolution(solutionA.analysis);
  console.log(JSON.stringify(refined, null, 2));
}

run();