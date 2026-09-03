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

async function critiqueCost(solutionText) {
  const systemMessage = 'You are a Cost Critic. You analyze solutions ONLY from a cost/budget perspective, and you stay alert to cost traps this system has been fooled by before.';

  const pastFindings = loadPastFindings();

  const prompt = `
Analyze this solution ONLY from a cost perspective:
- What parts are expensive?
- What are the biggest cost risks?
- Give a cost score out of 100 (100 = very cheap/efficient, 0 = extremely expensive)

Here are real flaws this system has caught in past solutions (some may be cost-related, some not - use only what's relevant, don't force a connection):
${pastFindings}

Solution:
${solutionText}
`;

  const result = await callGPT(prompt, systemMessage);

    const findingsCount = pastFindings === 'No past findings yet.' ? 0 : pastFindings.split('\n').length;

  return makeAgentResponse({
    agent: 'cost_critic',
    analysis: result,
    pastFindingsUsed: findingsCount
  });
}

module.exports = { critiqueCost };