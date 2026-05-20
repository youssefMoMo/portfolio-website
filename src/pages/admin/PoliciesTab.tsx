// src/pages/admin/PoliciesTab.tsx
// Policies + FAQ admin editor — BOTH persist to Supabase via site_content.
// FAQs use content_type = "faqs", policies use content_type = "policies".
import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale, Save, Plus, Trash2, ChevronUp, ChevronDown,
  HelpCircle, Edit3, X, RefreshCcw, GripVertical,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  getContent, saveContent,
  PoliciesContent, Policy,
  FaqsContent, FaqItem,
} from "@/lib/contentManager";

const INPUT_CLS = "bg-white dark:bg-background/50 border-slate-200 dark:border-white/10 text-sm focus:border-primary/40 mt-1.5";

// ── Reusable accordion row ─────────────────────────────────────
function AccordionRow({
  header, children, onDelete, onMoveUp, onMoveDown, disableUp, disableDown,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  disableUp: boolean;
  disableDown: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-100 dark:border-white/5 rounded-xl bg-background/20 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* drag handle visual */}
        <GripVertical className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
        {/* title */}
        <div className="flex-1 min-w-0 text-sm font-medium truncate">{header}</div>
        {/* reorder */}
        <button disabled={disableUp}   onClick={onMoveUp}   className="p-1 rounded hover:bg-white/10 disabled:opacity-25 transition-colors"><ChevronUp   className="w-3.5 h-3.5" /></button>
        <button disabled={disableDown} onClick={onMoveDown} className="p-1 rounded hover:bg-white/10 disabled:opacity-25 transition-colors"><ChevronDown className="w-3.5 h-3.5" /></button>
        {/* edit toggle */}
        <button onClick={() => setOpen(v => !v)} className="p-1 rounded hover:bg-white/10 text-primary transition-colors">
          {open ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
        </button>
        {/* delete */}
        <button onClick={onDelete} className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100 dark:border-white/5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function moveItem<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const out = [...arr];
  const ni = i + dir;
  if (ni < 0 || ni >= out.length) return out;
  [out[i], out[ni]] = [out[ni], out[i]];
  return out;
}

// ── Section header ─────────────────────────────────────────────
function SectionHeader({
  icon: Icon, title, count, onAdd, saving, onSave, color,
}: {
  icon: React.ElementType; title: string; count: number;
  onAdd: () => void; saving: boolean; onSave: () => void; color: string;
}) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
      <h3 className={`text-sm font-semibold flex items-center gap-2 ${color}`}>
        <Icon className="w-4 h-4" /> {title} ({count})
      </h3>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={onAdd}>
          <Plus className="w-3 h-3" /> Add
        </Button>
        <Button size="sm" className="gap-1.5 h-7 text-xs" onClick={onSave} disabled={saving}>
          {saving
            ? <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
            : <Save className="w-3 h-3" />}
          Save
        </Button>
      </div>
    </div>
  );
}

