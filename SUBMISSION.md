# Superbrain Assignment — Submission

**Name:** Vasanthi Vallepu
**GitHub repo:** [fill in after you push]
**Deployed app:** [fill in after Vercel deploy]

> A note before you read this: this is a strong first draft to save you time,
> not something to paste in untouched. Read it, argue with parts of it, swap
> in your own words where it doesn't sound like you — the brief explicitly
> asks for your own voice, not a polished essay. Also: Part 3 below is
> written from researching Superbrain's site and docs. You should still spend
> 30-60 min actually using the product (they say it's free in beta) before
> finalizing that section — firsthand friction beats researched friction
> every time, and it'll show.

---

## 1. What I built and why

I built **ContextLens** — a small web app where you paste in some code, ask
it a question, and it answers using only a compressed, budgeted slice of
that code, while showing you exactly how much it cut and why.

I didn't want to build something disconnected from what Superbrain actually
does. The brief is explicit that Superbrain is three things working
together — an IDE, an agent harness, and a context engine (TokenFold) that
cuts token usage 60-80% while keeping full repo awareness. So instead of
building, say, a quiz app or a whiteboard tool, I built a tiny version of
the hard problem itself: given a question and a codebase too big to send in
full, how do you decide what to send, and how do you prove it was the right
call?

That gave me a project where every design decision — how to chunk code, how
to score relevance, how to set a token budget — is a small-scale version of
a decision Superbrain's actual architecture has to make. It's also honest
about being a simplification: I say clearly in the README where I cut
corners (lexical search instead of embeddings, line-window chunks instead of
AST-aware chunks) and why, given two days.

## 2. Architecture and design

Full breakdown is in `README.md`, but the short version:

- **Single Next.js app**, deployed as one unit to Vercel. Given a hard
  2-day window and a required Vercel link, I didn't want to spend time on
  cross-service deployment plumbing when the actual assignment is about
  the agent/context logic.
- **Agent step:** one cheap LLM call that looks only at file names + the
  question and returns search terms — deciding *where to look* before
  paying for full context.
- **Context engine step:** the pasted repo gets split into overlapping
  ~40-line chunks, each scored against the question + search terms with a
  lexical (term-frequency + path-match) scorer, then greedily packed into a
  fixed token budget.
- **Answer step:** one final LLM call, given only the selected chunks, so
  answer quality is a direct function of retrieval quality — same as it
  would be in a real context engine.
- The UI shows the numbers that matter: total tokens in the pasted repo,
  tokens actually sent, percentage reduction, and which files/chunks were
  used. That panel is the actual point of the demo — it's the thing that
  proves the compression claim rather than just asserting it.

### Why I made these calls, specifically

- I used **lexical retrieval instead of embeddings** on purpose, not out of
  laziness — it needed zero extra API keys, works instantly on any pasted
  text with no setup, and the tradeoff (it can miss semantically related
  code that uses different words) is something I could name honestly rather
  than something I had to hide.
- I used **two LLM calls instead of one** because collapsing "what's
  relevant" and "what's the answer" into a single call is not how an agent
  harness actually behaves, and it would have hidden the planning step from
  the reviewer entirely.
- I budgeted by **tokens, not chunk count**, because a chunk-count limit
  either wastes budget on tiny files or starves large ones — token budgeting
  is closer to how a real context engine has to reason.

## 3. Product strategy

### A. If you were building this product, what would you change or add next, and why?

Based on what's public about Superbrain (TokenFold, terminal-native, VS
Code/Cursor/Windsurf/JetBrains extensions, approval-gated edits), here's
where I'd push next:

1. **Make the context-reduction number visible and trustworthy in the
   moment, not just in benchmarks.** The 60-80% number is the headline
   claim on the site, but from what I can see it currently lives in
   marketing/benchmarks, not in the live tool while you're using it. If I'm
   an engineer paying per token, I want to see "this task used X% less
   context than a naive approach" right there in the terminal or IDE panel
   after every task — the same way ContextLens surfaces it after every
   question. Trust in a compression claim is built turn by turn, not by one
   benchmark page.
