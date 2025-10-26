import type { IAIClient, GenerateTextOptions, GenerateTextResult } from "../IAIClient";
import { getUserApiKeyForEntity } from "../../services/apiClient";

// Resolve OpenAI API key using user session first, then env.
function resolveOpenAIKey(entityId?: string): string | null {
  // 1) User keys (entity-level, then app-level)
  const userKey = getUserApiKeyForEntity(entityId);
  if (userKey) return userKey;

  // 2) Env per-entity (accept hyphen or underscore)
  const env = import.meta.env as Record<string, string | undefined>;
  if (entityId) {
    const hy = `VITE_OPENAI_ENTITY_KEY_${entityId}`;
    const us = `VITE_OPENAI_ENTITY_KEY_${entityId.replace(/-/g, "_")}`;
    const per = env[hy] || env[us];
    if (per) return per;
  }

  // 3) Env global
  return env.VITE_OPENAI_API_KEY || null;
}

export class OpenAIClient implements IAIClient {
  private readonly entityId?: string;
  constructor(entityId?: string) {
    this.entityId = entityId;
  }

  async generateText(options: GenerateTextOptions): Promise<GenerateTextResult> {
    const apiKey = resolveOpenAIKey(this.entityId);
    if (!apiKey) {
      throw new Error(
        "OpenAI API key not configured. Add a key in Settings or set VITE_OPENAI_API_KEY (and/or VITE_OPENAI_ENTITY_KEY_*)."
      );
    }

    const model =
      options.model ||
      (import.meta.env.VITE_OPENAI_MODEL as string | undefined) ||
      "gpt-4o-mini";

    // Build messages from prompt/messages for chat.completions
    const messages =
      options.messages && options.messages.length > 0
        ? options.messages.map(m => ({ role: m.role, content: m.content }))
        : [{ role: "user", content: options.prompt ?? "" }];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.8
      })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 401 || res.status === 403) {
        throw new Error("OpenAI authentication failed. Check your key and org/project access.");
      }
      if (res.status === 429) {
        throw new Error("OpenAI rate limited. Please retry shortly or use a different key.");
      }
      throw new Error(`OpenAI error ${res.status}: ${text || "Unknown error"}`);
    }

    const data = await res.json();
    const text =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.text ??
      "";

    return {
      text,
      raw: data
    };
  }
}