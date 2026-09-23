import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { z } from "zod";

const NAME_KEY = "eb_username";
const SESSION_KEY = "eb_welcomed";
const nameSchema = z
  .string()
  .trim()
  .min(2, "At least 2 letters, abeg")
  .max(30, "Max 30 characters")
  .regex(/^[\p{L}\p{N} _.-]+$/u, "Letters, numbers, spaces, _ . - only");

export function WelcomeScreen() {
  const [mode, setMode] = useState<"hidden" | "ask" | "greet">("hidden");
  const [name, setName] = useState("");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    const saved = localStorage.getItem(NAME_KEY);
    if (saved) {
      setName(saved);
      setMode("greet");
    } else setMode("ask");
  }, []);

  useEffect(() => {
    if (mode !== "greet") return;
    const t = setTimeout(close, 3200);
    return () => clearTimeout(t);
  }, [mode]);

  function close() {
    sessionStorage.setItem(SESSION_KEY, "1");
    setLeaving(true);
    setTimeout(() => setMode("hidden"), 400);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = nameSchema.safeParse(input);
    if (!r.success) return setError(r.error.issues[0].message);
    localStorage.setItem(NAME_KEY, r.data);
    setName(r.data);
    setError(null);
    setMode("greet");
  }

  if (mode === "hidden") return null;

  return (
    <div
      className={`fixed inset-0 z-[100] grid place-items-center bg-background/95 backdrop-blur-xl px-4 transition-opacity duration-400 ${leaving ? "opacity-0" : "opacity-100"}`}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[720px] -translate-x-1/2 rounded-full opacity-25 blur-3xl animate-float-slow"
        style={{ background: "var(--gradient-primary)" }}
      />
      <div className="relative w-full max-w-md text-center animate-fade-up">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary shadow-glow">
          <Sparkles className="h-7 w-7 text-primary-foreground" />
        </div>
        <p className="mt-6 text-xs uppercase tracking-[0.25em] text-muted-foreground">
          EagerBeaver suite · for Sierra Leoneans 🇸🇱
        </p>

        {mode === "ask" ? (
          <>
            <h1 className="mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight">
              Watin u want leh ar <span className="text-gradient">call you?</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">What would you like to be called?</p>
            <form onSubmit={submit} className="mt-6 space-y-3">
              <input
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Your username"
                maxLength={30}
                className="w-full rounded-2xl border border-border bg-card/60 px-5 py-3.5 text-center text-lg outline-none focus:border-primary"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="submit"
                className="w-full rounded-2xl bg-gradient-primary px-5 py-3.5 font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
              >
                Enter EagerBeaver
              </button>
              <p className="text-xs text-muted-foreground">No login required · saved only on this device</p>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-3 font-display text-4xl md:text-5xl font-bold tracking-tight">
              Welcome back, <span className="text-gradient">{name}</span>!
            </h1>
            <p className="mt-3 text-muted-foreground">Kushe o! No login required — just paste and download.</p>
            <button
              onClick={close}
              className="mt-8 rounded-full bg-gradient-primary px-8 py-3 font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03]"
            >
              Let's go
            </button>
            <button
              onClick={() => { setInput(name); setMode("ask"); }}
              className="mt-3 block w-full text-xs text-muted-foreground hover:text-foreground"
            >
              Not {name}? Change name
            </button>
          </>
        )}
      </div>
    </div>
  );
}
