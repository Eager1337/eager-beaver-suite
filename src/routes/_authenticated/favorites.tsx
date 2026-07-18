import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/favorites")({
  component: FavoritesPage,
});

function FavoritesPage() {
  const { user } = Route.useRouteContext();
  const { data: rows = [] } = useQuery({
    queryKey: ["favorites-all", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("favorites").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="max-w-6xl mx-auto animate-fade-up">
      <h1 className="font-display text-3xl font-semibold">Favorites</h1>
      <p className="mt-1 text-muted-foreground text-sm">Pins you've starred for later.</p>

      {rows.length === 0 ? (
        <div className="mt-8 glass rounded-2xl p-16 text-center">
          <Heart className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
          <p className="mt-4 text-sm text-muted-foreground">
            Nothing saved yet. Star any download to keep it here.
          </p>
        </div>
      ) : (
        <div className="mt-8 columns-2 md:columns-3 lg:columns-4 gap-3">
          {rows.map((r) => (
            <div key={r.id} className="mb-3 break-inside-avoid glass rounded-xl overflow-hidden">
              <div className="aspect-[4/5] bg-gradient-primary" />
              <div className="p-3 text-xs">
                <div className="font-medium truncate">{r.title ?? "Untitled"}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
