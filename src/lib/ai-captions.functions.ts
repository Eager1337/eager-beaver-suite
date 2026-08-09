import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const InputSchema = z.object({
  downloadId: z.string().uuid(),
});

export const generateCaption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: row, error: fetchErr } = await supabase
      .from("downloads")
      .select("id, title, media_type, source_url, user_id")
      .eq("id", data.downloadId)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);
    if (!row || row.user_id !== userId) throw new Error("Download not found");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI gateway not configured");

    const prompt = `Write a short, engaging social-media caption (max 2 sentences, plus 3-5 relevant hashtags on a new line) for a Pinterest ${row.media_type} titled "${row.title ?? "Untitled pin"}". Keep it tasteful, modern, and evocative. Do not use quotes.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a concise, tasteful social media copywriter." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (res.status === 429) throw new Error("Rate limit reached. Try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace billing.");
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`AI request failed: ${res.status} ${text.slice(0, 200)}`);
    }

    const payload = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const caption = payload.choices?.[0]?.message?.content?.trim() ?? "";
    if (!caption) throw new Error("Empty caption returned");

    const { error: updateErr } = await supabase
      .from("downloads")
      .update({ ai_caption: caption })
      .eq("id", row.id);
    if (updateErr) throw new Error(updateErr.message);

    await supabase.from("caption_versions").insert({
      download_id: row.id,
      user_id: userId,
      caption,
      source: "ai",
    });

    return { caption };
  });

const UpdateInputSchema = z.object({
  downloadId: z.string().uuid(),
  caption: z.string().trim().max(1000),
});

export const updateCaption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("downloads")
      .update({ ai_caption: data.caption })
      .eq("id", data.downloadId);
    if (error) throw new Error(error.message);

    if (data.caption) {
      await context.supabase.from("caption_versions").insert({
        download_id: data.downloadId,
        user_id: context.userId,
        caption: data.caption,
        source: "manual",
      });
    }

    return { ok: true };
  });

