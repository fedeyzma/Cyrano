# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Cyrano is a self-hosted dating-reply copilot (Next.js 16 App Router + React 19 + Tailwind v4, TypeScript). It generates reply suggestions for ongoing conversations and answers for dating-app profile prompts, grounded in a personal-context file, via a self-hosted LLM ("Cami").

## Commands

```bash
npm run dev      # dev server (Turbopack) on http://localhost:3000
npm run build    # production build (also the full typecheck — there is no separate lint/tsc step)
npm run start    # serve a production build (NOTE: warns under output:standalone; for the real artifact run `node .next/standalone/server.js`)
```

- **There are no automated tests and no ESLint config.** `npm run build` is the gate — it runs the TypeScript typecheck and fails on type errors.
- **Verifying behavior:** hit the API directly (PowerShell `Invoke-RestMethod` against `http://localhost:3000/api/...`) for backend changes. For UI/click bugs, drive a headless browser with Playwright from the scratchpad dir (capture `console`/`pageerror` + screenshot) rather than guessing — a render crash in a child component freezes the whole page and looks like "a button doesn't work".
- Dev env is **Windows / PowerShell**, **Node 25** (non-LTS).

## Environment

Copy `.env.example` → `.env` (gitignored). The LLM is reached via `CAMI_API_*` vars (not `LLM_*`): `CAMI_API_URL` (base, no `/v1`), `CAMI_API_KEY`, `CAMI_API_MODEL`, `CAMI_API_TIMEOUT_MS`. Also `USER_CONTEXT_PATH`, `SUGGESTION_COUNT`, `SUGGESTION_TEMPERATURE`, `DATABASE_PATH`. See README for the Docker story.

## Architecture

Single-page client (`src/app/page.tsx`, `"use client"`) that owns all state and talks to REST route handlers under `src/app/api/`. Two modes toggled in the sidebar:

- **Replies** — per-person conversations: thread of messages, remembered facts, message targeting, multi-text suggestions, a persistent reply queue. Components: `Sidebar`, `ConversationView`, `FactsPanel`.
- **Prompts** — stateless profile-prompt answer generator (`PromptsLab`), grounded in the same personal context.

`src/lib/api.ts` is the typed client wrapper for every endpoint; `page.tsx` calls it and re-fetches detail after mutations (no optimistic cache).

### LLM integration — Cami is an *agent*, not a plain model

All generation goes through `src/lib/llm.ts` → `chat()`, a direct `fetch` to Cami's OpenAI-compatible `/v1/chat/completions`. **Cami does not reliably support `response_format`/JSON-schema structured output.** The pattern everywhere is: instruct the model to return strict JSON in the prompt, then `extractJson()` + Zod `.parse()`, with a one-shot retry. There is no AI-SDK dependency. `chat()` takes per-call `{ maxTokens, temperature, timeoutMs }` — parsing/large outputs (e.g. `parseThreadWithAI`) need a much larger `maxTokens` than the default 900, or the JSON gets truncated.

Generation functions in `llm.ts`: `generateSuggestions` (replies), `parseThreadWithAI` (raw thread import), `generatePromptAnswers` (profile prompts). Each has its own Zod schema in `src/lib/schema.ts`.

### The prompt system (the core of the product)

`src/lib/prompt.ts` holds the persona/voice rules. Two base prompts: `SYSTEM_PROMPT` (replies) and `PROMPT_SYSTEM` (profile prompts). Both are assembled by `compose(base, userContext)`, which appends:
1. `HUMANIZE_RULES` — anti-AI rules (no em dashes, no rule-of-three, no negative parallelism, banned AI vocabulary, etc.). Needed because the model writes very polished by default; keep this strong.
2. A **WHO I AM** block = the contents of the personal-context file (`fred_context.md`), loaded by `src/lib/userContext.ts` (read fresh each request, mtime-cached, so edits apply live).

`assemblePrompt()` (replies) and `assemblePromptRequest()` (prompts) build the per-request *user* message (thread + facts + targets + steer + avoid; or prompt + mood + language + avoid). The reply route resolves `targetMessageIds` to the messages being replied to; with none, it defaults to the latest "them" message.

When changing voice/behavior, edit these prompts — don't hardcode persona into routes. `fred_context.md` is **gitignored and personal — never commit it** (a `fred_context.example.md` template is committed instead).

### Data layer

`src/lib/db.ts` uses Node's built-in **`node:sqlite`** (`DatabaseSync`, synchronous) — chosen over `better-sqlite3` because native modules don't reliably build on Node 25 + Windows. Connection is a singleton on `globalThis`; the schema is created with `CREATE TABLE IF NOT EXISTS` on first connect (so new tables appear automatically on restart, existing data untouched). Tables: `conversations`, `messages`, `facts`, `queued_replies`. The DB file lives at `DATABASE_PATH` (a Docker volume in prod).

`node:sqlite` typing quirk: `.get()` results must be cast `as unknown as <RowType>` (a plain `as` fails to compile). There is a benign `ExperimentalWarning: SQLite is an experimental feature` at runtime, and a Turbopack NFT trace warning from the `fs` calls in `db.ts` — both harmless.

### API route conventions (Next 16)

Route handlers set `export const runtime = "nodejs"` and `export const dynamic = "force-dynamic"`; LLM routes also set `maxDuration`. Dynamic `params` is a **Promise** (`await params`). Use the helpers in `src/lib/http.ts` (`json`, `parseId`, `readJson`).

### Adding a new AI-backed capability

Follow the existing pattern end to end: Zod schema in `schema.ts` → generation fn in `llm.ts` (via `chat()`, strict-JSON + retry) → route under `app/api/` → method in `lib/api.ts` → wire into a client component. Always go through `compose()` so humanization + personal grounding stay consistent.
