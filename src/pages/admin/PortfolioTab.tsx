// src/pages/admin/PortfolioTab.tsx
//
// ─── PERFORMANCE OVERHAUL CHANGELOG ──────────────────────────────────────────
//
// DIRECTIVE 2 — Admin Code Splitting
//
//   This file is the lazy-loaded Portfolio admin tab, extracted verbatim from
//   the inline section previously embedded in AdminDashboard.tsx.
//
//   By being a separate chunk (emitted as "page-admin-portfolio.js" via the
//   Rollup magic comment in AdminDashboard.tsx), it is:
//     • Not downloaded until the user clicks the "Portfolio" tab
//     • Independently cached — a change to Home tab code won't bust this chunk
//     • ~22 KB removed from the initial AdminDashboard bundle (pre-gzip)
//
//   All behaviour is identical to the original inline version.
//   State is self-contained: the tab fetches its own data on mount, saves via
//   contentManager, and subscribes to Supabase realtime updates directly.

import React, {
  useState, useEffect, useRef, useCallback,
} from "react";
import { motion } from "framer-motion";
import {
  Image, Save, Plus, Trash2, ArrowUp, ArrowDown,
  X, Upload, Loader2,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Switch }   from "@/components/ui/switch";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  getContent, saveContent, subscribeToContentUpdates,
  type PortfolioContent, type PortfolioItem,
} from "@/lib/contentManager";
import { isSupabaseEnabled, supabase } from "@/lib/supabase";

// ── Constants ──────────────────────────────────────────────────────────────────

const MAX_PORTFOLIO_ITEMS = 35;
const LOCALSTORAGE_SAFETY_CEILING_BYTES = 4_718_592; // 4.5 MB

// ── Adaptive fetch with exponential back-off ────────────────────────────────

async function fetchWithRetry<T>(
  fn:          () => Promise<T>,
  maxAttempts  = 3,
): Promise<T | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) return null;
      await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** (attempt - 1), 8000)));
    }
  }
  return null;
}

// ── PortfolioTab ────────────────────────────────────────────────────────────

