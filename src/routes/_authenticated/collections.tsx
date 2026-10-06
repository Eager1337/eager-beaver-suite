import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FolderHeart, Plus, Trash2, X, ImageOff, Lock, Globe } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/collections")({ component: CollectionsPage });

type Dl = { id: string; title: string | null; preview_url: string | null; thumbnail_url: string | null };
type Col = { id: string; name: string; is_public: boolean; collection_items: { download_id: string }[] };

function CollectionsPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const cols = useQuery({
    queryKey: ["collections", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("collections").select("id, name, is_public, collection_items(download_id)").order("created_at");
      if (error) throw error;
      return data as Col[];
    },
  });
  const dls = useQuery({
    queryKey: ["downloads", user.id, "mini"],
    queryFn: async () => {
      const { data } = await supabase.from("downloads").select("id, title, preview_url, thumbnail_url").eq("status", "success").order("created_at", { ascending: false }).limit(100);
      return (data ?? []) as Dl[];
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["collections", user.id] });
  const byId = new Map((dls.data ?? []).map((d) => [d.id, d]));

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n || n.length > 60) return toast.error("Folder name must be 1–60 characters");
    const { error } = await supabase.from("collections").insert({ name: n, user_id: user.id });
    if (error) return toast.error("Couldn't create folder");
    setName(""); refresh(); toast.success("Folder created");
  }
  async function add(colId: string, dlId: string) {
    const { error } = await supabase.from("collection_items").insert({ collection_id: colId, download_id: dlId, user_id: user.id });
    if (error) return toast.error(error.code === "23505" ? "Already in that folder" : "Couldn't add");
    refresh(); toast.success("Added to folder");
  }
  async function removeItem(colId: string, dlId: string) {
    await supabase.from("collection_items").delete().eq("collection_id", colId).eq("download_id", dlId);
    refresh();
  }
  async function del(id: string) {
    if (!confirm("Delete this folder? Your downloads stay saved.")) return;
    await supabase.from("collections").delete().eq("id", id);
    if (openId === id) setOpenId(null);
    refresh();
  }
  async function togglePublic(c: Col) {
    await supabase.from("collections").update({ is_public: !c.is_public }).eq("id", c.id);
    refresh();
  }

  const open = cols.data?.find((c) => c.id === openId);
  const thumb = (d?: Dl) => d?.thumbnail_url ?? d?.preview_url ?? null;

  return (
    <div className="max-w-6xl mx-auto animate-fade-up">
      <h1 className="font-display text-3xl font-semibold">Collections</h1>
      <p className="mt-1 text-muted-foreground text-sm">Create folders, then drag your downloads onto them.</p>

      <form onSubmit={create} className="mt-6 flex gap-2 max-w-md">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New folder name" className="flex-1 rounded-full border border-border bg-card/40 px-4 py-2 text-sm outline-none focus:border-primary" />
        <button className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow"><Plus className="h-4 w-4" /> Create</button>
      </form>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cols.data?.length === 0 && <p className="text-sm text-muted-foreground">No folders yet — create your first one above.</p>}
        {cols.data?.map((c) => (
          <div key={c.id}
            onDragOver={(e) => { e.preventDefault(); setOver(c.id); }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData("text/plain"); if (id) add(c.id, id); }}
            onClick={() => setOpenId(c.id)}
            className={`glass rounded-2xl p-5 cursor-pointer transition-all hover:-translate-y-1 ${over === c.id ? "ring-2 ring-primary shadow-glow" : ""} ${openId === c.id ? "ring-1 ring-primary" : ""}`}>
            <div className="grid grid-cols-3 gap-1 mb-4">
              {Array.from({ length: 3 }).map((_, k) => {
                const src = thumb(byId.get(c.collection_items[k]?.download_id));
                return src ? <img key={k} src={src} alt="" className="aspect-square w-full rounded object-cover" /> : <div key={k} className="aspect-square rounded bg-muted" />;
              })}
            </div>
            <div className="flex items-center gap-2">
              <FolderHeart className="h-4 w-4 text-primary" />
              <div className="font-medium flex-1 truncate">{c.name}</div>
              <button aria-label={c.is_public ? "Make private" : "Make public"} onClick={(e) => { e.stopPropagation(); togglePublic(c); }} className="text-muted-foreground hover:text-foreground">{c.is_public ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}</button>
              <button aria-label="Delete folder" onClick={(e) => { e.stopPropagation(); del(c.id); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="text-xs text-muted-foreground mt-1">{c.collection_items.length} items · {c.is_public ? "Public" : "Private"}</div>
          </div>
        ))}
      </div>

      {open && (
        <div className="mt-6 glass rounded-2xl p-5">
          <div className="flex items-center justify-between"><h2 className="font-semibold">{open.name}</h2><button aria-label="Close" onClick={() => setOpenId(null)}><X className="h-4 w-4" /></button></div>
          {open.collection_items.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Empty — drag downloads here.</p> : (
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-3">
              {open.collection_items.map(({ download_id }) => {
                const d = byId.get(download_id); const src = thumb(d);
                return (
                  <div key={download_id} className="relative group">
                    {src ? <img src={src} alt={d?.title ?? ""} className="aspect-square w-full rounded-lg object-cover" /> : <div className="aspect-square rounded-lg bg-muted grid place-items-center"><ImageOff className="h-4 w-4" /></div>}
                    <button aria-label="Remove from folder" onClick={() => removeItem(open.id, download_id)} className="absolute right-1 top-1 rounded-full bg-background/80 p-1 opacity-0 group-hover:opacity-100"><X className="h-3 w-3" /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <h2 className="mt-10 font-semibold">Your downloads</h2>
      <p className="text-xs text-muted-foreground">Drag onto a folder, or use the menu under each one.</p>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {dls.data?.length === 0 && <p className="text-sm text-muted-foreground col-span-full">No saved downloads yet.</p>}
        {dls.data?.map((d) => (
          <div key={d.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", d.id)} className="cursor-grab active:cursor-grabbing">
            {thumb(d) ? <img src={thumb(d)!} alt={d.title ?? "Download"} draggable={false} className="aspect-square w-full rounded-lg object-cover" /> : <div className="aspect-square rounded-lg bg-muted grid place-items-center"><ImageOff className="h-4 w-4" /></div>}
            {!!cols.data?.length && (
              <select aria-label="Add to folder" value="" onChange={(e) => e.target.value && add(e.target.value, d.id)} className="mt-1 w-full rounded-md border border-border bg-card/40 px-1 py-1 text-xs">
                <option value="">Add to…</option>
                {cols.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
