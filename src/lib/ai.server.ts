// Server-only helper for Lovable AI Gateway (Responses API, streamed SSE).
export type AiMsg = { role: "user" | "assistant" | "system"; content: string };

export class AiError extends Error {}

export async function askAI(opts: {
  messages: AiMsg[];
  schema?: { name: string; schema: Record<string, unknown> };
}): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiError("AI is not configured yet.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      ...(opts.schema
        ? { text: { format: { type: "json_schema", name: opts.schema.name, strict: true, schema: opts.schema.schema } } }
        : {}),
      input: opts.messages.map((m) => ({
        role: m.role,
        content: [{ type: m.role === "assistant" ? "output_text" : "input_text", text: m.content }],
      })),
    }),
  });
  await assertOk(res);

  let out = "";
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const p = line.slice(5).trim();
      if (!p || p === "[DONE]") continue;
      try {
        const e = JSON.parse(p) as { type?: string; delta?: string; response?: { error?: { message?: string } } };
        if (e.type === "response.output_text.delta" && e.delta) out += e.delta;
        if (e.type === "response.failed") throw new AiError(e.response?.error?.message ?? "AI request failed.");
      } catch (err) {
        if (err instanceof AiError) throw err;
      }
    }
  }
  if (!out.trim()) throw new AiError("The AI didn't return an answer. Try again.");
  return out.trim();
}

export async function makeImage(prompt: string): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiError("AI is not configured yet.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({ model: "openai/gpt-image-2.5-sunburst", prompt, n: 1, size: "1024x1024" }),
  });
  await assertOk(res);
  const j = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
  const d = j.data?.[0];
  if (d?.b64_json) return `data:image/png;base64,${d.b64_json}`;
  if (d?.url) return d.url;
  throw new AiError("No picture came back. Try a different idea.");
}

async function assertOk(res: Response) {
  if (res.ok && res.body) return;
  if (res.status === 429) throw new AiError("Too many requests right now — try again in a minute.");
  if (res.status === 402) throw new AiError("AI credits are used up. Add credits in workspace billing to continue.");
  const t = await res.text().catch(() => "");
  let msg = "";
  try { msg = (JSON.parse(t) as { error?: { message?: string }; message?: string }).error?.message ?? ""; } catch { /* ignore */ }
  throw new AiError(msg || `AI request failed (${res.status}).`);
}
