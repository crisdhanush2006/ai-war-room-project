# 🧠 AI War Room

AI War Room is a multi-agent debate system where multiple AI agents independently analyze a problem, propose competing solutions, critique each other's cost and feasibility, cross-examine rebuttals, fact-check claims, and reach a judged verdict — all in a single automated pipeline.

Instead of asking one AI for one answer, this system simulates a panel of specialized AI roles that argue, challenge, and verify each other before producing a final, refined recommendation.

## Live Demo
Run locally — see setup instructions below.

## Why this project?
Most AI tools give you one confident-sounding answer. AI War Room instead:
- Forces two independent solutions to compete
- Has dedicated critics attack each solution's cost and feasibility
- Runs a fact-verification agent that checks claims for evidence
- Uses a Red Team to stress-test the final recommendation
- Produces a transparent, scored verdict instead of a black-box answer

## Architecture
User Problem leads to a Problem Analyzer, which produces Solution A and Solution B. Both go through Cost and Feasibility Critics, then Rebuttal A and B, then Cross-Examination. A Verifier fact-checks all claims. The Judge raises unresolved issues, gets Issue Responses, then delivers a Final Verdict with a scored breakdown. This leads to a Refined Solution, which the Red Team stress-tests, producing the Final Report as a PDF.

## Features
- Multi-agent debate pipeline: 8+ specialized AI agents in Full mode, 4 in Quick mode
- Live streaming responses: text appears in real time as each agent thinks
- Fact-verification layer: claims are checked and labeled Verified, Overstated, or Unsourced
- Scored judge verdict: weighted scoring across Feasibility, Cost, Reliability, Evidence, Scalability, and Novelty
- Debate styles: Balanced, Aggressive, Scientific, Legal
- Memory system: learns from past runs to inform future critiques
- PDF export: download the full debate as a report
- Follow-up Q&A: ask questions about the completed debate
- Run history: revisit past debates anytime

## Tech Stack
- Backend: Node.js, Express
- AI: Google Gemini API (streaming)
- Frontend: Vanilla JavaScript, HTML, CSS (no framework, lightweight by design)
- PDF Generation: jsPDF

## Setup
Clone the repo: git clone https://github.com/crisdhanush2006/ai-war-room-project.git
Then: cd ai-war-room-project
Then: npm install
Create a .env file with your Gemini API key: GEMINI_API_KEY=your_key_here
Run the server: node server.js
Open http://localhost:3000 in your browser.

## Screenshots
(Add screenshots or a demo GIF here)

## Future Improvements
- Trust score badge summarizing verifier findings
- Visual score charts (Solution A vs B across rounds)
- User mid-debate interruption
- Multi-room support for different problem categories

## Author
Built by Dhanush Kumar V as a personal project exploring multi-agent AI systems.