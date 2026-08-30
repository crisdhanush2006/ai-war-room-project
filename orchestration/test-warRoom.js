const { runWarRoom } = require('./warRoom');

async function run() {
  const problem = 'How do we reduce food delivery time in a city with heavy traffic?';

  console.log('Running full War Room pipeline...\n');
  const result = await runWarRoom(problem);

  console.log('=== FINAL VERDICT ===');
  console.log(result.verdict.analysis);
}

run();