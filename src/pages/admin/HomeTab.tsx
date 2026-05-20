// src/pages/admin/HomeTab.tsx — Admin content editor for the Home page
import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Home, Save, RefreshCcw, Type, BarChart2, Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getContent, saveContent, HomeContent } from "@/lib/contentManager";

const DEFAULTS: HomeContent = {
  hero_badge: "Available for Projects",
  hero_title1: "Professional Roblox",
  hero_title2: "UI/UX Designer",
  hero_subtitle: "Crafting immersive, high-quality user interfaces that elevate Roblox game experiences to the next level.",
  stats_projects: "150+",
  stats_clients: "80+",
  stats_rating: "5.0",
  stats_years: "3+",
  cta_title: "Ready to Level Up Your Game?",
  cta_subtitle: "Let's create something amazing together. Contact me on Discord to discuss your project.",
};

function Field({
  label, value, onChange, multiline = false,
}: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  const cls = "bg-background/50 border-white/10 text-sm focus:border-primary/40 mt-1.5";
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {multiline
        ? <Textarea className={cls} rows={3} value={value} onChange={e => onChange(e.target.value)} />
        : <Input className={cls} value={value} onChange={e => onChange(e.target.value)} />
      }
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="border border-white/5 rounded-xl p-5 space-y-4 bg-background/20">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
        <Icon className="w-4 h-4" /> {title}
      </h3>
      {children}
    </div>
  );
}

export default function HomeTab() {
  const { toast } = useToast();
  const [form, setForm] = useState<HomeContent>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getContent("home");
      if (data) setForm({ ...DEFAULTS, ...data });
    } catch (e: any) {
      toast({ title: "⚠️ Load failed", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k: keyof HomeContent) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await saveContent("home", form);
      toast({ title: "✅ Home page saved", description: "Changes are live immediately." });
    } catch (e: any) {
      toast({ title: "❌ Save failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary" />
    </div>
  );

  return (
    <motion.div key="home-tab" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.3 }}>
      <Card className="bg-card/60 backdrop-blur-xl border-white/10 shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500">
                <Home className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Home Page Content</CardTitle>
                <CardDescription>Edit hero headlines, stats, and call-to-action text</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={load} disabled={loading}>
                <RefreshCcw className="w-4 h-4" /> Reset
              </Button>
              <Button size="sm" className="gap-2" onClick={save} disabled={saving}>
                {saving
                  ? <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                  : <Save className="w-4 h-4" />}
                Save Changes
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <Section title="Hero Section" icon={Type}>
            <Field label="Availability Badge" value={form.hero_badge} onChange={set("hero_badge")} />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Title Line 1" value={form.hero_title1} onChange={set("hero_title1")} />
              <Field label="Title Line 2 (gradient)" value={form.hero_title2} onChange={set("hero_title2")} />
            </div>
            <Field label="Subtitle / Description" value={form.hero_subtitle} onChange={set("hero_subtitle")} multiline />
          </Section>

          <Section title="Stats Counter" icon={BarChart2}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label="Projects (e.g. 150+)" value={form.stats_projects} onChange={set("stats_projects")} />
              <Field label="Clients (e.g. 80+)" value={form.stats_clients} onChange={set("stats_clients")} />
              <Field label="Rating (e.g. 5.0)" value={form.stats_rating} onChange={set("stats_rating")} />
              <Field label="Years (e.g. 3+)" value={form.stats_years} onChange={set("stats_years")} />
            </div>
          </Section>

          <Section title="CTA Section" icon={Megaphone}>
            <Field label="CTA Headline" value={form.cta_title} onChange={set("cta_title")} />
            <Field label="CTA Subtext" value={form.cta_subtitle} onChange={set("cta_subtitle")} multiline />
          </Section>
        </CardContent>
      </Card>
    </motion.div>
  );
}
