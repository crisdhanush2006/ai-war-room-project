const fs = require('fs');
const path = require('path');
const { callGPT } = require('../shared/callGPT');
const { makeAgentResponse } = require('../shared/agentSchema');

const MEMORY_PATH = path.join(__dirname, '..', 'memory', 'redTeamFindings.json');
const MAX_MEMORY_ENTRIES = 25;

function loadMemory() {
  try {
    const raw = fs.readFileSync(MEMORY_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveFinding(finding) {
  const memory = loadMemory();
  memory.push({
    finding: finding,
    timestamp: new Date().toISOString()
  });

  // Keep only the most recent entries so the file doesn't grow forever
  const trimmed = memory.slice(-MAX_MEMORY_ENTRIES);

  try {
    fs.mkdirSync(path.dirname(MEMORY_PATH), { recursive: true });
    fs.writeFileSync(MEMORY_PATH, JSON.stringify(trimmed, null, 2));
  } catch (e) {
    console.error('Red Team: failed to save memory:', e.message);
  }
}

function getPastFindingsSummary() {
  const memory = loadMemory();
  if (memory.length === 0) return 'No past findings yet.';

  return memory
    .slice(-10)
    .map((entry, i) => `${i + 1}. ${entry.finding}`)
    .join('\n');
}

async function redTeamSolution(solutionText) {
  const systemMessage = 'You are a Red Team. Your job is to attack this solution and find its worst weaknesses, like an adversary would.';

  const pastFindings = getPastFindingsSummary();

  const prompt = `
Attack this solution like a critic trying to break it:
- What is the single biggest way this fails?
- What edge cases or bad actors could exploit it?
- What would make this solution fail completely in the real world?

Here are flaw patterns this system has caught in past solutions (for reference, do not repeat them verbatim, but stay alert to similar patterns if relevant):
${pastFindings}

Solution:
${solutionText}

At the very end, on its own line, write a one-sentence summary of the single biggest flaw found, prefixed exactly like this:
KEY_FLAW: <your one sentence summary here>
`;

  const result = await callGPT(prompt, systemMessage);

  const match = result.match(/KEY_FLAW:\s*(.+)/);
  if (match && match[1]) {
    saveFinding(match[1].trim());
  }

   const findingsCount = pastFindings === 'No past findings yet.' ? 0 : pastFindings.split('\n').length;

  return makeAgentResponse({
    agent: 'red_team',
    analysis: result,
    pastFindingsUsed: findingsCount
  });
}

module.exports = { redTeamSolution };