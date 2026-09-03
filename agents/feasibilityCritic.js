const fs = require('fs');
const path = require('path');
const { callGPT } = require('../shared/callGPT');
const { makeAgentResponse } = require('../shared/agentSchema');

const MEMORY_PATH = path.join(__dirname, '..', 'memory', 'redTeamFindings.json');

function loadPastFindings() {
  try {
    const raw = fs.readFileSync(MEMORY_PATH, 'utf8');
    const memory = JSON.parse(raw);
    if (memory.length === 0) return 'No past findings yet.';

    return memory
      .slice(-10)
      .map((entry, i) => `${i + 1}. ${entry.finding}`)
      .join('\n');
  } catch (e) {
    return 'No past findings yet.';
  }
}

async function critiqueFeasibility(solutionText) {
  const systemMessage = 'You are a Feasibility Critic. You analyze solutions ONLY from a real-world practicality perspective, and you stay alert to feasibility traps this system has been fooled by before.';

  const pastFindings = loadPastFindings();

  const prompt = `
Analyze this solution ONLY from a feasibility perspective:
- What parts are hard or unrealistic to build?
- What technical, legal, or logistical barriers exist?
- Give a feasibility score out of 100 (100 = very realistic, 0 = impossible)

Here are real flaws this system has caught in past solutions (some may be feasibility-related, some not - use only what's relevant, don't force a connection):
${pastFindings}

Solution:
${solutionText}
`;

  const result = await callGPT(prompt, systemMessage);

  return makeAgentResponse({
    agent: 'feasibility_critic',
    analysis: result
  });
}

module.exports = { critiqueFeasibility };