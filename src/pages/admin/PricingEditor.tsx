// src/pages/admin/PricingEditor.tsx
// Pricing plan editor — persists to Supabase via contentManager.
// localStorage is never used; all reads/writes go through getContent/saveContent
// so public users see price updates instantly after save.
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, Plus, Trash2, Crown, RefreshCcw, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getContent,
  saveContent,
  type PricingPlan,
  type PricingContent,
} from "@/lib/contentManager";

export default function PricingEditor() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Load from Supabase on mount ────────────────────────────────────────────
  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getContent("pricing");
      setPlans((data as PricingContent)?.plans ?? []);
    } catch (e: unknown) {
      toast({
        title: "⚠️ Failed to load pricing plans",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // ── Save to Supabase ───────────────────────────────────────────────────────
  const savePlans = async (plansToSave: PricingPlan[] = plans) => {
    setSaving(true);
    try {
      const payload: PricingContent = {
        plans: plansToSave.map((p, i) => ({
          ...p,
          display_order: i,
          is_published: true,
        })),
      };
      const result = await saveContent("pricing", payload);
      if (result && "ok" in result && result.ok === false) {
        throw new Error((result as { error?: string }).error ?? "Save failed");
      }
      toast({
        title: "✅ Plans saved",
        description: "Pricing is now live for all visitors.",
      });
    } catch (e: unknown) {
      toast({
        title: "❌ Save failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (plan: PricingPlan) => {
    setEditingPlan({ ...plan });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPlan) return;

    // If this plan is being featured, un-feature all others first
    let updatedPlans: PricingPlan[];
    if (editingPlan.featured) {
      updatedPlans = plans.map((p) => ({
        ...p,
        featured: p.id === editingPlan.id,
      }));
    } else {
      updatedPlans = plans.map((p) =>
        p.id === editingPlan.id ? editingPlan : p
      );
    }

    setPlans(updatedPlans);
    setIsEditing(false);
    setEditingPlan(null);
    await savePlans(updatedPlans);
  };

  const handleAddFeature = () => {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      features: [...(editingPlan.features || []), "New Feature"],
    });
  };

  const handleUpdateFeature = (index: number, value: string) => {
    if (!editingPlan) return;
    const newFeatures = [...(editingPlan.features || [])];
    newFeatures[index] = value;
    setEditingPlan({ ...editingPlan, features: newFeatures });
  };

  const handleDeleteFeature = (index: number) => {
    if (!editingPlan) return;
    const newFeatures = (editingPlan.features || []).filter(
      (_, i) => i !== index
    );
    setEditingPlan({ ...editingPlan, features: newFeatures });
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  // ── Edit view ──────────────────────────────────────────────────────────────
  if (isEditing && editingPlan) {
    return (
      <div className="min-h-screen pt-20 pb-12 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Edit Plan</h1>

          <Card className="mb-6">
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Plan Name
                </label>
                <Input
                  value={editingPlan.name}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, name: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Price (USD)
                  </label>
                  <Input
                    value={editingPlan.price_usd}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        price_usd: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Price (Robux)
                  </label>
                  <Input
                    value={editingPlan.price_robux}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        price_robux: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Frames Description
                </label>
                <Input
                  value={editingPlan.frames}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, frames: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Features
                </label>
                <div className="space-y-2">
                  {(editingPlan.features || []).map((feature, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={feature}
                        onChange={(e) =>
                          handleUpdateFeature(index, e.target.value)
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteFeature(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    onClick={handleAddFeature}
                    variant="outline"
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Feature
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="featured"
                  checked={editingPlan.featured || false}
                  onChange={(e) =>
                    setEditingPlan({
                      ...editingPlan,
                      featured: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
                <label htmlFor="featured" className="flex items-center gap-2">
                  <Crown className="w-4 h-4" />
                  Mark as &ldquo;Most Popular&rdquo; (Only one plan can have this)
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? (
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setEditingPlan(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" /> Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Plan list view ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pt-20 pb-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-3">
          <h1 className="text-3xl font-bold">Pricing Plans Editor</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadPlans}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCcw className="w-4 h-4" /> Reload
            </Button>
            <Button
              onClick={() => savePlans()}
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "Saving…" : "Save All Changes"}
            </Button>
          </div>
        </div>

        {plans.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl text-muted-foreground">
            No pricing plans yet. Add one from the Supabase dashboard or seed data.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={plan.featured ? "border-primary" : ""}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    {plan.featured && (
                      <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                        Most Popular
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="text-2xl font-bold">
                      ${plan.price_usd}{" "}
                      <span className="text-sm text-muted-foreground">USD</span>
                    </p>
                    <p className="text-sm text-secondary">
                      {plan.price_robux}+Tax R$
                    </p>
                    <p className="text-sm">{plan.frames}</p>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {(plan.features || []).map((feature, i) => (
                      <li
                        key={i}
                        className="text-sm text-muted-foreground flex items-center gap-2"
                      >
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button onClick={() => handleEdit(plan)} className="w-full">
                    Edit Plan
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
