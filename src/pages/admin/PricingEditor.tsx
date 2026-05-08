import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, Plus, Trash2, Crown } from "lucide-react";
import { PricingPlan } from "@/lib/contentManager";

export default function PricingEditor() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = () => {
    const saved = localStorage.getItem("admin_pricing_content");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPlans(parsed.plans || []);
      } catch (e) {
      }
    }
  };

  const savePlans = () => {
    const saved = localStorage.getItem("admin_pricing_content");
    let currentData = { plans: [] };

    if (saved) {
      try {
        currentData = JSON.parse(saved);
      } catch (e) {
      }
    }

    localStorage.setItem(
      "admin_pricing_content",
      JSON.stringify({ ...currentData, plans }),
    );
    alert("Plans saved successfully!");
  };

  const handleEdit = (plan: PricingPlan) => {
    setEditingPlan({ ...plan });
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!editingPlan) return;

    // ✅ لو الخطة دي اتعلمت بـ featured، نشيل featured من الباقي
    if (editingPlan.featured) {
      setPlans(
        plans.map((p) => ({
          ...p,
          featured: p.id === editingPlan.id,
        })),
      );
    } else {
      setPlans(plans.map((p) => (p.id === editingPlan.id ? editingPlan : p)));
    }

    setIsEditing(false);
    setEditingPlan(null);
    savePlans();
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
      (_, i) => i !== index,
    );
    setEditingPlan({ ...editingPlan, features: newFeatures });
  };

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
                  Mark as "Most Popular" (Only one plan can have this)
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <Button onClick={handleSaveEdit} className="flex-1">
                  <Check className="w-4 h-4 mr-2" /> Save Changes
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

  return (
    <div className="min-h-screen pt-20 pb-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Pricing Plans Editor</h1>
          <Button onClick={savePlans}>
            <Check className="w-4 h-4 mr-2" /> Save All Changes
          </Button>
        </div>

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
                      <Check className="w-4 h-4 text-primary" /> {feature}
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
      </div>
    </div>
  );
}
