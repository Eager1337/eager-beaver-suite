import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PinterestDownloader } from "@/components/pinterest-downloader";
import { Download, Heart, HardDrive, TrendingUp, ArrowUpRight } from "lucide-react";
import { trendingPins } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const displayName = user.email?.split("@")[0] ?? "there";

  const { data: downloads = [] } = useQuery({
    queryKey: ["downloads", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("downloads").select("*").order("created_at", { ascending: false }).limit(6);
      return data ?? [];
    },
  });
  const { data: favCount = 0 } = useQuery({
    queryKey: ["favorites-count", user.id],
    queryFn: async () => {
      const { count } = await supabase.from("favorites").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const stats = [
    { label: "Downloads", value: downloads.length, icon: Download, delta: "+12%" },
    { label: "Favorites", value: favCount, icon: Heart, delta: "+4" },
    { label: "Storage", value: "0.3 GB", icon: HardDrive, delta: "of 5 GB" },
    { label: "Streak", value: "3 days", icon: TrendingUp, delta: "keep going" },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-fade-up">
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
          Good to see you, <span className="text-gradient">{displayName}</span>.
        </h1>
        <p className="mt-1 text-muted-foreground">Here's what's happening in your workspace today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/60">
                <s.icon className="h-4 w-4" />
              </div>
              <span className="text-xs text-muted-foreground">{s.delta}</span>
            </div>
            <div className="mt-4 font-display text-2xl font-semibold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Quick download</h2>
            <p className="text-xs text-muted-foreground">Paste a Pinterest link to grab it instantly.</p>
          </div>
        </div>
        <PinterestDownloader compact />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold">Recent downloads</h2>
          <Link to="/downloads" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        {downloads.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center">
            <p className="text-sm text-muted-foreground">No downloads yet. Grab your first pin above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {downloads.map((d, i) => (
              <div
                key={d.id}
                className="aspect-square rounded-xl shadow-elegant"
                style={{
                  background: `linear-gradient(160deg, ${trendingPins[i % trendingPins.length].color}, ${trendingPins[i % trendingPins.length].color}88)`,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