// ── Main tab ───────────────────────────────────────────────────
export default function PoliciesTab() {
  const { toast } = useToast();

  // Policies state
  const [policies, setPolicies]     = useState<Policy[]>([]);
  const [policySaving, setPolicySaving] = useState(false);
  const [policyLoading, setPolicyLoading] = useState(true);

  // FAQs state — Supabase-backed via content_type = "faqs"
  const [faqs, setFaqs]             = useState<FaqItem[]>([]);
  const [faqSaving, setFaqSaving]   = useState(false);
  const [faqLoading, setFaqLoading] = useState(true);

  // ── Loaders ──────────────────────────────────────────────────
  const loadPolicies = useCallback(async () => {
    setPolicyLoading(true);
    try {
      const data = await getContent("policies");
      setPolicies(data?.policies ?? []);
    } catch (e: any) {
      toast({ title: "⚠️ Policies load failed", description: e.message, variant: "destructive" });
    } finally { setPolicyLoading(false); }
  }, []);

  const loadFaqs = useCallback(async () => {
    setFaqLoading(true);
    try {
      const data = await getContent("faqs");
      setFaqs(data?.items ?? []);
    } catch (e: any) {
      toast({ title: "⚠️ FAQ load failed", description: e.message, variant: "destructive" });
    } finally { setFaqLoading(false); }
  }, []);

  useEffect(() => { loadPolicies(); loadFaqs(); }, [loadPolicies, loadFaqs]);

  // ── Savers ───────────────────────────────────────────────────
  const savePolicies = async () => {
    setPolicySaving(true);
    try {
      const result = await saveContent("policies", { policies } as PoliciesContent);
      if (result.ok === false) throw new Error((result as any).error ?? "Save failed");
      toast({ title: "✅ Policies saved", description: "Live on the public Policies page." });
    } catch (e: any) {
      toast({ title: "❌ Policies save failed", description: e.message, variant: "destructive" });
    } finally { setPolicySaving(false); }
  };

  const saveFaqs = async () => {
    setFaqSaving(true);
    try {
      // Re-apply display_order from current array position
      const ordered = faqs.map((f, i) => ({ ...f, display_order: i, is_published: true }));
      const result = await saveContent("faqs", { items: ordered } as FaqsContent);
      if (result.ok === false) throw new Error((result as any).error ?? "Save failed");
      setFaqs(ordered); // sync local state with saved order
      toast({ title: "✅ FAQs saved", description: "Live on the public Pricing & FAQ pages." });
    } catch (e: any) {
      toast({ title: "❌ FAQ save failed", description: e.message, variant: "destructive" });
    } finally { setFaqSaving(false); }
  };

  // ── Policy helpers ────────────────────────────────────────────
  const addPolicy = () => setPolicies(prev => [
    ...prev,
    { id: `pol-${Date.now()}`, title: "", description: "", icon: "shield", is_published: true },
  ]);
  const updatePolicy = (i: number, p: Policy) =>
    setPolicies(prev => prev.map((x, xi) => xi === i ? p : x));
  const deletePolicy = (i: number) =>
    setPolicies(prev => prev.filter((_, xi) => xi !== i));

  // ── FAQ helpers ───────────────────────────────────────────────
  const addFaq = () => setFaqs(prev => [
    ...prev,
    { id: `faq-${Date.now()}`, question: "", answer: "", display_order: prev.length, is_published: true },
  ]);
  const updateFaq = (i: number, f: FaqItem) =>
    setFaqs(prev => prev.map((x, xi) => xi === i ? f : x));
  const deleteFaq = (i: number) =>
    setFaqs(prev => prev.filter((_, xi) => xi !== i));

  const loading = policyLoading || faqLoading;

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary" />
    </div>
  );

  return (
    <motion.div
      key="policies-tab"
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-white/80 dark:bg-card/60 backdrop-blur-xl border-slate-200 dark:border-white/10 shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-500">
                <Scale className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Policies &amp; FAQ</CardTitle>
                <CardDescription>Both sections save permanently to Supabase and update the public site instantly</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => { loadPolicies(); loadFaqs(); }}>
              <RefreshCcw className="w-4 h-4" /> Reload All
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-10">

          {/* ── POLICIES ── */}
          <section>
            <SectionHeader
              icon={Scale} title="Policy Sections" count={policies.length} color="text-red-400"
              onAdd={addPolicy} saving={policySaving} onSave={savePolicies}
            />

            {policies.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-10 border border-dashed border-white/8 rounded-xl">
                No policies yet —{" "}
                <button onClick={addPolicy} className="text-primary underline">add the first one</button>
              </div>
            ) : (
              <div className="space-y-2">
                {policies.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    <AccordionRow
                      header={p.title || <span className="italic text-muted-foreground">Untitled policy</span>}
                      onDelete={() => deletePolicy(i)}
                      onMoveUp={() => setPolicies(a => moveItem(a, i, -1))}
                      onMoveDown={() => setPolicies(a => moveItem(a, i, 1))}
                      disableUp={i === 0}
                      disableDown={i === policies.length - 1}
                    >
                      <div>
                        <label className="text-xs text-muted-foreground">Title</label>
                        <Input className={INPUT_CLS} value={p.title}
                          onChange={e => updatePolicy(i, { ...p, title: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Icon key (e.g. shield, clock, lock)</label>
                        <Input className={INPUT_CLS} value={p.icon}
                          onChange={e => updatePolicy(i, { ...p, icon: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Description</label>
                        <Textarea className={INPUT_CLS} rows={4} value={p.description}
                          onChange={e => updatePolicy(i, { ...p, description: e.target.value })} />
                      </div>
                    </AccordionRow>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* divider */}
          <div className="border-t border-slate-100 dark:border-white/5" />

          {/* ── FAQs ── */}
          <section>
            <SectionHeader
              icon={HelpCircle} title="FAQ Questions" count={faqs.length} color="text-primary"
              onAdd={addFaq} saving={faqSaving} onSave={saveFaqs}
            />

            {/* Supabase persistence confirmed badge */}
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-green-500/8 border border-green-500/20 text-xs text-green-400">
              <Save className="w-3.5 h-3.5 flex-shrink-0" />
              FAQ data is saved to Supabase (<code className="font-mono">site_content / content_type = "faqs"</code>) and persists permanently across sessions and visitors.
            </div>

            {faqs.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-10 border border-dashed border-white/8 rounded-xl">
                No FAQs yet —{" "}
                <button onClick={addFaq} className="text-primary underline">add the first question</button>
              </div>
            ) : (
              <div className="space-y-2">
                {faqs.map((f, i) => (
                  <motion.div key={f.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    <AccordionRow
                      header={f.question || <span className="italic text-muted-foreground">Untitled question</span>}
                      onDelete={() => deleteFaq(i)}
                      onMoveUp={() => setFaqs(a => moveItem(a, i, -1))}
                      onMoveDown={() => setFaqs(a => moveItem(a, i, 1))}
                      disableUp={i === 0}
                      disableDown={i === faqs.length - 1}
                    >
                      <div>
                        <label className="text-xs text-muted-foreground">Question</label>
                        <Input className={INPUT_CLS} value={f.question}
                          onChange={e => updateFaq(i, { ...f, question: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Answer</label>
                        <Textarea className={INPUT_CLS} rows={4} value={f.answer}
                          onChange={e => updateFaq(i, { ...f, answer: e.target.value })} />
                      </div>
                    </AccordionRow>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

        </CardContent>
      </Card>
    </motion.div>
  );
}