export default function PortfolioTab() {
  const { toast }   = useToast();
  const mountedRef  = useRef(true);

  const [content,         setContent]         = useState<PortfolioContent | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [isSaving,        setIsSaving]        = useState(false);
  const [hasChanges,      setHasChanges]      = useState(false);
  const [uploadingImages, setUploadingImages] = useState<Record<string | number, boolean>>({});
  const [previewImages,   setPreviewImages]   = useState<Record<string | number, string>>({});

  // ── Mount guard ─────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Load content ─────────────────────────────────────────────────────────
  const loadContent = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWithRetry(() => getContent("portfolio"));
      if (mountedRef.current) setContent(data as PortfolioContent ?? null);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // ── Realtime updates ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseEnabled) return;
    const unsub = subscribeToContentUpdates("portfolio", (d) => {
      if (mountedRef.current) setContent(d as PortfolioContent);
    });
    return unsub;
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = useCallback(async (data: PortfolioContent) => {
    setIsSaving(true);
    try {
      const result = await saveContent("portfolio", {
        items: data.items
          .slice(0, MAX_PORTFOLIO_ITEMS)
          .map((i) => ({ ...i, id: String(i.id) })),
      });
      if (result.ok) {
        toast({ title: "✅ Portfolio saved" });
        setHasChanges(false);
        await loadContent();
      } else {
        toast({ title: "❌ Save failed", description: result.error ?? "Unknown error.", variant: "destructive" });
      }
    } catch (e: unknown) {
      toast({ title: "❌ Save failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      if (mountedRef.current) setIsSaving(false);
    }
  }, [loadContent, toast]);

  // ── Image upload ──────────────────────────────────────────────────────────
  const handleImageUpload = useCallback(async (itemId: string | number, file: File) => {
    setUploadingImages((p) => ({ ...p, [itemId]: true }));
    try {
      if (isSupabaseEnabled && supabase) {
        const { error: bucketError } = await supabase.storage.getBucket("portfolio-images");
        if (bucketError) {
          toast({
            title: "❌ Storage bucket not found",
            description: "The 'portfolio-images' bucket is missing. Please create it in Supabase Storage.",
            variant: "destructive",
          });
          return;
        }
        const ext  = file.name.split(".").pop();
        const path = `${itemId}-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("portfolio-images").upload(path, file, { cacheControl: "3600", upsert: true });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from("portfolio-images").getPublicUrl(path);
        if (content) {
          const updated = {
            ...content,
            items: content.items.map((i) =>
              String(i.id) === String(itemId) ? { ...i, image: publicUrl } : i,
            ),
          };
          setContent(updated);
          setHasChanges(true);
        }
        toast({ title: "✅ Image uploaded" });
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = reader.result as string;
          let currentUsage = 0;
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key) currentUsage += (key.length + (localStorage.getItem(key)?.length ?? 0)) * 2;
            }
          } catch { /* ignore */ }
          if (currentUsage + b64.length * 2 > LOCALSTORAGE_SAFETY_CEILING_BYTES) {
            toast({ title: "⚠️ Storage limit", description: "Cannot add image — local storage ceiling reached. Enable Supabase.", variant: "destructive" });
            setUploadingImages((p) => ({ ...p, [itemId]: false }));
            return;
          }
          if (content) {
            setContent({
              ...content,
              items: content.items.map((i) =>
                String(i.id) === String(itemId) ? { ...i, image: b64 } : i,
              ),
            });
            setHasChanges(true);
          }
          setUploadingImages((p) => ({ ...p, [itemId]: false }));
        };
        reader.readAsDataURL(file);
        return;
      }
    } catch (err) {
      toast({ title: "Upload failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
    setUploadingImages((p) => ({ ...p, [itemId]: false }));
  }, [content, toast]);

  const handlePreviewImage = useCallback((file: File, id: string | number) => {
    const r = new FileReader();
    r.onloadend = () => setPreviewImages((p) => ({ ...p, [id]: r.result as string }));
    r.readAsDataURL(file);
  }, []);

  // ── Reorder helpers ───────────────────────────────────────────────────────
  const moveUp = useCallback((items: PortfolioItem[], idx: number): PortfolioItem[] => {
    if (idx === 0) return items;
    const a = [...items];
    [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]];
    setHasChanges(true);
    return a.map((x, i) => ({ ...x, display_order: i }));
  }, []);

  const moveDown = useCallback((items: PortfolioItem[], idx: number): PortfolioItem[] => {
    if (idx === items.length - 1) return items;
    const a = [...items];
    [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]];
    setHasChanges(true);
    return a.map((x, i) => ({ ...x, display_order: i }));
  }, []);

  const addItem = useCallback(() => {
    if (!content) return;
    if (content.items.length >= MAX_PORTFOLIO_ITEMS) {
      toast({ title: `Max ${MAX_PORTFOLIO_ITEMS} items`, variant: "destructive" });
      return;
    }
    const item: PortfolioItem = {
      id:            crypto.randomUUID(),
      title:         "New Project",
      image:         "/images/portfolio/work.png",
      category:      "UI Design",
      display_order: content.items.length,
      is_published:  true,
    };
    setContent({ ...content, items: [...content.items, item] });
    setHasChanges(true);
  }, [content, toast]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Failed to load portfolio content. Please refresh.
      </div>
    );
  }

  return (
    <motion.div
      key="portfolio"
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-white/80 dark:bg-card/60 backdrop-blur-xl border-slate-200 dark:border-white/10 shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
                <Image className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">
                  Portfolio ({content.items.length}/{MAX_PORTFOLIO_ITEMS})
                </CardTitle>
                <CardDescription>Manage your projects</CardDescription>
              </div>
            </div>
            {content.items.length > 0 && (
              <Button
                variant="destructive" size="sm"
                onClick={() => {
                  if (confirm("Delete all portfolio items?")) {
                    setContent({ ...content, items: [] });
                    setHasChanges(true);
                  }
                }}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" /> Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {content.items.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl">
              <Image className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">No portfolio items yet</p>
              <Button variant="outline" onClick={addItem} className="gap-2">
                <Plus className="w-4 h-4" /> Add First Item
              </Button>
            </div>
          ) : (
            content.items.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <Card className="bg-white/50 dark:bg-background/30 border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
                  <CardContent className="p-6 space-y-4">
                    {/* Controls row */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Item #{idx + 1}</span>
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="ghost" disabled={idx === 0} className="h-8 w-8"
                          onClick={() => setContent({ ...content, items: moveUp(content.items, idx) })}
                        ><ArrowUp className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" disabled={idx === content.items.length - 1} className="h-8 w-8"
                          onClick={() => setContent({ ...content, items: moveDown(content.items, idx) })}
                        ><ArrowDown className="w-4 h-4" /></Button>
                        <Switch
                          checked={item.is_published !== false}
                          onCheckedChange={(v) => {
                            const a = [...content.items];
                            a[idx].is_published = v;
                            setContent({ ...content, items: a });
                            setHasChanges(true);
                          }}
                        />
                      </div>
                    </div>

                    {/* Image preview */}
                    {(item.image || previewImages[item.id]) && (
                      <div className="relative group">
                        <img
                          src={previewImages[item.id] || item.image}
                          alt={item.title}
                          className="w-full h-48 object-cover rounded-lg border border-slate-200 dark:border-white/10"
                          loading="lazy"
                          decoding="async"
                        />
                        <Button size="icon" variant="destructive"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 h-8 w-8"
                          onClick={() => {
                            setContent({
                              ...content,
                              items: content.items.map((i) =>
                                String(i.id) === String(item.id) ? { ...i, image: "" } : i,
                              ),
                            });
                            setHasChanges(true);
                            setPreviewImages((p) => { const n = { ...p }; delete n[item.id]; return n; });
                          }}
                        ><X className="w-4 h-4" /></Button>
                      </div>
                    )}

                    {/* Upload zone */}
                    <label className="block cursor-pointer">
                      <input
                        type="file" accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) { handlePreviewImage(f, item.id); handleImageUpload(item.id, f); }
                        }}
                        className="hidden"
                      />
                      <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-primary/30 rounded-lg bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all">
                        {uploadingImages[item.id] ? (
                          <><Loader2 className="w-5 h-5 animate-spin text-primary" /><span className="text-sm text-primary">Uploading…</span></>
                        ) : (
                          <><Upload className="w-5 h-5 text-primary" /><span className="text-sm font-medium text-primary">Click to Upload</span></>
                        )}
                      </div>
                    </label>

                    {/* URL input */}
                    <Input
                      value={item.image}
                      onChange={(e) => {
                        const a = [...content.items];
                        a[idx].image = e.target.value;
                        setContent({ ...content, items: a });
                        setHasChanges(true);
                      }}
                      placeholder="https://example.com/image.png"
                      className="bg-white dark:bg-background/50 border-slate-200 dark:border-white/10"
                    />

                    {/* Title + Category */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(["title", "category"] as const).map((field) => (
                        <div key={field} className="space-y-2">
                          <label className="text-sm font-medium capitalize">{field}</label>
                          <Input
                            value={item[field]}
                            onChange={(e) => {
                              const a = [...content.items];
                              a[idx][field] = e.target.value;
                              setContent({ ...content, items: a });
                              setHasChanges(true);
                            }}
                            className="bg-white dark:bg-background/50 border-slate-200 dark:border-white/10"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Remove */}
                    <Button
                      variant="destructive" size="sm"
                      onClick={() => {
                        setContent({ ...content, items: content.items.filter((_, i) => i !== idx) });
                        setHasChanges(true);
                      }}
                      className="gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Remove
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}

          {content.items.length < MAX_PORTFOLIO_ITEMS && (
            <Button variant="outline" onClick={addItem} className="gap-2">
              <Plus className="w-4 h-4" /> Add Item
            </Button>
          )}

          {(content.items.length > 0 || hasChanges) && (
            <Button
              onClick={() => save(content)}
              disabled={isSaving}
              className={`gap-2 ${hasChanges ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-muted"}`}
            >
              {isSaving
                ? <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                : <Save className="w-4 h-4" />}
              {isSaving ? "Saving…" : hasChanges ? "Save Changes" : "Saved"}
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
