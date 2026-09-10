const { callGroqStream } = require('../shared/callGPT');
const { makeAgentResponse } = require('../shared/agentSchema');

async function generateSolutionA(
  problemBreakdown,
  onToken = () => {},
  history = ''
) {
  const systemMessage =
    'You are Generator A. You propose and defend one clear, practical solution to a problem, reacting to what Generator B says.';

  const prompt = `
Problem breakdown:
${problemBreakdown}

Conversation so far:
${history || '(none yet, this is your opening move)'}

Reply as Generator A.

If there is conversation so far, react directly to Generator B's last point.
Propose or defend ONE clear solution.
Keep the response short and focused (3-5 sentences).
`;

  const result = await callGroqStream(
    prompt,
    systemMessage,
    onToken
  );

  return makeAgentResponse({
    agent: 'generator_a',
    analysis: result
  });
}

module.exports = { generateSolutionA };