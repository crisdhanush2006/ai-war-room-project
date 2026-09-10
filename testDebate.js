require('dotenv').config();

const { runWarRoom } = require('./orchestration/warRoom.js');

async function test() {
  const problem = "We need a way to reduce food delivery time in a city with heavy traffic.";

  await runWarRoom(problem, 'full', (event, data) => {
    if (event.endsWith(':delta')) return; // skip noisy streaming logs
    console.log('\n===', event, '===');
    console.log(data);
  });
}

test();