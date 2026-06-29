# Cyrano

A small, self-hosted **reply copilot** for your conversations (mostly dating apps). Paste what they said, get a few natural, dry-witted ways to reply — and let it quietly remember the details that matter about each person.

Named after Cyrano de Bergerac, who fed the perfect lines to woo on someone else's behalf.

- **Multiple options, one voice.** Every "generate" returns a few distinct replies — a deadpan one-liner, a light tease, a warm volley — each tagged with a tone, all short and ready to send.
- **A real persona.** The system prompt (crafted via a multi-draft, judged design pass) aims for *natural, slightly funny, dry* — never cheesy, never pickup-artist, never AI-sounding.
- **Memory per person.** It extracts durable facts (their job, hometown, a pet, a running joke) as you go, stores them locally, and uses them for callbacks later. You can pin, edit, or delete any of them.
- **Your model, your data.** Talks to any OpenAI-compatible endpoint — point it at your Hermes agent. Everything is stored in a single local SQLite file.

---

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Vercel AI SDK v7** with `@ai-sdk/openai-compatible`
- **`node:sqlite`** (Node's built-in SQLite — zero native dependencies)

## Requirements

- **Node.js ≥ 22.5** (uses the built-in `node:sqlite`). Developed on Node 25.
- An **OpenAI-compatible LLM endpoint** — your Hermes agent, or llama.cpp / vLLM / LM Studio / Ollama (`/v1`), etc.

---

## Local development

```bash
# 1. install
npm install

# 2. configure
cp .env.example .env        # then edit LLM_BASE_URL / LLM_MODEL / LLM_API_KEY

# 3. run
npm run dev                 # http://localhost:3000
```

### Environment variables

| Variable           | Default                       | Notes                                                        |
| ------------------ | ----------------------------- | ----------------------------------------------------------- |
| `LLM_BASE_URL`     | `http://localhost:1234/v1`    | Your OpenAI-compatible endpoint (include the `/v1`).         |
| `LLM_API_KEY`      | `not-needed`                  | Required to be non-empty even if your server ignores it.    |
| `LLM_MODEL`        | `hermes-4`                    | The model id your server exposes (e.g. `gpt-5.5`).          |
| `DATABASE_PATH`    | `./data/cyrano.db`            | Where the SQLite file lives.                                 |
| `SUGGESTION_COUNT` | `4`                           | Replies generated per request (2–5).                        |
| `LLM_TEMPERATURE`  | `0.9`                         | Sampling temperature.                                       |
| `LLM_TIMEOUT_MS`   | `60000`                       | Per-request timeout.                                        |

> The reply generator asks the model for **structured JSON**. If your endpoint
> doesn't support JSON-schema / JSON mode, Cyrano automatically falls back to a
> plain-text request and parses the JSON out of the response.

---

## Docker (self-hosting)

```bash
cp .env.example .env        # fill in your LLM_* values
docker compose up -d --build
# → http://localhost:3000
```

The SQLite database is persisted in the named volume `cyrano-data` (mounted at
`/data` in the container), so your conversations and memory survive restarts and
rebuilds.

**Reaching a model on the host machine:** inside the container `localhost` is the
container itself. If your Hermes endpoint runs on the Docker host, set
`LLM_BASE_URL` to `http://host.docker.internal:<port>/v1` (Docker Desktop) or to
your host's LAN IP.

---

## How it works

1. Create a conversation for each person you're talking to.
2. Paste their latest message into the composer and hit **Generate replies**.
   - That message is logged to the thread, the model is given the recent thread
     plus the remembered facts, and it returns several tone-tagged options.
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
    llm.ts                   AI SDK client + structured/text generation
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
