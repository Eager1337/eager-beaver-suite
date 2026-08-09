import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ProcessSchema = z.object({
  downloadId: z.string().uuid(),
});

export const processDownload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProcessSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { resolvePinterestMedia } = await import("./pinterest.server");

    const { data: row, error: fetchErr } = await supabase
      .from("downloads")
      .select("id, source_url, quality, user_id")
      .eq("id", data.downloadId)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);
    if (!row || row.user_id !== userId) throw new Error("Download not found");

    await supabase
      .from("downloads")
      .update({ status: "processing", progress: 15, error_message: null })
      .eq("id", row.id);

    try {
      const media = await resolvePinterestMedia(row.source_url, row.quality ?? "original");

      await supabase
        .from("downloads")
        .update({
          status: "success",
          progress: 100,
          title: media.title,
          author_name: media.authorName,
          media_type: media.mediaType,
          media_url: media.mediaUrl,
          preview_url: media.previewUrl,
          thumbnail_url: media.previewUrl,
          width: media.width,
          height: media.height,
          duration_seconds: media.durationSeconds,
          file_size: media.fileSize,
          error_message: null,
        })
        .eq("id", row.id);

      await supabase.from("notifications").insert({
        user_id: userId,
        title: "Download ready",
        body: `${media.title ?? "Your pin"} finished downloading.`,
        type: "download_success",
        link: `/downloads/${row.id}`,
      });

      return { ok: true as const, mediaType: media.mediaType, title: media.title };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Download failed unexpectedly.";

      await supabase
        .from("downloads")
        .update({ status: "error", progress: 0, error_message: message })
        .eq("id", row.id);

      await supabase.from("notifications").insert({
        user_id: userId,
        title: "Download failed",
        body: message,
        type: "download_error",
        link: `/downloads/${row.id}`,
      });

      return { ok: false as const, error: message };
    }
  });