2. **A lighter, native IDE surface, not just an extension.** Right now
   Superbrain is CLI-native with extensions bolted onto VS Code, Cursor,
   Windsurf, and JetBrains. That's a fast way to reach existing users, but
   it means Superbrain is always a guest in someone else's editor chrome —
   it can't control diff review, approval flow, or context visualization as
   tightly as a true fork (like Cursor) can. Given the assignment explicitly
   describes an "IDE: fork of VS Code" as one of the three core layers, I'd
   invest in a first-party editor surface built around TokenFold — specifically
   a persistent, always-visible context panel showing what's currently
   "in scope" for the agent, since that's the one thing a generic extension
   can't do well.
3. **Team-level shared context, not just per-repo.** It's positioned for
   teams, but the FAQ describes context as being built per codebase per
   session. Engineering teams share conventions across many repos (a
   monorepo split into services, or several related repos). A team-level
   memory layer — "here's how this org writes auth code, here's their test
   conventions" — would compound the value of TokenFold across projects
   instead of resetting per repo.
4. **Cheaper/faster "triage" mode for small, obvious tasks.** Not every
   task needs full repo mapping. A one-line bug fix in a file the developer
   already has open shouldn't trigger the same context-building cost as a
   cross-repo refactor. A tiered mode — skip deep indexing when the task is
   scoped and small — would push the cost advantage even further for the
   common case, not just the monorepo case.

### B. What major UI issues do you dislike, and how do you think they annoy current users?

This is written from using AI coding tools in this category generally (Cursor,
Copilot, agent-in-terminal tools) — replace with your own gripes after you've
spent real time in Superbrain specifically, that'll be more convincing than mine.

1. **Diff review fatigue in multi-file agentic edits.** When an agent
   changes 8 files at once, most tools show you a flat list of diffs to
   approve one by one, with no sense of *why* file 5 needed to change because
   of file 2. You end up either rubber-stamping everything (defeats the
   point of "review before applying") or spending as long reviewing as
   you'd have spent writing it yourself. Annoyance: it turns "approval
   gating," which is supposed to build trust, into a chore people route
   around.
2. **Context state is invisible until something goes wrong.** Most tools
   don't show you what's currently "in the model's head" — you find out the
   context window is stale or the wrong files got picked up only when the
   output is visibly wrong. For a product whose whole differentiator is
   *smart* context management, this is the one place transparency matters
   most, and it's usually the least visible part of the UI.
3. **Terminal-native tools lose visual diffing and inline code navigation.**
   CLI-first agents are great for automation but bad for the moment you
   actually want to *read* the change — jump to a symbol, see it in
   context, click through a call site. Bolting an IDE extension on afterward
   partly fixes this, but then you have two mental models (terminal session
   state vs. editor state) that can drift out of sync, which is confusing
   in exactly the moment you need clarity most.
4. **No clear signal for "is this agent stuck or still thinking."** Long
   agentic loops (multi-file refactors, test-fix cycles) often show a
   generic spinner or a scrolling log with no sense of progress or ETA.
   Users can't tell whether to wait 10 more seconds or cancel — this is a
   small thing but it's the kind of friction that erodes trust in
   autonomous execution over repeated use.

## 4. Decision-making notes

- **Scope cut #1 — no repo upload/GitHub integration.** Real repo cloning
  and file-tree browsing would have been the "obvious" version of this
  project, but it adds auth, rate limits, and a lot of edge cases for a
  2-day window. Pasting code with a simple `### path` marker gets 90% of
  the demonstration value (relevance scoring + compression + agent
  planning) for a fraction of the engineering time, so I cut it.
- **Scope cut #2 — no persistence/database.** Nothing is saved between
  sessions. For an assignment meant to demonstrate reasoning about context
  and agents, persistence doesn't add signal, so I left it out rather than
  spend a day on schema design.
- **Why Claude for the model calls** — it's Anthropic's own model, it's
  what the assignment context is built around, and the API is simple to
  call directly with `fetch` (no SDK dependency to manage under time
  pressure).
- **Why the stats panel is the centerpiece of the UI, not an afterthought**
  — the assignment is evaluating product thinking, not just code. A demo
  that just answers questions proves I can call an LLM. A demo that also
  shows *how much less it had to look at* proves I understood what
  Superbrain is actually selling.
