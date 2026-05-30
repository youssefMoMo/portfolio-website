// src/pages/Games.tsx — Phase 2 polished layout
// Featured hero game + clean stat badges + contribution labels + Roblox links
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gamepad2, Eye, Play, MessageSquare, Users, Star,
  Brush, TrendingUp, ExternalLink, Award, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { openDiscord } from "@/lib/discord";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";
import { getUniverseIds, getRobloxGameImages, getRobloxVisits } from "@/lib/roblox";

interface GameEntry {
  id: string; place_id: string; name: string; universe_id: string | null;
  visits: number; icon_url: string; creator: string;
  display_order: number; is_published: boolean;
  /** Optional override: full Roblox URL or raw 15-digit place ID string */
  link?: string;
}

/**
 * Safely builds a Roblox game URL from either:
 *  - A raw place ID (any length, always treated as a STRING to avoid
 *    JS Number truncation of 15-digit IDs > Number.MAX_SAFE_INTEGER).
 *  - A fully-qualified URL (passes through unchanged).
 * Falls back to place_id when no link override is set.
 */
function getRobloxUrl(game: GameEntry): string {
  const raw = (game.link ?? game.place_id ?? "").trim();
  if (!raw) return "#";
  // Already a full URL — pass through untouched
  if (raw.startsWith("http")) return raw;
  // Raw ID — always embed as a string, never parse to Number
  return `https://www.roblox.com/games/${raw}`;
}

// Extended metadata applied on top of Supabase/fallback data
interface GameMeta {
  genre: string; role: string; highlight: boolean;
}
const GAME_META: Record<string, GameMeta> = {
  "111021125092689": { genre: "Adventure",  role: "UI/UX Designer",          highlight: true  },
  "128915436393653": { genre: "Action RPG", role: "UI/UX Designer",          highlight: false },
  "93605084835085":  { genre: "Horror",     role: "UI/UX & Motion Designer", highlight: false },
  "116868134708688": { genre: "Adventure",  role: "UI/UX Designer",          highlight: false },
  "85746704401525":  { genre: "Comedy PvP", role: "UI/UX Designer",          highlight: false },
  "92369489899222":  { genre: "Obby",       role: "UI Designer",             highlight: false },
  "121873420604621": { genre: "Racing",     role: "UI/UX Designer",          highlight: false },
};
const DEFAULT_META: GameMeta = { genre: "Game", role: "UI/UX Designer", highlight: false };

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
    const p = JSON.parse(raw);
    if (!p?.ts || !Array.isArray(p?.games) || Date.now() - p.ts > CACHE_TTL) return null;
    if (!p.games.some((g: GameEntry) => g.icon_url)) return null;
    return p.games;
  } catch { return null; }
}
function writeCache(games: GameEntry[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ games, ts: Date.now() })); } catch {}
}

async function enrichWithRoblox(games: GameEntry[]): Promise<GameEntry[]> {
  if (!Array.isArray(games) || games.length === 0) return FALLBACK_WITH_IDS;
  const needsUid = games.filter(g => !g.universe_id).map(g => g.place_id).filter(Boolean);
  let fetchedUids: Record<string, string> = {};
  if (needsUid.length > 0) {
    try { fetchedUids = await getUniverseIds(needsUid); } catch {}
  }
  const placeToUniverse: Record<string, string> = {};
  for (const g of games) {
    const uid = g.universe_id ?? fetchedUids[g.place_id] ?? null;
    if (uid) placeToUniverse[g.place_id] = uid;
  }
  const allUids = [...new Set(Object.values(placeToUniverse))].filter(Boolean);
  if (allUids.length === 0) return games;
  let iconMap: Record<string, string> = {};
  let visitsMap: Record<string, number> = {};
  try {
    [iconMap, visitsMap] = await Promise.all([
      getRobloxGameImages(allUids), getRobloxVisits(allUids),
    ]);
  } catch {}
  return games.map(game => {
    const uid    = placeToUniverse[game.place_id] ?? game.universe_id ?? "";
    const icon   = uid && iconMap[uid] ? iconMap[uid] : (game.icon_url || "");
    const visits = uid && visitsMap[uid] !== undefined ? visitsMap[uid] : (game.visits || 0);
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
      if (!error && Array.isArray(data) && data.length > 0) baseGames = data as GameEntry[];
    } catch {}
  }
  const enriched = await enrichWithRoblox(baseGames);
  writeCache(enriched);
  return enriched;
}

