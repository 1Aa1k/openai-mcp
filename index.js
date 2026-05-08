#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("OPENAI_API_KEY environment variable is required");
  process.exit(1);
}

const openai = new OpenAI({ apiKey });

const TOOLS = [
  {
    name: "openai_chat",
    description:
      "Send a prompt to OpenAI's chat completion API. Pass any model ID as a string; the model param is forwarded as-is to OpenAI (no local whitelist). Returns the assistant's reply text.\n" +
      "\n" +
      "Recommended models (per 1M tokens, input / cached-input / output):\n" +
      "  gpt-5.5       — frontier, coding + professional work       $5.00 / $0.50 / $30.00\n" +
      "  gpt-5.4       — cheaper coding + professional work          $2.50 / $0.25 / $15.00\n" +
      "  gpt-5.4-mini  — strongest mini, good for subagents          $0.75 / $0.075 / $4.50\n" +
      "\n" +
      "Other valid IDs: gpt-5.5-pro-2026-04-23, gpt-5.5-instant, gpt-4o, gpt-4o-mini, o1-preview, o1-mini. Default is 'gpt-5.5'.\n" +
      "\n" +
      "Cost guidance: prefer gpt-5.4-mini for routine review/summarization, gpt-5.4 for non-trivial reasoning, gpt-5.5 only when frontier-level analysis is required.",
    inputSchema: {
      type: "object",
      properties: {
        model: {
          type: "string",
          description:
            "OpenAI model ID. Defaults to 'gpt-5.5'. Pass any current model ID; not validated locally.",
          default: "gpt-5.5",
        },
        messages: {
          type: "array",
          description: "Chat messages in OpenAI format.",
          items: {
            type: "object",
            properties: {
              role: {
                type: "string",
                enum: ["system", "user", "assistant"],
              },
              content: { type: "string" },
            },
            required: ["role", "content"],
          },
        },
        temperature: {
          type: "number",
          description: "Sampling temperature (optional).",
        },
        max_tokens: {
          type: "number",
          description: "Max output tokens (optional).",
        },
        reasoning_effort: {
          type: "string",
          enum: ["low", "medium", "high"],
          description:
            "For reasoning models (o1, gpt-5.5 family). Optional.",
        },
      },
      required: ["messages"],
    },
  },
];

const server = new Server(
  { name: "mcp-openai-custom", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name !== "openai_chat") {
    return {
      content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }],
      isError: true,
    };
  }
  const args = req.params.arguments ?? {};
  const {
    model = "gpt-5.5",
    messages,
    temperature,
    max_tokens,
    reasoning_effort,
  } = args;

  if (!Array.isArray(messages) || messages.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "messages must be a non-empty array of { role, content } objects.",
        },
      ],
      isError: true,
    };
  }

  const params = { model, messages };
  if (temperature !== undefined) params.temperature = temperature;
  if (max_tokens !== undefined) params.max_tokens = max_tokens;
  if (reasoning_effort !== undefined) params.reasoning_effort = reasoning_effort;

  try {
    const completion = await openai.chat.completions.create(params);
    const text =
      completion.choices?.[0]?.message?.content ?? "(empty response)";
    return { content: [{ type: "text", text }] };
  } catch (e) {
    return {
      content: [
        {
          type: "text",
          text: `OpenAI API error: ${e?.message ?? String(e)}`,
        },
      ],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
