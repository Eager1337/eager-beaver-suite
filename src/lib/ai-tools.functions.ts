import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type R<T> = ({ ok: true } & T) | { ok: false; error: string };

async function run<T>(fn: () => Promise<T>): Promise<R<T>> {
  try {
    return { ok: true, ...(await fn()) } as R<T>;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

const strArr = { type: "array", items: { type: "string" } };

export const makeCaptions = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ topic: z.string().trim().min(3).max(500), language: z.enum(["English", "Krio", "Both"]), tone: z.string().max(30) }).parse(d),
  )
  .handler(({ data }) =>
    run(async () => {
      const { askAI } = await import("./ai.server");
      const txt = await askAI({
        schema: {
          name: "captions",
          schema: { type: "object", additionalProperties: false, properties: { captions: strArr, hashtags: strArr }, required: ["captions", "hashtags"] },
        },
        messages: [
          { role: "system", content: "You write social media captions for creators in Sierra Leone. Krio means Sierra Leonean Krio. Keep captions under 220 characters." },
          { role: "user", content: `Write 4 ${data.tone} captions in ${data.language === "Both" ? "English and Krio (mix)" : data.language} for a post about: ${data.topic}. Also give 10 hashtags starting with #, including some Sierra Leone ones. Respond as json.` },
        ],
      });
      const p = JSON.parse(txt) as { captions: string[]; hashtags: string[] };
      return { captions: p.captions.slice(0, 6), hashtags: p.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).slice(0, 15) };
    }),
  );

export const trendIdeas = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ niche: z.string().trim().min(2).max(100) }).parse(d))
  .handler(({ data }) =>
    run(async () => {
      const { askAI } = await import("./ai.server");
      const item = { type: "object", additionalProperties: false, properties: { title: { type: "string" }, why: { type: "string" }, format: { type: "string" }, hook: { type: "string" } }, required: ["title", "why", "format", "hook"] };
      const txt = await askAI({
        schema: { name: "ideas", schema: { type: "object", additionalProperties: false, properties: { ideas: { type: "array", items: item } }, required: ["ideas"] } },
        messages: [
          { role: "system", content: "You are a content strategist for Sierra Leonean creators. Be concrete and local (Freetown, Bo, Kenema, beaches, food, music, Krio slang, local events)." },
          { role: "user", content: `Give 6 post ideas likely to trend this week for the niche "${data.niche}". For each: short title, why it will work (1 sentence), format (Reel, carousel, photo, short video), and an opening hook line. Respond as json.` },
        ],
      });
      return { ideas: (JSON.parse(txt) as { ideas: { title: string; why: string; format: string; hook: string }[] }).ideas.slice(0, 8) };
    }),
  );

export const makePicture = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ prompt: z.string().trim().min(3).max(800) }).parse(d))
  .handler(({ data }) =>
    run(async () => {
      const { makeImage } = await import("./ai.server");
      return { image: await makeImage(data.prompt) };
    }),
  );

export const chatHelper = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).min(1).max(40) }).parse(d),
  )
  .handler(({ data }) =>
    run(async () => {
      const { askAI } = await import("./ai.server");
      const reply = await askAI({
        messages: [
          {
            role: "system",
            content:
              "You are Beaver, the friendly helper on EagerBeaver, a site for Sierra Leoneans to download Pinterest pins, TikTok and other videos, browse saved media, make share links, and use AI tools (captions, pictures, trend ideas). Pages: /downloader, /social, /browse, /links, /ai, /pricing, /help, /blog, /account. Answer briefly and warmly; you may sprinkle light Krio (e.g. 'Kushe!'). Use markdown. Never help pirate copyrighted content for resale.",
          },
          ...data.messages,
        ],
      });
      return { reply };
    }),
  );
