import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BASE = "https://ai.gateway.lovable.dev";

const Input = z.object({
  brand: z.string().trim().min(2).max(60),
  product: z.string().trim().min(3).max(300),
  tagline: z.string().trim().max(80).optional().default(""),
  style: z.enum(["luxury", "bold", "minimal", "neon", "afro-vibrant"]),
  aspect: z.enum(["16:9", "9:16"]),
  duration: z.enum(["6s", "8s", "10s"]),
});

const STYLE: Record<string, string> = {
  luxury: "black and gold luxury palette, glossy reflections, slow elegant camera, cinematic orchestral swell",
  bold: "high-contrast bold colours, punchy kinetic typography, fast snappy cuts, energetic trap beat",
  minimal: "clean white space, soft shadows, smooth easing, Apple-style restraint, soft ambient piano",
  neon: "dark background with glowing neon gradients, light trails, futuristic HUD elements, synthwave beat",
  "afro-vibrant": "vibrant West African colours and patterns, dynamic shapes, joyful energy, Afrobeats rhythm",
};

type Out = { ok: true; id: string; prompt: string } | { ok: false; error: string };

/** Writes a premium motion-graphics prompt with AI, then starts one video job. */
export const startAdVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<Out> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, error: "AI is not configured yet." };
    try {
      const { askAI } = await import("./ai.server");
      const prompt = await askAI({
        messages: [
          {
            role: "system",
            content:
              "You are a world-class motion-graphics director writing a single prompt for an AI video model. Output ONLY the prompt text, under 900 characters. Rules: premium motion-graphics advertisement (animated typography, shapes, logo reveal, product hero), not live-action people. Use timecodes like [0-2s] ... for beats. Quote exact on-screen words in double quotes and keep them short and correctly spelled. Describe camera moves, lighting, transitions and easing. Direct the soundtrack in plain words. End on a clean logo + tagline hero frame. Add: 'No dialogue. No voiceover. Consider micro-detail and timing.'",
          },
          {
            role: "user",
            content: `Brand: ${data.brand}\nProduct/offer: ${data.product}\nTagline: ${data.tagline || "(write a short one)"}\nStyle: ${STYLE[data.style]}\nLength: ${data.duration}, aspect ${data.aspect}.`,
          },
        ],
      });

      const res = await fetch(`${BASE}/v1/videos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-omni-1.1-flash",
          input: prompt,
          response_format: { type: "video", resolution: "1080p", duration: data.duration, aspect_ratio: data.aspect },
        }),
      });
      const j = (await res.json().catch(() => null)) as { id?: string; message?: string; error?: { message?: string } } | null;
      if (!res.ok || !j?.id) {
        if (res.status === 402) return { ok: false, error: "AI credits are used up. Add credits to make videos." };
        if (res.status === 429) return { ok: false, error: "A video is already being made. Wait for it to finish, then try again." };
        return { ok: false, error: j?.message ?? j?.error?.message ?? `Couldn't start the video (${res.status}).` };
      }
      return { ok: true, id: j.id, prompt };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Couldn't start the video." };
    }
  });

export const checkAdVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().regex(/^[\w-]{4,120}$/) }).parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"]!;
    const res = await fetch(`${BASE}/v1/videos/${encodeURIComponent(data.id)}`, { headers: { Authorization: `Bearer ${apiKey}` } });
    const j = (await res.json().catch(() => null)) as { status?: string; progress?: number; error?: { code?: string; message?: string } } | null;
    if (!res.ok || !j) return { status: "failed" as const, progress: 0, error: `Couldn't check the video (${res.status}).` };
    const status = (j.status ?? "queued") as "queued" | "in_progress" | "completed" | "failed";
    const error = status === "failed"
      ? j.error?.code === "moderation_blocked" ? "This idea was blocked by the safety filter. Try different wording." : j.error?.message ?? "Video failed."
      : null;
    return { status, progress: j.progress ?? 0, error };
  });
