// Every agent must return data in this exact shape.
// This is the "contract" between you and your friend.

function makeAgentResponse({ agent, analysis, issues = [], score = null, recommendations = [], ...extra }) {
  return {
    agent,            // name of the agent, e.g. "problem_analyzer"
    analysis,          // the main text output
    issues,            // list of problems found (can be empty array)
    score,             // number 0-100, or null if not scored
    recommendations,   // list of suggestions (can be empty array)
    timestamp: new Date().toISOString(),
    ...extra          // any additional agent-specific fields (e.g. pastFindingsUsed, scores, breakdown)
  };
}

module.exports = { makeAgentResponse };