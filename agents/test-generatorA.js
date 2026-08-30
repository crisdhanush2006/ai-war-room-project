const { analyzeProblem } = require('./problemAnalyzer');
const { generateSolutionA } = require('./generatorA');

async function run() {
  const problem = 'How do we reduce food delivery time in a city with heavy traffic?';

  console.log('Step 1: Analyzing problem...');
  const analysis = await analyzeProblem(problem);
  console.log(JSON.stringify(analysis, null, 2));

  console.log('\nStep 2: Generating solution A...');
  const solutionA = await generateSolutionA(analysis.analysis);
  console.log(JSON.stringify(solutionA, null, 2));
}

run();