import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sun, Moon, Monitor } from "lucide-react";
import { z } from "zod";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

const profileSchema = z.object({
  full_name: z.string().trim().max(100, "Max 100 characters").optional().or(z.literal("")),
  username: z
    .string()
    .trim()
    .max(40, "Max 40 characters")
    .regex(/^[a-zA-Z0-9_.-]*$/, "Letters, numbers, . _ - only")
    .optional()
    .or(z.literal("")),
  bio: z.string().trim().max(280, "Max 280 characters").optional().or(z.literal("")),
  country: z.string().trim().max(60, "Max 60 characters").optional().or(z.literal("")),
  language: z.enum(["en", "es", "fr", "de", "pt", "ja", "zh"]),
  appearance: z.enum(["light", "dark", "system"]),
});

type ProfileForm = z.infer<typeof profileSchema>;

const LANGS: Array<{ value: ProfileForm["language"]; label: string }> = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "pt", label: "Português" },
  { value: "ja", label: "日本語" },
  { value: "zh", label: "中文" },
];

function SettingsPage() {
  const { user } = Route.useRouteContext();
  const { setTheme } = useTheme();
  const [profile, setProfile] = useState<ProfileForm>({
    full_name: "",
    username: "",
    bio: "",
    country: "",
    language: "en",
    appearance: "system",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileForm, string>>>({});
  const [loading, setLoading] = useState(false);
  const [initial, setInitial] = useState<ProfileForm | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("full_name, username, bio, country, language, appearance")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const next: ProfileForm = {
          full_name: data.full_name ?? "",
          username: data.username ?? "",
          bio: data.bio ?? "",
          country: data.country ?? "",
          language: (data.language as ProfileForm["language"]) ?? "en",
          appearance: (data.appearance as ProfileForm["appearance"]) ?? "system",
        };
        setProfile(next);
        setInitial(next);
      });
  }, [user.id]);

  function update<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    if (key === "appearance") {
      setTheme(value as "light" | "dark" | "system");
    }
  }

  async function save() {
    const parsed = profileSchema.safeParse(profile);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof ProfileForm, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ProfileForm;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error("Please fix the highlighted fields");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
    setLoading(false);
    if (error) {
      if (error.code === "23505") toast.error("That username is taken");
      else toast.error("Couldn't save");
    } else {
      toast.success("Preferences saved");
      setInitial(parsed.data);
    }
  }

  const dirty = initial ? JSON.stringify(profile) !== JSON.stringify(initial) : true;

  return (
    <div className="max-w-3xl mx-auto animate-fade-up space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Settings</h1>
        <p className="mt-1 text-muted-foreground text-sm">Manage your profile and preferences.</p>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold">Profile</h2>

        <Field label="Email">
          <input value={user.email ?? ""} disabled className="input opacity-70" />
        </Field>

        <Field label="Full name" error={errors.full_name}>
          <input
            value={profile.full_name ?? ""}
            onChange={(e) => update("full_name", e.target.value)}
            className="input"
            maxLength={100}
            placeholder="Ada Lovelace"
          />
        </Field>

        <Field label="Username" error={errors.username} hint="Letters, numbers, . _ -">
          <input
            value={profile.username ?? ""}
            onChange={(e) => update("username", e.target.value)}
            className="input"
            maxLength={40}
            placeholder="ada"
          />
        </Field>

        <Field label="Bio" error={errors.bio} hint={`${(profile.bio ?? "").length} / 280`}>
          <textarea
            value={profile.bio ?? ""}
            onChange={(e) => update("bio", e.target.value)}
            rows={3}
            className="input resize-none"
            maxLength={280}
            placeholder="A little about you"
          />
        </Field>

        <Field label="Country" error={errors.country}>
          <input
            value={profile.country ?? ""}
            onChange={(e) => update("country", e.target.value)}
            className="input"
            maxLength={60}
            placeholder="United Kingdom"
          />
        </Field>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold">Preferences</h2>

        <Field label="Language">
          <select
            value={profile.language}
            onChange={(e) => update("language", e.target.value as ProfileForm["language"])}
            className="input"
          >
            {LANGS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Appearance" hint="Applied instantly across the app">
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: "light" as const, label: "Light", icon: Sun },
              { v: "dark" as const, label: "Dark", icon: Moon },
              { v: "system" as const, label: "System", icon: Monitor },
            ].map(({ v, label, icon: Icon }) => (
              <button
                key={v}
                type="button"
                onClick={() => update("appearance", v)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all ${
                  profile.appearance === v
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border hover:bg-accent/60 text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="sticky bottom-4 flex justify-end">
        <button
          onClick={save}
          disabled={loading || !dirty}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save changes
        </button>
      </div>

      <style>{`.input{width:100%;border-radius:0.75rem;border:1px solid var(--border);background:color-mix(in oklab,var(--background) 60%,transparent);padding:0.6rem 1rem;font-size:0.875rem;outline:none;color:var(--foreground)}.input:focus{box-shadow:0 0 0 2px var(--ring)}`}</style>
    </div>
  );
}

function Field({ label, children, error, hint }: { label: string; children: React.ReactNode; error?: string; hint?: string }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {hint && !error && <span className="text-[10px] text-muted-foreground/70">{hint}</span>}
        {error && <span className="text-[10px] text-destructive">{error}</span>}
      </div>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
