const { callGPT } = require('../shared/callGPT');

async function askFollowUp(context, question) {
  const systemMessage = 'You are the AI War Room assistant. You have full context of a problem analysis and multiple agent opinions. Answer the user\'s follow-up question clearly and specifically, referencing the relevant agents or solutions when helpful. Keep your answer focused and not overly long.';

  const prompt = `
Here is the full context of a previous War Room session:

PROBLEM: ${context.problem}

PROBLEM ANALYSIS:
${context.analysis}

SOLUTION A (refined):
${context.solutionA}

${context.solutionB ? `SOLUTION B:\n${context.solutionB}\n` : ''}
${context.verdict ? `FINAL VERDICT:\n${context.verdict}\n` : ''}

The user now has a follow-up question about this session:
"${question}"

Answer their question directly, using the context above.
`;

  const result = await callGPT(prompt, systemMessage);
  return result;
}

module.exports = { askFollowUp };