# AI Coding Assessment Platform: Implementation Plan

An intelligent, full-stack technical assessment and learning platform for evaluating software engineers with real-time browser coding, sandboxed execution, and multi-agent AI mentoring powered by Gemini.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural parameters have been confirmed for the roadmap:
> - **Immediate MVP Focus**: Phase 1 focuses on the **Coding Problem Library**, **Monaco Workspace**, and **Execution Proxy / Test Runner**, establishing the core interactive developer loop first.
> - **Database Strategy**: Dual-mode persistence in Express — connects to remote **MongoDB Atlas** via `MONGODB_URI` when provided, with an automatic in-memory/file-backed fallback store when running standalone or in prototyping.
> - **UI Styling Strategy**: **Material UI (MUI v6)** component architecture paired with **Tailwind CSS** for layout, spacing, and responsive containers.
> - **AI Integration**: Server-side `@google/genai` with `gemini-3.8-flash` for high-speed hint and review generation, with zero client-side key leakage.

---

## 1. Overview & Core Concept

- **What It Does**: A comprehensive technical evaluation and skill-acceleration suite. Candidates and students solve algorithm, system design, and software engineering challenges in a Monaco-powered IDE; run test cases via sandboxed execution; and receive intelligent, calibrated assistance from specialized Gemini AI agents. Faculty and interviewers create assessments, configure proctoring/rubrics, and inspect behavioral analytics.
- **Target Personas**:
  - **Students / Candidates**: Practice problems, complete timed assessments, receive progressive Socratic hints, and prepare with AI mock interviewers.
  - **Faculty / Interviewers**: Design problem sets, assign timed evaluations, monitor live submissions, and inspect AI-assisted grading rubrics.
  - **Admins**: Manage roles, invite codes, system integrity, and audit logs.
- **Key Value**: Replaces black-box automated grading with a transparent, pedagogically sound feedback loop that evaluates not just code syntax, but problem-solving velocity, code quality, and edge-case resilience.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Student Assessment & Practice Flow**:
   - Problem Library $\rightarrow$ Filter by difficulty/topic/tag $\rightarrow$ Select problem.
   - Dual-pane Workspace: Left pane displays rich markdown problem description, constraints, and test fixtures; Right pane contains Monaco editor with language selector, theme toggle, and test runner controls.
   - Interactive Run: Click "Run Tests" $\rightarrow$ Immediate test execution output (Passed/Failed with diffs, stdout, and execution time).
   - Adaptive Help: Request Socratic hint $\rightarrow$ Level 1 (nudge), Level 2 (algorithmic guidance), Level 3 (pseudocode/structure), without spoiling the solution.
   - Final Submission $\rightarrow$ Comprehensive test evaluation, performance benchmarks, and instant AI Code Review.
2. **Faculty / Evaluator Flow**:
   - Assessment Creator $\rightarrow$ Select problems from library or author custom unit-test suites.
   - Candidate Review Dashboard $\rightarrow$ View submission timeline, test pass rate, hint consumption logs, and code quality scorecards.

### Visual Identity & Theme
- **Aesthetic Direction**: Clean, dark-mode-first developer console with high contrast and utilitarian precision (inspired by VS Code, Linear, and LeetCode).
- **Color Palette & Contrast**:
  - 60% Neutral Canvas: Deep dark slate (`#0B0F19` background, `#111827` workspace surfaces).
  - 30% Structural Surfaces: Hairline borders (`#1F2937`), subtle card dividers, muted typography (`#9CA3AF`).
  - 10% Accent Budget: Electric Indigo (`#6366F1`) for primary actions, Emerald (`#10B981`) for passing tests, Crimson (`#EF4444`) for errors/failures, Amber (`#F59E0B`) for hint counters.
- **Typography**: `Plus Jakarta Sans` for UI navigation and headlines; `JetBrains Mono` / `tabular-nums` for code, line numbers, test durations, and terminal outputs.
- **Micro-Interactions**: Split-pane draggable gutter, smooth test runner progress bar, syntax-highlighted diffs, and zero layout jitter.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Monaco Editor vs. Lightweight Alternatives (CodeMirror/Ace)**
  - *Chosen Approach*: Monaco Editor (`@monaco-editor/react`).
  - *Why*: Industry-standard developer experience with built-in VS Code IntelliSense, multi-cursor, minimap, syntax tokenization, and keyboard shortcuts that developers expect.
  - *Trade-off*: Larger initial bundle size, mitigated via dynamic lazy loading and asynchronous worker bundling.
