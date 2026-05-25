// src/pages/admin/GamesTab.tsx — Roblox games CRUD (fully translated)
import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Gamepad2, Plus, Trash2, Save, X, RefreshCcw, ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast }    from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";
import { SafeImage } from "@/components/SafeImage";

interface GamesRow {
  id:            string;
  place_id:      string;
  name:          string;
  universe_id:   string | null;
  visits:        number;
  icon_url:      string;
  creator:       string;
  display_order: number;
  is_published:  boolean;
}

const GAMES_CACHE = "yd_games_v3";

// Roblox place IDs: 7–18 numeric digits (covers old short IDs & modern long ones)
const PLACE_ID_RE = /^\d{7,18}$/;
function isValidPlaceId(id: string): boolean {
  return PLACE_ID_RE.test(id.trim());
}

export default function GamesTab() {
  const { toast }             = useToast();
  const { t }                 = useLanguage();
  const [games, setGames]     = useState<GamesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    place_id: "", name: "", creator: "LightOn Games", display_order: 0, is_published: true,
  });

  const loadGames = useCallback(async () => {
    setLoading(true);
    if (!isSupabaseEnabled || !supabase) {
      setLoading(false);
      toast({ title: `⚠️ ${t("error")}`, variant: "destructive" });
      return;
    }
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .order("display_order", { ascending: true });
    if (!error && data) setGames(data as GamesRow[]);
    setLoading(false);
  }, [t]);

  useEffect(() => { loadGames(); }, [loadGames]);

  const resetForm = () => {
    setForm({ place_id: "", name: "", creator: "LightOn Games", display_order: games.length + 1, is_published: true });
    setEditingId(null);
  };

  const startEdit = (game: GamesRow) => {
    setEditingId(game.id);
    setForm({ place_id: game.place_id, name: game.name, creator: game.creator, display_order: game.display_order, is_published: game.is_published });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async () => {
    const trimmedId = form.place_id.trim();
    if (!trimmedId) {
      toast({ title: `❌ ${t("admin.games.placeId")} required`, variant: "destructive" });
      return;
    }
    if (!isValidPlaceId(trimmedId)) {
      toast({ title: `❌ ${t("error")}`, description: "Place ID must be 7–18 numeric digits.", variant: "destructive" });
      return;
    }
    if (!isSupabaseEnabled || !supabase) {
      toast({ title: `❌ ${t("error")}`, variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      place_id:      trimmedId,
      name:          form.name.trim() || "Roblox Game",
      creator:       form.creator.trim() || "LightOn Games",
      display_order: form.display_order,
      is_published:  form.is_published,
      updated_at:    new Date().toISOString(),
    };
    const op = editingId
      ? supabase.from("games").update(payload).eq("id", editingId)
      : supabase.from("games").insert(payload);
    const { error } = await op;
    if (error) {
      toast({ title: `❌ ${t("error")}`, description: error.message, variant: "destructive" });
    } else {
      localStorage.removeItem(GAMES_CACHE);
      toast({ title: editingId ? `✅ ${t("admin.games.updateBtn")}` : `✅ ${t("admin.games.addBtn")}` });
      resetForm();
      await loadGames();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`${t("delete")} "${name}"?`)) return;
    if (!supabase) return;
    try {
      const { error } = await supabase.from("games").delete().eq("id", id);
      if (error) throw error;
      localStorage.removeItem(GAMES_CACHE);
      toast({ title: `✅ ${t("delete")}` });
      await loadGames();
    } catch (e: unknown) {
      toast({ title: `❌ ${t("error")}`, description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    }
  };

  const handleTogglePublish = async (game: GamesRow) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from("games").update({ is_published: !game.is_published }).eq("id", game.id);
      if (error) throw error;
      localStorage.removeItem(GAMES_CACHE);
      await loadGames();
    } catch (e: unknown) {
      toast({ title: `❌ ${t("error")}`, description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    }
  };

  const handleRefreshRoblox = async (game: GamesRow) => {
    toast({ title: `🔄 ${t("loading")}` });
    try {
      const universeRes = await fetch(
        `https://apis.roblox.com/universes/v1/places/${game.place_id}/universe`
      );
      if (!universeRes.ok) throw new Error(`Universe lookup failed: ${universeRes.status}`);
      const universeData = await universeRes.json() as { universeId?: number };
      const uid = universeData.universeId ? String(universeData.universeId) : "";
      if (!uid) throw new Error("Could not resolve universeId from place ID");

      const updates: Record<string, unknown> = { universe_id: uid, updated_at: new Date().toISOString() };

      const [iconRes, infoRes] = await Promise.all([
        fetch(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${uid}&returnPolicy=PlaceHolder&size=512x512&format=Png`),
        fetch(`https://games.roblox.com/v1/games?universeIds=${uid}`),
      ]);
      const iconData = await iconRes.json() as { data?: { imageUrl?: string }[] };
      const infoData = await infoRes.json() as { data?: { visits?: number; name?: string }[] };
      if (iconData?.data?.[0]?.imageUrl) updates.icon_url = iconData.data[0].imageUrl;
      if (infoData?.data?.[0]) {
        updates.visits = infoData.data[0].visits ?? game.visits;
        if (infoData.data[0].name && game.name === "Roblox Game") updates.name = infoData.data[0].name;
      }

      if (supabase) {
        const { error } = await supabase.from("games").update(updates).eq("id", game.id);
        if (error) throw error;
        localStorage.removeItem(GAMES_CACHE);
        await loadGames();
        toast({ title: `✅ ${t("success")}` });
      }
    } catch (e: unknown) {
      toast({ title: `❌ ${t("error")}`, description: e instanceof Error ? e.message : "Roblox API error", variant: "destructive" });
    }
  };

  return (
    <motion.div
      key="games"
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-white/80 dark:bg-card/60 backdrop-blur-xl border-slate-200 dark:border-white/10 shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600">
                <Gamepad2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">{t("admin.games.title")} ({games.length})</CardTitle>
                <CardDescription>{t("admin.games.desc")}</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={loadGames} className="gap-2">
              <RefreshCcw className="w-4 h-4" /> {t("admin.games.refresh")}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">

          {/* Add / Edit form */}
          <Card className="bg-background/40 border-cyan-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {editingId
                  ? <><Save className="w-4 h-4 text-cyan-400" /> {t("admin.games.editTitle")}</>
                  : <><Plus className="w-4 h-4 text-cyan-400" /> {t("admin.games.addTitle")}</>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t("admin.games.placeId")} <span className="text-red-400">*</span>
                  </label>
                  <Input
                    value={form.place_id}
                    onChange={(e) => setForm((f) => ({ ...f, place_id: e.target.value.replace(/\D/g, "") }))}
                    placeholder="e.g. 12345678901234567"
                    className="bg-white dark:bg-background/50 border-slate-200 dark:border-white/10 font-mono text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    From: roblox.com/games/<strong>ID</strong>/game-name (7–18 digits)
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t("admin.games.gameName")}
                  </label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Leave blank to auto-detect"
                    className="bg-white dark:bg-background/50 border-slate-200 dark:border-white/10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t("admin.games.creator")}
                  </label>
                  <Input
                    value={form.creator}
                    onChange={(e) => setForm((f) => ({ ...f, creator: e.target.value }))}
                    className="bg-white dark:bg-background/50 border-slate-200 dark:border-white/10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t("admin.games.displayOrder")}
                  </label>
                  <Input
                    type="number"
                    value={form.display_order}
                    onChange={(e) => setForm((f) => ({ ...f, display_order: parseInt(e.target.value) || 0 }))}
                    className="bg-white dark:bg-background/50 border-slate-200 dark:border-white/10"
                  />
                </div>

              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={form.is_published}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_published: v }))}
                />
                <span className="text-sm">{t("admin.games.published")}</span>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                >
                  {saving
                    ? <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    : <Save className="w-4 h-4" />}
                  {saving
                    ? t("admin.games.saving")
                    : editingId ? t("admin.games.updateBtn") : t("admin.games.addBtn")}
                </Button>
                {editingId && (
                  <Button variant="outline" onClick={resetForm} className="gap-2">
                    <X className="w-4 h-4" /> {t("cancel")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Games list */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary" />
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl">
              <Gamepad2 className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">{t("admin.games.noGames")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {games.map((game, idx) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <Card className={`bg-white/50 dark:bg-background/30 border-slate-100 dark:border-white/5 ${editingId === game.id ? "border-cyan-500/40" : ""}`}>
                    <CardContent className="p-4 flex items-center gap-4">

                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-indigo-500/20 flex-shrink-0 flex items-center justify-center">
                        {game.icon_url
                          ? <SafeImage
                              src={game.icon_url}
                              alt={game.name}
                              className="w-full h-full object-cover"
                              wrapperClassName="w-full h-full"
                              fallbackIcon={<Gamepad2 className="w-7 h-7 text-primary/30" />}
                            />
                          : <Gamepad2 className="w-7 h-7 text-primary/30" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="font-semibold text-sm truncate">{game.name}</h4>
                          {!game.is_published && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 flex-shrink-0">
                              Hidden
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t("admin.games.placeId")}: <span className="font-mono text-primary/70">{game.place_id}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          by {game.creator} · {game.visits?.toLocaleString() ?? 0} visits · #{game.display_order}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                        <Switch checked={game.is_published} onCheckedChange={() => handleTogglePublish(game)} />
                        <a href={`https://www.roblox.com/games/${game.place_id}`} target="_blank" rel="noopener noreferrer">
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Open on Roblox">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </a>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-cyan-400" onClick={() => handleRefreshRoblox(game)} title="Sync from Roblox">
                          <RefreshCcw className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(game)} title={t("edit")}>
                          <Save className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-500" onClick={() => handleDelete(game.id, game.name)} title={t("delete")}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* How it works */}
          <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/15 text-xs text-cyan-300/80 space-y-1">
            <p className="font-semibold text-cyan-300">{t("admin.games.howTitle")}</p>
            <p>{t("admin.games.how1")}</p>
            <p>{t("admin.games.how2")}</p>
            <p>{t("admin.games.how3")}</p>
          </div>

        </CardContent>
      </Card>
    </motion.div>
  );
}
