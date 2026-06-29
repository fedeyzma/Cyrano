# Cyrano

A small, self-hosted **reply copilot** for your conversations (mostly dating apps). Paste what they said, get a few natural, dry-witted ways to reply — and let it quietly remember the details that matter about each person.

Named after Cyrano de Bergerac, who fed the perfect lines to woo on someone else's behalf.

- **Multiple options, one voice.** Every "generate" returns a few distinct replies — a deadpan one-liner, a light tease, a warm volley — each tagged with a tone, all short and ready to send.
- **A real persona.** The system prompt (crafted via a multi-draft, judged design pass) aims for *natural, slightly funny, dry* — never cheesy, never pickup-artist, never AI-sounding.
- **Memory per person.** It extracts durable facts (their job, hometown, a pet, a running joke) as you go, stores them locally, and uses them for callbacks later. You can pin, edit, or delete any of them.
- **Your model, your data.** Replies come from **Cami**, Fred's self-hosted Hermes agent, over its OpenAI-compatible API. Everything is stored in a single local SQLite file. The API key stays server-side and is never committed.

---

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **`node:sqlite`** — Node's built-in SQLite (zero native dependencies)
- A small **server-side `fetch`** client to Cami's `/v1/chat/completions` (strict-JSON prompt + Zod validation; no SDK)

## Requirements

- **Node.js ≥ 22.5** (uses the built-in `node:sqlite`). Developed on Node 25.
- Network access to the **Cami** endpoint (`http://192.168.69.244:8642`) and its API key.

---

## Local development

```bash
# 1. install
npm install

# 2. configure
cp .env.example .env        # then set CAMI_API_KEY (and tweak the rest if needed)

# 3. run
npm run dev                 # http://localhost:3000
```

### Environment variables

| Variable                 | Default                        | Notes                                              |
| ------------------------ | ------------------------------ | -------------------------------------------------- |
| `CAMI_API_URL`           | `http://192.168.69.244:8642`   | Base URL (no `/v1`); the app appends the path.     |
| `CAMI_API_KEY`           | *(required)*                   | Bearer token. Never commit it.                     |
| `CAMI_API_MODEL`         | `cami`                         | Model id.                                          |
| `CAMI_API_TIMEOUT_MS`    | `45000`                        | Per-request timeout.                               |
| `SUGGESTION_COUNT`       | `4`                            | Replies generated per request (2–5).               |
| `SUGGESTION_TEMPERATURE` | `0.8`                          | Sampling temperature.                              |
| `USER_CONTEXT_PATH`      | `./fred_context.md`            | Markdown describing you, injected for grounding.    |
| `DATABASE_PATH`          | `./data/cyrano.db`             | Where the SQLite file lives.                        |

> Cami is an *agent*, so the app asks for **strict JSON only** (no tools, no
> notifications) and validates the result with Zod, retrying once if the first
> response isn't parseable. The key is only ever used server-side.

### Personalization

Replies are grounded in a personal-context markdown file (see
`USER_CONTEXT_PATH`). Copy `fred_context.example.md` → `fred_context.md` and
fill it in with raw background about yourself (who you are, how you text, your
interests). It's injected into the system prompt as grounding — never quoted —
and read fresh on each generation, so edits apply immediately. The real file is
**gitignored** (it's personal); it's still included in local Docker builds.

---

## Docker (self-hosting)

```bash
cp .env.example .env        # set CAMI_API_KEY
docker compose up -d --build
# → http://localhost:3000
```

The SQLite database is persisted in the named volume `cyrano-data` (mounted at
`/data`), so your conversations and memory survive restarts and rebuilds.

**Networking:** Cami is on the LAN (`192.168.69.244:8642`), not on the Docker
host, so the default bridge network can usually route to it directly — no
`host.docker.internal` needed. Verify from inside the container:

```bash
docker exec -it cyrano node -e \
  "fetch('http://192.168.69.244:8642/health').then(r=>r.text()).then(console.log).catch(console.error)"
```

When you change env values, **recreate** the container (a plain restart won't
pick them up):

```bash
docker compose up -d --build --force-recreate
```

---

## How it works

1. Create a conversation for each person you're talking to.
2. Paste their latest message into the composer and hit **Generate replies**.
   - That message is logged to the thread, Cami is given the recent thread plus
     the remembered facts, and returns several tone-tagged options.
   - Any new durable facts it noticed are saved to that person's memory.
3. **Copy** a reply, or hit **Use** to copy it *and* log it to the thread as sent.
4. Manage memory in the right-hand panel — pin the important stuff, delete noise.

## Project structure

```
src/
  app/
    api/conversations/...    REST routes (CRUD, messages, facts, suggest)
    page.tsx                 the single-page client app
    layout.tsx, globals.css
  components/                Sidebar, ConversationView, FactsPanel, modal, icons
  lib/
    db.ts                    node:sqlite data layer + schema
    llm.ts                   server-side Cami client (fetch + JSON parse/validate)
    prompt.ts                the persona system prompt + context assembly
    schema.ts                Zod schema for the generated object
    api.ts, types.ts, ...    client helpers and shared types
```

## Roadmap ideas

- Rolling thread summaries for very long conversations (keeps prompts small).
- Structured/categorized facts with automatic supersede on contradiction.
- Streaming generation.
- Optional per-conversation voice tweaks ("more flirty", "drier").

---

*This is an MVP — built to test whether the idea is worth growing.*
