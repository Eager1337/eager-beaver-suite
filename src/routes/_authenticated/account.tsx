import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Download, Loader2, Save, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "My account — EagerBeaver" },
      { name: "description", content: "Manage your welcome name and see every video and picture you've saved on EagerBeaver." },
      { property: "og:title", content: "My account — EagerBeaver" },
      { property: "og:description", content: "Your welcome name and saved downloads in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});

const nameSchema = z
  .string()
  .trim()
  .min(2, "Use at least 2 characters")
  .max(30, "Use 30 characters or fewer")
  .regex(/^[\p{L}\p{N} _.-]+$/u, "Letters, numbers, spaces, _ . - only");

function AccountPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle().then(({ data }) => {
      setName(data?.username ?? localStorage.getItem("eb_username") ?? "");
    });
  }, [user.id]);

  const downloads = useQuery({
    queryKey: ["downloads", "account", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("downloads")
        .select("id, title, quality, media_type, thumbnail_url, preview_url, media_url, status, created_at")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data;
    },
  });

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    const parsed = nameSchema.safeParse(name);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ username: parsed.data }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error("Couldn't save your name. Try again.");
    localStorage.setItem("eb_username", parsed.data);
    qc.invalidateQueries();
    toast.success(`Saved — welcome, ${parsed.data}!`);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">My account</h1>
        <p className="text-sm text-muted-foreground">Signed in as {user.email}</p>
      </div>

      <form onSubmit={saveName} className="glass rounded-2xl p-5 space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <UserIcon className="h-4 w-4" /> Welcome name
        </label>
        <p className="text-xs text-muted-foreground">This is the name we greet you with on every phone and browser.</p>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            className="flex-1 rounded-xl border border-border bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="What would you like to be called?"
          />
          <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </button>
        </div>
      </form>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Saved downloads</h2>
          <Link to="/downloads" className="text-sm text-primary hover:underline">See all</Link>
        </div>
        {downloads.isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : !downloads.data?.length ? (
          <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">
            Nothing saved yet. <Link to="/social" className="text-primary hover:underline">Download a video</Link> and it shows up here.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {downloads.data.map((d) => (
              <Link key={d.id} to="/downloads/$id" params={{ id: d.id }} className="glass overflow-hidden rounded-xl hover:shadow-glow transition-shadow">
                <div className="aspect-square bg-muted">
                  {d.thumbnail_url || d.preview_url ? (
                    <img src={d.thumbnail_url || d.preview_url || ""} alt={d.title ?? "Download"} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="grid h-full place-items-center"><Download className="h-6 w-6 text-muted-foreground" /></div>
                  )}
                </div>
                <div className="p-2">
                  <p className="truncate text-xs font-medium">{d.title || "Untitled"}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{d.quality} · {d.media_type}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