- **Decision 2: Dual Persistence Strategy (Mongoose + Local JSON/Memory Store)**
  - *Chosen Approach*: Express repository pattern with seamless MongoDB connection when `MONGODB_URI` is present, falling back to a structured memory store.
  - *Why*: Enables instant out-of-the-box development and automated verification without requiring external database provisioning in local environments, while guaranteeing zero-rewrite scalability to MongoDB Atlas.
- **Decision 3: Server-Side Execution Proxy & Sandboxing**
  - *Chosen Approach*: Server-side execution proxy abstraction with support for public/private judge APIs (Piston / Judge0) and safe local JS eval for fast browser verification.
  - *Why*: Prevents browser security vulnerabilities (DOM access, endless loops freezing the UI) while allowing candidate code to be tested across JavaScript, Python, C++, and Java.
- **Decision 4: Multi-Agent Specialization with Gemini**
  - *Chosen Approach*: 4 distinct agent personas implemented via server-side prompts with strict system instructions and structured JSON output:
    1. *Adaptive Hint Agent*: Progressive 3-tier Socratic hinting; never writes full code.
    2. *Code Review Agent*: Evaluates time/space complexity, idiomatic cleanliness, edge cases, and security vulnerabilities.
    3. *Learning Coach Agent*: Diagnoses concept gaps based on failure patterns and suggests targeted practice.
    4. *Interview Coach Agent*: Simulates conversational technical interview queries with voice/text follow-ups.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT VIEWPORT (React 19)                      │
