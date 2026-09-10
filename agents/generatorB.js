const { callGroqStream } = require('../shared/callGPT');
const { makeAgentResponse } = require('../shared/agentSchema');

async function generateSolutionB(
  problemBreakdown,
  onToken = () => {},
  history = ''
) {
  const systemMessage =
    'You are Generator B. You propose and defend one clear, practical solution to a problem, reacting critically to what Generator A says.';

  const prompt = `
Problem breakdown:
${problemBreakdown}

Conversation so far:
${history || '(none yet, this is your opening move)'}

Reply as Generator B.

If there is conversation so far, react directly to Generator A's last point.
Propose or defend ONE clear solution.
Keep the response short and focused (3-5 sentences).
`;

  const result = await callGroqStream(
    prompt,
    systemMessage,
    onToken
  );

  return makeAgentResponse({
    agent: 'generator_b',
    analysis: result
  });
}

module.exports = { generateSolutionB };