/* The red chat bubble's brain (Cloudflare Pages Function: POST /api/assistant).
 * Server-side so the API key stays private.
 *
 * Setup: Cloudflare -> the project -> Settings -> Variables and Secrets -> add a SECRET named
 * ANTHROPIC_API_KEY. Without it this answers 503 and the chat falls back to its built-in answers,
 * so the site works either way. What the assistant knows: cf-lib/assistant-system.js.
 * (The key is billed by Anthropic, not by Cloudflare.)
 */
import { SYSTEM } from "../../cf-lib/assistant-system.js";

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "cache-control": "no-store" } });

export async function onRequestPost({ request, env }) {
  const key = env.ANTHROPIC_API_KEY;
  if (!key) return json(503, { error: "not configured" });

  try {
    const { messages } = await request.json();
    if (!Array.isArray(messages) || messages.length === 0) return json(400, { error: "bad request" });

    // Keep the context small and the cost predictable
    const trimmed = messages.slice(-12).map((m) => ({
      role: m && m.role === "assistant" ? "assistant" : "user",
      content: String(m && m.content).slice(0, 2000)
    }));

    const res = await fetch(env.ANTHROPIC_API_URL || "https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 400, system: SYSTEM, messages: trimmed }),
      signal: AbortSignal.timeout(25000)
    });

    if (!res.ok) {
      console.error("Anthropic API error:", res.status, (await res.text()).slice(0, 300));
      return json(502, { error: "upstream" });
    }

    const data = await res.json();
    const reply = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return json(200, { reply });
  } catch (err) {
    console.error("assistant:", err && err.message);
    return json(500, { error: "server" });
  }
}

export async function onRequest() {
  return json(405, { error: "method" });
}
