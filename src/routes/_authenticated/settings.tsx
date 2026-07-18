import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = Route.useRouteContext();
  const [profile, setProfile] = useState({ full_name: "", username: "", bio: "", country: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("full_name, username, bio, country").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) setProfile({
          full_name: data.full_name ?? "",
          username: data.username ?? "",
          bio: data.bio ?? "",
          country: data.country ?? "",
        });
      });
  }, [user.id]);

  async function save() {
    setLoading(true);
    const { error } = await supabase.from("profiles").update(profile).eq("id", user.id);
    setLoading(false);
    if (error) toast.error("Couldn't save");
    else toast.success("Profile updated");
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-up space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Settings</h1>
        <p className="mt-1 text-muted-foreground text-sm">Manage your profile and preferences.</p>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold">Profile</h2>
        <Field label="Email">
          <input value={user.email ?? ""} disabled className="input" />
        </Field>
        <Field label="Full name">
          <input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} className="input" maxLength={100} />
        </Field>
        <Field label="Username">
          <input value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} className="input" maxLength={40} />
        </Field>
        <Field label="Bio">
          <textarea value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={3} className="input resize-none" maxLength={280} />
        </Field>
        <Field label="Country">
          <input value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })} className="input" maxLength={60} />
        </Field>
        <button
          onClick={save}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save changes
        </button>
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold">Preferences</h2>
        <p className="text-xs text-muted-foreground">More preferences (appearance, notifications, privacy, API keys, billing) arrive in Phase 2.</p>
      </div>

      <style>{`.input{width:100%;border-radius:0.75rem;border:1px solid var(--border);background:color-mix(in oklab,var(--background) 60%,transparent);padding:0.6rem 1rem;font-size:0.875rem;outline:none}.input:focus{box-shadow:0 0 0 2px var(--ring)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
