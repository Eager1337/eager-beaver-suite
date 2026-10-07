import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BASE = "https://ai.gateway.lovable.dev";
const MODEL = "google/gemini-omni-1.1-flash";

const DataUrl = z
  .string()
  .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, "Images must be PNG, JPG or WebP.")
  .max(6_000_000, "Each image must be under about 4 MB.");

const Input = z.object({
  brand: z.string().trim().min(2).max(60),
  product: z.string().trim().min(3).max(300),
  tagline: z.string().trim().max(80).optional().default(""),
  style: z.enum(["luxury", "bold", "minimal", "neon", "afro-vibrant"]),
  aspect: z.enum(["16:9", "9:16"]),
  duration: z.enum(["10s", "15s"]),
  images: z.array(DataUrl).max(3).optional().default([]),
});

const STYLE: Record<string, string> = {
  luxury: "black and gold luxury palette, glossy reflections, slow elegant camera, cinematic orchestral swell",
  bold: "high-contrast bold colours, punchy kinetic typography, fast snappy cuts, energetic trap beat",
  minimal: "clean white space, soft shadows, smooth easing, Apple-style restraint, soft ambient piano",
  neon: "dark background with glowing neon gradients, light trails, futuristic HUD elements, synthwave beat",
  "afro-vibrant": "vibrant West African colours and patterns, dynamic shapes, joyful energy, Afrobeats rhythm",
};

type StartOut =
  | { ok: true; id: string; extend: boolean; prompt: string }
  | { ok: false; error: string };

type CheckOut = {
  status: "queued" | "in_progress" | "completed" | "failed";
  progress: number;
  error: string | null;
  videoUrl?: string;
  nextId?: string;
};

function splitDataUrl(dataUrl: string): { data: string; mime: string } {
  const m = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!m) throw new Error("Bad image data.");
  return { mime: m[1], data: m[2] };
}

async function createJob(apiKey: string, input: unknown, duration: string, aspect?: string) {
  const res = await fetch(`${BASE}/v1/videos`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      input,
      response_format: {
        type: "video",
        resolution: "1080p",
        duration,
        ...(aspect ? { aspect_ratio: aspect } : {}),
      },
    }),
  });
  const j = (await res.json().catch(() => null)) as
    | { id?: string; message?: string; error?: { message?: string } }
    | null;
  if (!res.ok || !j?.id) {
    if (res.status === 402) throw new Error("AI credits are used up. Add credits to make videos.");
    if (res.status === 429) throw new Error("A video is already being made. Wait for it to finish, then try again.");
    throw new Error(j?.message ?? j?.error?.message ?? `Couldn't start the video (${res.status}).`);
  }
  return j.id;
}

async function downloadMp4(apiKey: string, id: string): Promise<Buffer> {
  const res = await fetch(`${BASE}/v1/videos/${encodeURIComponent(id)}/content`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Couldn't fetch the finished video (${res.status}).`);
  return Buffer.from(await res.arrayBuffer());
}

/** Stores the finished MP4 in private storage and returns a signed URL. */
async function storeVideo(userId: string, jobId: string, mp4: Buffer): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const path = `${userId}/${jobId}.mp4`;
  const { error } = await supabaseAdmin.storage
    .from("ad-videos")
    .upload(path, mp4, { contentType: "video/mp4", upsert: true });
  if (error) throw new Error("Couldn't save the video. Try again.");
  const { data, error: signErr } = await supabaseAdmin.storage
    .from("ad-videos")
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (signErr || !data?.signedUrl) throw new Error("Couldn't prepare the video link.");
  return data.signedUrl;
}

/** Writes a premium motion-graphics prompt with AI, then starts one video job. */
export const startAdVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<StartOut> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, error: "AI is not configured yet." };
    try {
      const { askAI } = await import("./ai.server");
      const hasImages = data.images.length > 0;
      const prompt = await askAI({
        messages: [
          {
            role: "system",
            content:
              "You are a world-class motion-graphics director writing a single prompt for an AI video model. Output ONLY the prompt text, under 900 characters. Rules: premium motion-graphics advertisement (animated typography, shapes, logo reveal, product hero), not live-action people. Use timecodes like [0-2s] ... for beats. Quote exact on-screen words in double quotes and keep them short and correctly spelled. Describe camera moves, lighting, transitions and easing. Direct the soundtrack in plain words. End on a clean logo + tagline hero frame. Add: 'No dialogue. No voiceover. Consider micro-detail and timing.'" +
              (hasImages
                ? " Product photos are attached as reference images: reference them with tags like <IMAGE_REF_0>, <IMAGE_REF_1> and make the product the hero of the advert."
                : ""),
          },
          {
            role: "user",
            content: `Brand: ${data.brand}\nProduct/offer: ${data.product}\nTagline: ${data.tagline || "(write a short one)"}\nStyle: ${STYLE[data.style]}\nLength: ${data.duration === "15s" ? "10 seconds" : "10 seconds"}, aspect ${data.aspect}.`,
          },
        ],
      });

      const input = hasImages
        ? [
            ...data.images.map((img) => {
              const { data: b64, mime } = splitDataUrl(img);
              return { type: "image" as const, data: b64, mime_type: mime };
            }),
            { type: "text" as const, text: prompt },
          ]
        : prompt;

      // The model caps at 10s per job; 15s adverts are extended by 5s on completion.
      const id = await createJob(apiKey, input, "10s", data.aspect);
      return { ok: true, id, extend: data.duration === "15s", prompt };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Couldn't start the video." };
    }
  });

export const checkAdVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().regex(/^[\w-]{4,120}$/), extend: z.boolean().optional().default(false) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<CheckOut> => {
    const apiKey = process.env["LOVABLE_API_KEY"]!;
    const res = await fetch(`${BASE}/v1/videos/${encodeURIComponent(data.id)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const j = (await res.json().catch(() => null)) as
      | { status?: string; progress?: number; error?: { code?: string; message?: string } }
      | null;
    if (!res.ok || !j) return { status: "failed", progress: 0, error: `Couldn't check the video (${res.status}).` };
    const status = (j.status ?? "queued") as CheckOut["status"];

    if (status === "failed") {
      const error =
        j.error?.code === "moderation_blocked"
          ? "This advert was blocked by the safety filter — your photo or wording may be the cause. Try a different photo or wording."
          : j.error?.message ?? "Video failed.";
      return { status, progress: 0, error };
    }

    if (status !== "completed") {
      return { status, progress: j.progress ?? 0, error: null };
    }

    try {
      const mp4 = await downloadMp4(apiKey, data.id);

      if (data.extend) {
        // Chain a 5s extension onto the finished 10s clip for a 15s advert.
        const nextId = await createJob(
          apiKey,
          [
            { type: "video", data: mp4.toString("base64"), mime_type: "video/mp4" },
            {
              type: "text",
              text: "The scene continues seamlessly: the advert builds to its finale and ends on a clean, bold brand logo and tagline hero frame. The music swells and resolves. No dialogue. No voiceover.",
            },
          ],
          "5s",
        );
        return { status: "in_progress", progress: 0, error: null, nextId };
      }

      const videoUrl = await storeVideo(context.userId, data.id, mp4);
      return { status: "completed", progress: 100, error: null, videoUrl };
    } catch (e) {
      return { status: "failed", progress: 0, error: e instanceof Error ? e.message : "Couldn't finish the video." };
    }
  });