function fmt(v: number) {
  const n = Number(v);
  if (!n || isNaN(n)) return "–";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ── Thumbnail ───────────────────────────────────────────────────
function GameThumbnail({ iconUrl, name, large }: { iconUrl: string; name: string; large?: boolean }) {
  const [src, setSrc]       = useState(iconUrl || "");
  const [failed, setFailed] = useState(!iconUrl);
  useEffect(() => { if (iconUrl) { setSrc(iconUrl); setFailed(false); } }, [iconUrl]);
  const cls = `absolute inset-0 w-full h-full object-cover ${large ? "transition-transform duration-700 group-hover:scale-105" : "transition-transform duration-500 group-hover:scale-107"}`;
  if (failed || !src) return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 via-card to-indigo-500/20">
      <Gamepad2 className={`${large ? "w-24 h-24" : "w-14 h-14"} text-primary/20`} />
    </div>
  );
  return <img src={src} alt={name} className={cls} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}

// ── Stat badge ──────────────────────────────────────────────────
function Badge({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent?: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${accent ?? "bg-white/5 border-white/10 text-white/70"}`}>
      <Icon className="w-3 h-3 flex-shrink-0" />
      <span className="text-white/50 font-normal">{label}</span>
      <span>{value}</span>
    </div>
  );
}

// ── Skeleton ────────────────────────────────────────────────────
function Skeleton({ large }: { large?: boolean }) {
  return (
    <div className={`rounded-2xl overflow-hidden bg-card/40 border border-white/5 animate-pulse ${large ? "col-span-full" : ""}`}>
      <div className={`${large ? "aspect-[21/9]" : "aspect-video"} bg-white/5`} />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-white/5 rounded w-3/4" />
        <div className="h-3 bg-white/5 rounded w-1/2" />
        <div className="flex gap-2 mt-2">
          <div className="h-6 w-20 bg-white/5 rounded-full" />
          <div className="h-6 w-20 bg-white/5 rounded-full" />
        </div>
        <div className="h-10 bg-white/5 rounded-xl mt-3" />
      </div>
    </div>
  );
}

// ── Featured hero card ──────────────────────────────────────────
function FeaturedCard({ game }: { game: GameEntry }) {
  const meta = GAME_META[game.place_id] ?? DEFAULT_META;
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
      className="group relative col-span-full rounded-3xl overflow-hidden bg-card/60 border border-primary/25 shadow-2xl shadow-primary/8 mb-2"
    >
      {/* Background image */}
      <div className="relative aspect-[21/9] sm:aspect-[16/6] overflow-hidden">
        <GameThumbnail iconUrl={game.icon_url || ""} name={game.name} large />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Featured badge */}
        <div className="absolute top-5 left-5 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-white text-[11px] font-bold uppercase tracking-wider shadow-lg">
          <Award className="w-3.5 h-3.5" /> Featured Project
        </div>

        {/* Content overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 z-10">
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge icon={Eye}   label="Visits" value={fmt(game.visits)} accent="bg-cyan-500/15 border-cyan-500/30 text-cyan-300" />
            <Badge icon={Brush} label="Role"   value={meta.role}        accent="bg-primary/15 border-primary/30 text-primary" />
            <Badge icon={Zap}   label="Genre"  value={meta.genre}       accent="bg-white/8 border-white/15 text-white/70" />
          </div>
          <h2 className="text-2xl sm:text-4xl font-display font-bold text-white mb-1 drop-shadow-lg leading-tight">
            {game.name}
          </h2>
          <p className="text-white/60 text-sm mb-5">
            by <span className="text-white/85 font-medium">{game.creator}</span>
          </p>
          <a
            href={getRobloxUrl(game)}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors shadow-lg"
          >
            <Play className="w-4 h-4 fill-current" /> Play on Roblox
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

// ── Regular game card ───────────────────────────────────────────
function GameCard({ game, index }: { game: GameEntry; index: number }) {
  const meta = GAME_META[game.place_id] ?? DEFAULT_META;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.06, duration: 0.4 }}
      whileHover={{ y: -5 }}
      className="group"
    >
      <div className="h-full rounded-2xl overflow-hidden bg-card/60 backdrop-blur-xl border border-white/5 hover:border-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 flex flex-col">

        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden flex-shrink-0">
          <GameThumbnail iconUrl={game.icon_url || ""} name={game.name} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
          {/* Visit badge overlay */}
          <div className="absolute top-3 right-3 z-10">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-sm text-[11px] text-white font-semibold border border-white/10">
              <Eye className="w-3 h-3 text-cyan-400" /> {fmt(game.visits)}
            </div>
          </div>
        </div>

        {/* Card body */}
        <div className="p-5 flex flex-col flex-1 gap-3">
          {/* Title */}
          <h3 className="text-sm sm:text-base font-bold font-display leading-snug line-clamp-2" title={game.name}>
            {game.name}
          </h3>

          {/* Contribution + creator */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              by <span className="text-foreground/80 font-medium">{game.creator}</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold">
                <Brush className="w-2.5 h-2.5" /> {meta.role}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground">
                <Zap className="w-2.5 h-2.5" /> {meta.genre}
              </span>
            </div>
          </div>

          {/* Roblox link */}
          <a
            href={getRobloxUrl(game)}
            target="_blank" rel="noopener noreferrer"
            className="mt-auto block"
          >
            <div className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-primary/25 bg-primary/8 hover:bg-primary/18 text-primary font-semibold text-sm transition-all duration-200 group/btn">
              <Play className="w-3.5 h-3.5 fill-current" />
              Play on Roblox
              <ExternalLink className="w-3 h-3 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
            </div>
          </a>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main page ───────────────────────────────────────────────────
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
    const channel = supabase.channel("games-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, () => {
        try { localStorage.removeItem(CACHE_KEY); } catch {}
        load(true);
      }).subscribe();
    return () => { supabase?.removeChannel(channel); };
  }, [load]);

  const total      = games.reduce((s, g) => s + (Number(g.visits) || 0), 0);
  const featured   = games.find(g => (GAME_META[g.place_id] ?? DEFAULT_META).highlight) ?? games[0] ?? null;
  const rest       = featured ? games.filter(g => g.id !== featured.id) : games;

  return (
    <div className="min-h-screen pt-8 pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="text-center mb-12 sm:mb-14">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6 border border-primary/20">
            <Gamepad2 className="w-4 h-4" /> {t("games.badge")}
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl md:text-6xl font-bold font-display mb-4">
            <span className="bg-gradient-to-r from-primary via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Games I Designed
            </span>{" "}
            <span className="text-foreground">UI For</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-muted-foreground max-w-2xl mx-auto mb-6 text-sm sm:text-base">
            {t("games.subtitle")}
          </motion.p>

          {/* Stats summary bar */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
            className="inline-flex flex-wrap items-center justify-center gap-4 px-6 py-3 rounded-2xl bg-card/50 border border-white/8 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="font-bold text-foreground">{fmt(total)}</span> total visits
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Gamepad2 className="w-4 h-4 text-primary" />
              <span className="font-bold text-foreground">{games.length}</span> games
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              Featured UI designer
            </div>
          </motion.div>
        </div>

        {/* ── Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 mb-10">
          {loading ? (
            <>
              <Skeleton large />
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)}
            </>
          ) : (
            <AnimatePresence>
              {/* Featured card spans full width */}
              {featured && <FeaturedCard key={featured.id} game={featured} />}
              {/* Rest of games */}
              {rest.map((game, i) => <GameCard key={game.place_id || game.id} game={game} index={i} />)}
            </AnimatePresence>
          )}
        </div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
          className="text-center text-sm text-muted-foreground mb-12">
          …and many more projects available on request
        </motion.p>

        {/* ── CTA ── */}
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="bg-card/40 backdrop-blur-xl border border-white/10 rounded-3xl p-10 sm:p-14 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-5 border border-primary/20">
            <Users className="w-3.5 h-3.5" /> Open for projects
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold mb-3 text-zinc-100">{t("games.ctaTitle")}</h2>
          <p className="text-zinc-400 mb-8 max-w-xl mx-auto text-sm">{t("games.ctaText")}</p>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Button size="lg" className="gap-2 rounded-full px-8 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold discord-glow" onClick={openDiscord}>
              <MessageSquare className="w-5 h-5" /> {t("games.contactDiscord")}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
