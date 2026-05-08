import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Gamepad2, Eye, Play, MessageSquare, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { profile } from "@/lib/data";
import { openDiscordProfile } from "@/lib/discord";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";
import { getUniverseIds, getRobloxGameImages, getRobloxVisits } from "@/lib/roblox";

interface GameEntry {
  id: string;
  place_id: string;
  name: string;
  universe_id: string | null;
  visits: number;
  icon_url: string;
  creator: string;
  display_order: number;
  is_published: boolean;
}

const FALLBACK_GAMES: Omit<GameEntry, "id">[] = [
  { place_id: "111021125092689", name: "Steal A Forsaken",                universe_id: null, visits: 9800000, icon_url: "", creator: "LightOn Games", display_order: 1, is_published: true },
  { place_id: "128915436393653", name: "Dangotomon Game [Season 3] 🌟",   universe_id: null, visits: 26500,   icon_url: "", creator: "LightOn Games", display_order: 2, is_published: true },
  { place_id: "93605084835085",  name: "50 Nights In The Winter ❄️",      universe_id: null, visits: 3400,    icon_url: "", creator: "LightOn Games", display_order: 3, is_published: true },
  { place_id: "116868134708688", name: "Steal a 50 Nights In The Forest", universe_id: null, visits: 15200,   icon_url: "", creator: "LightOn Games", display_order: 4, is_published: true },
  { place_id: "85746704401525",  name: "Clash VS Students 🎓",             universe_id: null, visits: 4800,    icon_url: "", creator: "LightOn Games", display_order: 5, is_published: true },
  { place_id: "92369489899222",  name: "Troll Floating Ship Tower",        universe_id: null, visits: 890,     icon_url: "", creator: "LightOn Games", display_order: 6, is_published: true },
  { place_id: "121873420604621", name: "Obby But Its A Race! [RELEASE]",  universe_id: null, visits: 2100,    icon_url: "", creator: "LightOn Games", display_order: 7, is_published: true },
];

const FALLBACK_WITH_IDS = FALLBACK_GAMES.map((g, i) => ({ ...g, id: String(i) }));
const CACHE_KEY = "yd_games_v5";
const CACHE_TTL = 30 * 60 * 1000;

function readCache(): GameEntry[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || !Array.isArray(parsed?.games)) return null;
    if (Date.now() - parsed.ts > CACHE_TTL) return null;
    if (!parsed.games.some((g: GameEntry) => g.icon_url)) return null;
    return parsed.games;
  } catch { return null; }
}

function writeCache(games: GameEntry[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ games, ts: Date.now() })); } catch {}
}

async function enrichWithRoblox(games: GameEntry[]): Promise<GameEntry[]> {
  if (!Array.isArray(games) || games.length === 0) return FALLBACK_WITH_IDS;

  const needsUid = games.filter((g) => !g.universe_id).map((g) => g.place_id).filter(Boolean);

  let fetchedUids: Record<string, string> = {};
  if (needsUid.length > 0) {
    try { fetchedUids = await getUniverseIds(needsUid); } catch { fetchedUids = {}; }
  }

  const placeToUniverse: Record<string, string> = {};
  for (const g of games) {
    const uid = g.universe_id ?? fetchedUids[g.place_id] ?? null;
    if (uid && typeof uid === "string") placeToUniverse[g.place_id] = uid;
  }

  const allUids = [...new Set(Object.values(placeToUniverse))].filter(Boolean);
  if (allUids.length === 0) return games;

  let iconMap: Record<string, string> = {};
  let visitsMap: Record<string, number> = {};
  try {
    [iconMap, visitsMap] = await Promise.all([
      getRobloxGameImages(allUids),
      getRobloxVisits(allUids),
    ]);
  } catch { /* keep empty maps — games still render with fallback icon */ }

  return games.map((game) => {
    const uid    = placeToUniverse[game.place_id] ?? game.universe_id ?? "";
    const icon   = (uid && iconMap[uid]) ? iconMap[uid] : (game.icon_url || "");
    const visits = (uid && visitsMap[uid] !== undefined) ? visitsMap[uid] : (game.visits || 0);
    return { ...game, universe_id: uid || game.universe_id, icon_url: icon, visits };
  });
}

