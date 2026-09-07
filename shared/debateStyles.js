// Maps a debate style name to an instruction string that gets
// appended to every agent's system message. This is the ONLY
// place style behavior is defined — add new styles here.

const DEBATE_STYLES = {
  balanced: '',

  aggressive: `
Adopt an aggressive, combative tone. Attack weaknesses forcefully,
use confident and assertive language, and do not soften your claims
with excessive hedging. Be direct about why the other side is wrong.`,

  scientific: `
Prioritize evidence, data, and methodology over rhetoric. Every claim
should be framed in terms of what can be measured, tested, or verified.
Explicitly flag assumptions that lack evidence. Avoid emotional or
persuasive language — reason like a researcher.`,

  legal: `
Argue like a lawyer building a case. Structure your points as claims
backed by "evidence" and "precedent"-style reasoning. Anticipate
counter-arguments and pre-empt them. Use precise, formal language.`
};

function getStyleInstruction(style) {
  return DEBATE_STYLES[style] || '';
}

module.exports = { getStyleInstruction };