const { analyzeProblem } = require('./problemAnalyzer');

async function run() {
  const result = await analyzeProblem('How do we reduce food delivery time in a city with heavy traffic?');
  console.log(JSON.stringify(result, null, 2));
}

run();