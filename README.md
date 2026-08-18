# ContextLens

A minimal coding agent that answers questions about a codebase, built to show
I understand how Superbrain's three layers — IDE, Agent, Architecture — fit
together, not just that I can wire up an LLM call.

It does three things every time you ask a question:
1. **Plans** what to search for (a cheap LLM call that looks only at file
   names + your question — this is the "agent" deciding where to look).
2. **Retrieves and compresses** the relevant code into a fixed token budget
   (this is the "architecture" — a lightweight context engine).
3. **Answers** using only that compressed slice, and shows you exactly how
   many tokens it saved.

## Why this project

Superbrain's whole pitch is cutting token usage 60–80% while keeping full
repo awareness. Rather than build an unrelated demo app, I wanted to build
something that forces me to solve the same problem they solve, at a small
scale — so the assignment doubles as proof I understood the product brief,
not just that I can ship a CRUD app in a weekend.

## Running locally

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000. A sample "repo" (a small auth module) is
pre-loaded on the left so you can try it immediately — ask something like
"Where is the login rate limit enforced?" and watch the stats panel.

## Deploying to Vercel

1. Push this folder to a new GitHub repo.
2. Go to vercel.com → New Project → import the repo.
3. In the project's Environment Variables, add `ANTHROPIC_API_KEY`.
4. Deploy. No other config needed — it's a stock Next.js app.

## Architecture

```
Browser (app/page.tsx)
   │  paste code + question
   ▼
/api/ask  (app/api/ask/route.ts)
   │
   ▼
runAgent()  (lib/agent.ts)
   │
   ├─ 1. parsePastedRepo + chunkRepo (lib/chunker.ts)
   │      splits pasted files into ~40-line overlapping chunks,
   │      tagged with path + line range
   │
   ├─ 2. planSearch() → one small Claude call
   │      given only file paths + the question, returns up to 6
   │      search terms. This is the "agent" step: deciding where
   │      to look before paying for full context.
   │
   ├─ 3. selectRelevantChunks() (lib/retriever.ts)
   │      lexical (term-frequency + path-match) scoring of chunks
   │      against the question + planned terms, greedily filled
   │      into a fixed token budget (3000 tokens). This is the
   │      "architecture" step: compression + prioritization.
   │
   └─ 4. answerWithContext() → one final Claude call
          answers using ONLY the selected chunks, so the answer
          quality is a direct function of retrieval quality —
          same as a real context engine.
   │
   ▼
Returns { answer, plan, stats, filesUsed }
   │
   ▼
UI shows: repo tokens vs. sent tokens vs. reduction %,
which files were consulted, and what the agent searched for.
```

### Key design decisions

- **Lexical retrieval instead of embeddings.** A real context engine (and a
  real Superbrain) would use embeddings + AST-aware chunking. I chose
  term-frequency + path-matching instead because it needs zero extra API
  keys or vector DB, works instantly on any pasted text, and is honest about
  being a simplified stand-in — the stats panel is there so the tradeoff is
  visible, not hidden.
- **Two LLM calls, not one.** A single RAG call would be simpler, but it
  collapses "deciding what's relevant" and "answering" into one step, which
  is not how an agent harness actually behaves. Splitting them makes the
  planning step inspectable (you can see what the agent searched for) and
  keeps the triage call cheap (it never sees the actual code).
- **Fixed token budget, not "top K chunks."** Budgeting by tokens (not chunk
  count) mirrors how a real context engine has to reason — files vary
  wildly in size, so a chunk-count limit either wastes budget on small files
  or starves large ones.
- **Single Next.js app, not separate frontend/backend.** Given a ~2-day
  window and a hard Vercel deployment requirement, splitting services would
  have burned time on deployment plumbing instead of the actual problem.
- **No database.** State lives in the browser tab. For a scoped assignment
  demonstrating an idea, persistence would add surface area without adding
  signal.

## What I'd build next

See the "Product Strategy" section of the submission document for the full
answer — short version: real embeddings + AST-aware chunking instead of
line windows, a persistent index instead of re-chunking on every request,
and multi-turn memory so follow-up questions don't restart the whole
retrieval process.

## Known limitations

- Token counts are estimated at ~4 chars/token (a standard approximation),
  not the model's actual tokenizer — good for showing *relative*
  compression, not for exact billing.
- Retrieval is lexical, so it can miss semantically related code that
  doesn't share vocabulary with the question (e.g. asking about
  "throttling" won't find a function called `checkRateLimit` unless the
  word appears nearby). This is the single biggest thing embeddings would
  fix.
- No streaming — answers arrive as one block, so longer answers feel
  slower than they'd need to.