async function loadGames(): Promise<GameEntry[]> {
  const cached = readCache();
  if (cached) return cached;

  let baseGames: GameEntry[] = FALLBACK_WITH_IDS;

  if (isSupabaseEnabled && supabase) {
    try {
      const { data, error } = await supabase
        .from("games").select("*").eq("is_published", true).order("display_order", { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        baseGames = data as GameEntry[];
      }
    } catch { /* use fallback */ }
  }

  const enriched = await enrichWithRoblox(baseGames);
  writeCache(enriched);
  return enriched;
}

function fmt(v: number) {
  const n = Number(v);
  if (!n || isNaN(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function Skeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-card/40 border border-white/5 animate-pulse">
      <div className="aspect-video bg-white/5" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-white/5 rounded w-3/4" />
        <div className="h-3 bg-white/5 rounded w-1/2" />
        <div className="h-3 bg-white/5 rounded w-2/3" />
        <div className="h-10 bg-white/5 rounded-xl mt-3" />
      </div>
    </div>
  );
}

function GameThumbnail({ iconUrl, name }: { iconUrl: string; name: string }) {
  const [src, setSrc]       = useState(iconUrl || "");
  const [failed, setFailed] = useState(!iconUrl);

  useEffect(() => {
    if (iconUrl) { setSrc(iconUrl); setFailed(false); }
  }, [iconUrl]);

  if (failed || !src) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 via-card to-indigo-500/20">
        <Gamepad2 className="w-16 h-16 text-primary/20" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

export default function Games() {
  const { t } = useLanguage();
  const [games, setGames]     = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef            = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async (force = false) => {
    if (!mountedRef.current) return;
    setLoading(true);
    if (force) { try { localStorage.removeItem(CACHE_KEY); } catch {} }
    try {
      const data = await loadGames();
      if (mountedRef.current) setGames(Array.isArray(data) ? data : FALLBACK_WITH_IDS);
    } catch {
      if (mountedRef.current) setGames(FALLBACK_WITH_IDS);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) return;
    const channel = supabase
      .channel("games-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, () => {
        try { localStorage.removeItem(CACHE_KEY); } catch {}
        load(true);
      })
      .subscribe();
    return () => { supabase?.removeChannel(channel); };
  }, [load]);

  const total = games.reduce((s, g) => s + (Number(g.visits) || 0), 0);

  return (
    <div className="min-h-screen pt-8 pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">

        <div className="text-center mb-12 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6"
          >
            <Gamepad2 className="w-4 h-4" />
            {t("games.badge")}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl md:text-6xl font-bold font-display mb-4"
          >
            <span className="bg-gradient-to-r from-primary via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Games I Designed
            </span>{" "}
            <span className="text-foreground">UI For</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground max-w-2xl mx-auto mb-5 text-sm sm:text-base"
          >
            {t("games.subtitle")}
          </motion.p>

          {total > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/15 text-sm text-muted-foreground"
            >
              <Users className="w-3.5 h-3.5 text-primary" />
              Total visits: <strong className="text-foreground">{fmt(total)}</strong>
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 mb-10">
          {loading
            ? Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} />)
            : games.length === 0
              ? FALLBACK_WITH_IDS.map((_, i) => <Skeleton key={i} />)
              : games.map((game, i) => (
                <motion.div
                  key={game.place_id || game.id || i}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.06, duration: 0.4 }}
                  whileHover={{ y: -5 }}
                  className="group"
                >
                  <div className="h-full rounded-2xl overflow-hidden bg-card/60 backdrop-blur-xl border border-white/5 group-hover:border-primary/30 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-primary/5 flex flex-col">

                    <div className="relative aspect-video overflow-hidden flex-shrink-0">
                      <GameThumbnail iconUrl={game.icon_url || ""} name={game.name || "Game"} />
                      <div className="absolute top-3 right-3 z-10">
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs text-white font-medium">
                          <Eye className="w-3 h-3" />
                          {fmt(game.visits)}
                        </div>
                      </div>
                    </div>

                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="text-sm sm:text-base font-bold font-display mb-1 line-clamp-2" title={game.name}>
                        {game.name || "Roblox Game"}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-0.5">
                        by <span className="text-primary/80 font-medium">{game.creator || "LightOn Games"}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">{t("games.credit")}</p>
                      <a
                        href={`https://www.roblox.com/games/${game.place_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mt-auto"
                      >
                        <Button className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white font-bold gap-2 h-10 text-sm">
                          <Play className="w-3.5 h-3.5 fill-current" />
                          {t("games.playNow")}
                        </Button>
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))
          }
        </div>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
          className="text-center text-sm text-muted-foreground mb-10"
        >
          ...and there is more than all this!
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="bg-card/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-12 text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-display font-bold mb-3">{t("games.ctaTitle")}</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto text-sm">{t("games.ctaText")}</p>
          <Button
            size="lg"
            className="gap-2 rounded-full px-8 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold"
            onClick={() => openDiscordProfile(profile.discord)}
          >
            <MessageSquare className="w-5 h-5" />
            {t("games.contactDiscord")}
          </Button>
        </motion.div>

      </div>
    </div>
  );
}
