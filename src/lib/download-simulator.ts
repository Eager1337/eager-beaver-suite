import { supabase } from "@/integrations/supabase/client";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function simulateRetry(id: string, mediaType: string) {
  await sleep(400);
  await supabase.from("downloads").update({ status: "processing", progress: 10 }).eq("id", id);
  for (const step of [35, 65, 90]) {
    await sleep(450);
    await supabase.from("downloads").update({ progress: step }).eq("id", id);
  }
  await sleep(300);
  await supabase.from("downloads").update({
    status: "success",
    progress: 100,
    file_size: mediaType === "video" ? 12_400_000 : 2_800_000,
    error_message: null,
  }).eq("id", id);
}
