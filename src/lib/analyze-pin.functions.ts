import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const AnalyzeSchema = z.object({
  url: z.string().url(),
});

export type AnalyzeResult =
  | {
      ok: true;
      title: string | null;
      previewUrl: string;
      mediaType: "image" | "video" | "gif";
      description: string;
      hashtags: string[];
    }
  | { ok: false; error: string };

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    description: {
      type: "string",
      description: "A clear accessible alt-text description of the image, 1-3 sentences.",
    },
    hashtags: {
      type: "array",
      items: { type: "string" },
      description: "5-8 relevant hashtags, each starting with #.",
    },
  },
  required: ["description", "hashtags"],
};

/** Public: analyse a pin's media with AI and return alt text + hashtags. */
export const analyzePin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AnalyzeSchema.parse(input))
  .handler(async ({ data }): Promise<AnalyzeResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, error: "AI is not configured for this app yet." };

    const { resolvePinterestMedia } = await import("./pinterest.server");

    let media;
    try {
      media = await resolvePinterestMedia(data.url, "1080p");
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Couldn't fetch that pin." };
    }

    const imageUrl =
      media.mediaType === "video" ? media.previewUrl : media.previewUrl ?? media.mediaUrl;
    if (!imageUrl) return { ok: false, error: "That pin has no image we can analyse." };

    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: "openai/gpt-6-astra",
          stream: true,
          store: false,
          reasoning: { effort: "low" },
          text: {
            format: {
              type: "json_schema",
              name: "pin_analysis",
              strict: true,
              schema: SCHEMA,
            },
          },
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: `Describe this Pinterest ${media.mediaType} for a screen-reader user, then suggest hashtags. Pin title: "${media.title ?? "untitled"}". Respond as json.`,
                },
                { type: "input_image", image_url: imageUrl },
              ],
            },
          ],
        }),
      });
    } catch {
      return { ok: false, error: "Couldn't reach the AI service. Try again." };
    }

    if (res.status === 429)
      return { ok: false, error: "Too many requests right now — try again in a moment." };
    if (res.status === 402)
      return { ok: false, error: "AI credits are exhausted. Add credits to continue." };
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `AI request failed (${res.status}). ${text.slice(0, 160)}` };
    }

    let out = "";
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload) as { type?: string; delta?: string };
          if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
            out += evt.delta;
          }
        } catch {
          /* ignore partial frames */
        }
      }
    }

    let parsed: { description?: unknown; hashtags?: unknown };
    try {
      parsed = JSON.parse(out.trim());
    } catch {
      return { ok: false, error: "The AI response couldn't be read. Try again." };
    }

    const description = typeof parsed.description === "string" ? parsed.description.trim() : "";
    const hashtags = Array.isArray(parsed.hashtags)
      ? parsed.hashtags
          .filter((t): t is string => typeof t === "string")
          .map((t) => (t.startsWith("#") ? t : `#${t}`))
          .slice(0, 10)
      : [];

    if (!description) return { ok: false, error: "The AI returned an empty description." };

    return {
      ok: true,
      title: media.title,
      previewUrl: imageUrl,
      mediaType: media.mediaType,
      description,
      hashtags,
    };
  });
