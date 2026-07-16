# openai-mcp

Tiny MCP server that proxies any OpenAI chat-completion model ID to OpenAI without a local whitelist. Built because `@mzxrai/mcp-openai` is stale (last release Dec 2024) and hardcodes a 4-model whitelist that rejects GPT-5.x.

## Tool

- `openai_chat` — sends `messages` to `chat.completions.create` and returns the assistant's reply.
  - `model` (string, default `gpt-5.5`) — any valid OpenAI model ID, forwarded as-is
  - `messages` (array of `{role, content}`) — required
  - `temperature`, `max_tokens`, `reasoning_effort` — optional pass-through

## Pricing (per 1M tokens)

| Model | Input | Cached input | Output | Use for |
|---|---:|---:|---:|---|
| `gpt-5.5` | $5.00 | $0.50 | $30.00 | Frontier — coding, complex reasoning, professional work |
| `gpt-5.4` | $2.50 | $0.25 | $15.00 | Cheaper coding + professional work; default for non-trivial |
| `gpt-5.4-mini` | $0.75 | $0.075 | $4.50 | Strongest mini — subagents, computer use, routine review |

**Routing heuristic**: routine review/summarization → `gpt-5.4-mini`. Non-trivial reasoning → `gpt-5.4`. Frontier-level analysis only → `gpt-5.5`.

Other valid IDs: `gpt-5.5-pro-2026-04-23`, `gpt-5.5-instant`, `gpt-4o`, `gpt-4o-mini`, `o1-preview`, `o1-mini`.

## Setup

```bash
# Clone and install
git clone https://github.com/<your-user>/openai-mcp.git
cd openai-mcp
npm install
```

Register with Claude Code at user scope (replace `<absolute-path>` with the full path to where you cloned the repo, and `sk-...` with your OpenAI API key):

```bash
claude mcp add openai -s user -e OPENAI_API_KEY=sk-... -- node <absolute-path>/index.js
claude mcp list
```

After registration, restart Claude Code (`/exit` and reopen) for the tool to appear as `mcp__openai__openai_chat`.

## Key rotation

The API key is stored inline in `~/.claude.json`. To rotate:

```bash
claude mcp remove openai -s user
# generate new key at platform.openai.com, then:
claude mcp add openai -s user -e OPENAI_API_KEY=<new-key> -- node <absolute-path>/index.js
```

Or edit `~/.claude.json` directly under `mcpServers.openai.env.OPENAI_API_KEY`.

## Troubleshooting

- **`429 quota exceeded`** — billing not set up or spend cap hit. Fix at platform.openai.com → Billing.
- **`Unsupported model`** — actually thrown by OpenAI, not by this server. Check the model ID exists in the API.
- **Tool doesn't appear in Claude Code** — restart Claude Code after registering.