│                                                                        │
│   ┌────────────────────┐   ┌───────────────────────────────────────┐   │
│   │ Problem Explorer   │   │        Monaco Coding Workspace        │   │
│   │ - Filter & Search  │   │ ┌────────────────┐ ┌────────────────┐ │   │
│   │ - Topic Badges     │   │ │ Markdown Spec  │ │ Monaco Editor  │ │   │
│   │ - Difficulty Tags  │   │ │ Test Cases     │ │ Language Picker│ │   │
│   └─────────┬──────────┘   │ └────────────────┘ └────────┬───────┘ │   │
│             │              │ ┌───────────────────────────▼───────┐ │   │
│             │              │ │ Test Output & Agent Guidance Dock │ │   │
│             │              │ └───────────────────────────────────┘ │   │
│             │              └───────────────────┬───────────────────┘   │
└─────────────┼──────────────────────────────────┼───────────────────────┘
              │                                  │
              │   REST API (/api/problems,       │  REST API (/api/execute,
              │             /api/submissions)    │            /api/agent/*)
              ▼                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      EXPRESS BACKEND (Node.js)                         │
│                                                                        │
│   ┌──────────────────────┐  ┌──────────────────────────────────────┐   │
│   │  Auth & Permissions  │  │         Gemini Multi-Agent           │   │
│   │  - JWT & Role Guards │  │         Orchestration Layer          │   │
│   │  (Student/Faculty)   │  │  - Hint Agent (Socratic Nudges)      │   │
│   └──────────┬───────────┘  │  - Code Review (Complexity & Clean)  │   │
│              │              │  - Learning & Interview Coaches      │   │
│              ▼              └──────────────────┬───────────────────┘   │
│   ┌──────────────────────┐                     │                       │
│   │ Data Access Adapter  │                     ▼                       │
│   │ - MongoDB / Mongoose │          ┌──────────────────────┐           │
│   │ - Local Fallback     │          │  Google Gemini 3.8   │           │
│   └──────────┬───────────┘          │    Server API SDK    │           │
│              │                      └──────────────────────┘           │
│              ▼                                                         │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │               Sandboxed Execution Proxy Runner                 │   │
│   │       - Isolated Judge Service / Piston / Worker Pool          │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Entities & Data Schema
- `Problem`: `id`, `title`, `slug`, `difficulty` (Easy, Medium, Hard), `category`, `description`, `constraints`, `starterCode` (by language), `testCases` (input, expectedOutput, isHidden), `hints` (tier 1..3).
- `Submission`: `id`, `userId`, `problemId`, `language`, `code`, `status` (Accepted, Wrong Answer, Time Limit Exceeded, Runtime Error), `passedTests`, `totalTests`, `runtimeMs`, `memoryKb`, `aiReviewSummary`, `createdAt`.
- `User`: `id`, `email`, `name`, `role` (student, faculty, admin), `stats` (solvedCount, rating, streak).
- `Assessment`: `id`, `facultyId`, `title`, `problemIds`, `timeLimitMinutes`, `scheduledAt`, `proctoringSettings`.

---

## 5. Phased Implementation Roadmap

### Phase 1: Foundational MVP (Current Target)
- **Problem Library**: Rich catalogue of algorithmic and engineering challenges with difficulty, category, and test case metadata.
- **Monaco Workspace**: Resizable dual-pane IDE with syntax highlighting, language selector (JavaScript, Python), dark theme, and reset/format actions.
- **Execution & Test Runner Proxy**: Safe backend execution endpoint that evaluates submitted code against test fixtures, compares outputs, and displays test results in real time.
- **Persistence Foundation**: Repository interface with automatic MongoDB connection or local memory store.

### Phase 2: AI Multi-Agent Coaching (Gemini)
- **Adaptive Hint Agent**: Server-side agent generating progressive hints without revealing full solutions.
- **Code Review Agent**: Evaluates submitted code for Big-O complexity, readability, and edge-case vulnerabilities.
- **Interactive Coaching Panel**: Dockable chat/guidance drawer integrated into the Monaco workspace.

### Phase 3: Authentication & Role Management
- User signup, login, JWT token management, and role-based route protection (`student`, `faculty`, `admin`).
- Student profile and submission history tracking.

### Phase 4: Faculty & Assessment Tools
- Assessment creator for faculty: curate problems, configure time limits, and generate candidate invite tokens.
- Live assessment session view with proctoring flags (tab switch alerts, paste event tracking).

### Phase 5: Learning Coach & Mock Interview Agent
- **Learning Coach Agent**: Gap analysis from past failed submissions with personalized problem recommendations.
- **Interview Coach Agent**: Conversational technical interview simulation with follow-up behavioral and architectural questions.

### Phase 6: Advanced Execution Isolation & Analytics
- Integration with isolated containerized judge infrastructure (Judge0 / microVMs) for complete memory/CPU sandboxing.
- Cohort performance analytics, skill radar charts, and exportable candidate report cards.

---

## 6. Dependencies, Security Risks & External Services

### Dependencies to Introduce
- Frontend: `@monaco-editor/react` (code editor), `@mui/material` & `@emotion/react` & `@emotion/styled` (Material UI components).
- Backend: `mongoose` (MongoDB ORM), `jsonwebtoken` & `bcryptjs` (auth), `cors` & `express` (API server).
- AI: `@google/genai` (already installed in package.json).

### Security Risks & Mitigations
1. **Arbitrary Code Execution**: User code executed directly on the host server can compromise secrets or spawn fork bombs.
   - *Mitigation*: Client-side web worker execution for basic JS and sandboxed execution proxy (isolated container / Judge0 API) with strict timeouts and memory limits for multi-language execution. Never run `eval()` in the main Node process without sandbox boundaries.
2. **API Key Exposure**: Never send `GEMINI_API_KEY` to the browser.
   - *Mitigation*: Strict server-side proxying in Express via `/api/agent/*` endpoints.
3. **Cheating & Plagiarism in Assessments**:
   - *Mitigation*: Window blur/visibility change event detection, paste event monitors, and AI similarity checks on submissions.

### External Configuration Required
- `GEMINI_API_KEY`: Injected into server environment variables for Gemini agent features.
- `MONGODB_URI`: (Optional for Phase 1 MVP, required for persistent production Atlas cluster).
- `JUDGE_API_URL` / `JUDGE_API_KEY`: Optional external judge provider when moving beyond simulated/worker execution.
