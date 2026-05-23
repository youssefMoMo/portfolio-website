// ═══════════════════════════════════════════════════════════════
// CONTENT HOOKS — PRODUCTION REFACTOR
// src/hooks/useContent.ts
//
// Changelog vs. original:
//   [FIX-6] updateContent requires an explicit `id` parameter.
//           Fallback to (content as any)?.id is removed. If no id
//           can be resolved, the function returns a typed error
//           instead of crashing with "Content ID not found".
//   [FIX-7] fetchContent uses .maybeSingle() instead of .single()
//           to gracefully handle both 0-row and multi-row results
//           without throwing PGRST116 errors on empty tables.
//   [FIX-8] Optimistic UI implemented in updatePlan, useReviews
//           (via updateReview), and usePoliciesList (via updatePolicy).
//           Local state is patched immediately; a rollback is applied
//           on DB error.
//   [FIX-9] Default Review avatar literal matches the typed `avatar`
//           field (string | undefined). Literal "S" is valid but is
//           now explicitly annotated as satisfying Review to surface
//           any future type mismatches at compile time.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";
import {
  HomeContent,
  PortfolioContent,
  PricingContent,
  ReviewsContent,
  PoliciesContent,
  PricingPlan,
  Review,
  Policy,
} from "@/lib/contentManager";

// ─── Generic Hook Factory ─────────────────────────────────────────────────────

/**
 * useSupabaseContent
 *
 * Generic hook for a table that stores a single JSON document row.
 * updateContent requires an explicit `id` [FIX-6].
 * fetchContent uses maybeSingle() [FIX-7].
 */
function useSupabaseContent<T extends { id?: string | number }>(
  tableName: string,
  defaultValue: T,
  channelName: string
) {
  const [content, setContent] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // [FIX-7] maybeSingle() returns null (not an error) when 0 rows are found.
  const fetchContent = useCallback(async () => {
    if (!isSupabaseEnabled || !supabase) {
      setLoading(false);
      setError("Supabase not configured");
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from(tableName)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(); // [FIX-7]

      if (fetchError) throw fetchError;

      // data is null when the table is empty — fall back to default gracefully
      setContent(data != null ? (data as T) : defaultValue);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch content";
      setError(msg);
      setContent(defaultValue);
    } finally {
      setLoading(false);
    }
  }, [tableName, defaultValue]);

  useEffect(() => {
    fetchContent();
    if (!isSupabaseEnabled || !supabase) return;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: tableName },
        () => { fetchContent(); }
      )
      .subscribe();

    return () => { supabase?.removeChannel(channel); };
  }, [fetchContent, channelName, tableName]);

  // [FIX-6] `id` is now mandatory — no silent (content as any)?.id fallback.
  const updateContent = useCallback(
    async (
      updates: Partial<T>,
      id: string | number
    ): Promise<{ success?: boolean; error?: string }> => {
      if (!isSupabaseEnabled || !supabase) {
        return { error: "Supabase not configured" };
      }

      if (id === undefined || id === null || id === "") {
        return { error: "A valid content ID is required to update" };
      }

      try {
        const { error: updateError } = await supabase
          .from(tableName)
          .update(updates as Record<string, unknown>)
          .eq("id", id);

        if (updateError) throw updateError;
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to update content";
        return { error: msg };
      }
    },
    [tableName]
  );

  return {
    content: content ?? defaultValue,
    loading,
    error,
    updateContent,
    refetch: fetchContent,
  };
}

// ─── useHomeContent ───────────────────────────────────────────────────────────

export function useHomeContent() {
  const defaultHome: HomeContent = {
    hero_badge: "Available for Projects",
    hero_title1: "Crafting Immersive",
    hero_title2: "User Interfaces",
    hero_subtitle:
      "Crafting immersive and high-quality user interfaces for your Roblox experiences.",
    stats_projects: "50+",
    stats_clients: "30+",
    stats_rating: "4.9",
    stats_years: "2+",
    cta_title: "Ready to Transform Your Game?",
    cta_subtitle:
      "Elevate your Roblox experience with premium, professional UI design that players love.",
  };

  return useSupabaseContent<HomeContent>(
    "home_content",
    defaultHome,
    "home_content_changes"
  );
}

// ─── usePortfolioContent ──────────────────────────────────────────────────────

export function usePortfolioContent() {
  const defaultPortfolio: PortfolioContent = {
    items: [
      { id: 1, title: "Gaming UI Design", image: "/images/portfolio/work1.png", category: "UI Design" },
      { id: 2, title: "Roblox Game Interface", image: "/images/portfolio/work2.png", category: "Game UI" },
      { id: 3, title: "Mobile Game UI", image: "/images/portfolio/work3.png", category: "Mobile UI" },
      { id: 4, title: "Dashboard Design", image: "/images/portfolio/work4.png", category: "Web UI" },
      { id: 5, title: "E-commerce Platform", image: "/images/portfolio/work5.png", category: "Web UI" },
      { id: 6, title: "Social Media App", image: "/images/portfolio/work6.png", category: "Mobile UI" },
    ],
  };

  return useSupabaseContent<PortfolioContent>(
    "portfolio_content",
    defaultPortfolio,
    "portfolio_content_changes"
  );
}

// ─── usePricingContent ────────────────────────────────────────────────────────

export function usePricingContent() {
  const defaultPricing: PricingContent = {
    plans: [
      {
        id: "default-1",
        name: "Mini",
        price_usd: "15",
        price_robux: "4K",
        frames: "1-2 Frames",
        features: ["1-2 Custom Frames", "Basic UI Elements", "1 Free Revision", "Standard Delivery", "Source Files"],
        featured: false,
        icon: "zap",
      },
      {
        id: 2,
        name: "Basic",
        price_usd: "35",
        price_robux: "10K",
        frames: "3-5 Frames",
        features: ["3-5 Custom Frames", "Advanced UI Elements", "2 Free Revisions", "Standard Delivery", "Source Files"],
        featured: false,
        icon: "layers",
      },
      {
        id: 3,
        name: "Standard",
        price_usd: "70",
        price_robux: "20K",
        frames: "6-10 Frames",
        features: ["6-10 Custom Frames", "Custom Icons", "3 Free Revisions", "Priority Delivery", "Source Files", "Commercial Use"],
        featured: true,
        icon: "award",
      },
      {
        id: 4,
        name: "Advanced",
        price_usd: "120",
        price_robux: "35K",
        frames: "11-15 Frames",
        features: ["11-15 Custom Frames", "Complex Layouts", "5 Free Revisions", "Priority Delivery", "Source Files", "Commercial Use", "VIP Support"],
        featured: false,
        icon: "crown",
      },
      {
        id: 5,
        name: "Professional",
        price_usd: "180",
        price_robux: "50K",
        frames: "16-20 Frames",
        features: ["16-20 Custom Frames", "Full Game UI System", "Unlimited Revisions", "Rush Delivery", "Source Files", "Commercial Use", "VIP Support", "Import to Studio"],
        featured: false,
        icon: "infinity",
      },
    ],
  };

  return useSupabaseContent<PricingContent>(
    "pricing_content",
    defaultPricing,
    "pricing_content_changes"
  );
}

// ─── usePricingPlans ──────────────────────────────────────────────────────────

export function usePricingPlans() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    if (!isSupabaseEnabled || !supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from("pricing_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (fetchError) throw fetchError;
      setPlans((data as PricingPlan[]) || []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
    if (!isSupabaseEnabled || !supabase) return;

    const channel = supabase
      .channel("pricing_plans_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pricing_plans" },
        () => { fetchPlans(); }
      )
      .subscribe();

    return () => { supabase?.removeChannel(channel); };
  }, [fetchPlans]);

  // [FIX-8] Optimistic update: patch local state immediately, rollback on error.
  const updatePlan = useCallback(
    async (
      id: number,
      updates: Partial<PricingPlan>
    ): Promise<{ success?: boolean; error?: string }> => {
      if (!isSupabaseEnabled || !supabase) {
        return { error: "Supabase not configured" };
      }

      // Snapshot for rollback
      const previous = plans;

      // Apply optimistic patch [FIX-8]
      setPlans((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );

      try {
        const { error: updateError } = await supabase
          .from("pricing_plans")
          .update(updates)
          .eq("id", id);

        if (updateError) throw updateError;
        return { success: true };
      } catch (err: unknown) {
        // Rollback on failure [FIX-8]
        setPlans(previous);
        const msg = err instanceof Error ? err.message : "Failed to update plan";
        return { error: msg };
      }
    },
    [plans]
  );

  return { plans, loading, error, updatePlan, refetch: fetchPlans };
}

// ─── useReviewsContent ────────────────────────────────────────────────────────

export function useReviewsContent() {
  // [FIX-9] avatar: "S" satisfies Review["avatar"] (string | undefined). 
  // Explicitly typed as ReviewsContent to catch drift at compile time.
  const defaultReviews: ReviewsContent = {
    reviews: [
      {
        id: "default-1",
        name: "schwerer",
        rating: 5,
        text: "affordable, fast, flexible with revisions and good quality solid",
        project_type: "UI Design",
        date: "2024-11",
        status: "approved" as const,
        verified: true,
        avatar: "S", // single-char initials avatar — valid for Review.avatar: string | undefined
      } satisfies ReviewsContent["reviews"][number],
    ],
    page_title: "Customer Reviews",
    page_description: "See what my clients say about working with me",
  };

  return useSupabaseContent<ReviewsContent>(
    "reviews_content",
    defaultReviews,
    "reviews_content_changes"
  );
}

// ─── useReviews ───────────────────────────────────────────────────────────────

export function useReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    if (!isSupabaseEnabled || !supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from("reviews")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setReviews((data as Review[]) || []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch reviews");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
    if (!isSupabaseEnabled || !supabase) return;

    const channel = supabase
      .channel("reviews_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reviews" },
        () => { fetchReviews(); }
      )
      .subscribe();

    return () => { supabase?.removeChannel(channel); };
  }, [fetchReviews]);

  // [FIX-8] Optimistic update for individual review mutations.
  const updateReview = useCallback(
    async (
      id: string,
      updates: Partial<Review>
    ): Promise<{ success?: boolean; error?: string }> => {
      if (!isSupabaseEnabled || !supabase) {
        return { error: "Supabase not configured" };
      }

      const previous = reviews;

      // Optimistic patch [FIX-8]
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
      );

      try {
        const { error: updateError } = await supabase
          .from("reviews")
          .update(updates)
          .eq("id", id);

        if (updateError) throw updateError;
        return { success: true };
      } catch (err: unknown) {
        setReviews(previous); // rollback [FIX-8]
        const msg = err instanceof Error ? err.message : "Failed to update review";
        return { error: msg };
      }
    },
    [reviews]
  );

  return { reviews, loading, error, updateReview, refetch: fetchReviews };
}

// ─── usePoliciesContent ───────────────────────────────────────────────────────

export function usePoliciesContent() {
  const defaultPolicies: PoliciesContent = {
    policies: [
      {
        id: "default-1",
        title: "Payment Policy",
        description:
          "50% upfront, 50% upon completion. Payment must be made before work begins. We accept PayPal, Robux, and other payment methods.",
        icon: "shield",
      },
      {
        id: 2,
        title: "Revision Policy",
        description:
          "Each plan includes a specific number of revisions. Additional revisions may incur extra charges. Please provide clear feedback to minimize revisions.",
        icon: "refresh",
      },
      {
        id: 3,
        title: "Delivery Time",
        description:
          "Delivery times vary based on the plan selected. Basic plans typically take 3-5 business days. Rush orders may be available for an additional fee.",
        icon: "clock",
      },
    ],
    page_title: "Policies & Terms",
    page_description: "Understand my working policies and terms",
  };

  return useSupabaseContent<PoliciesContent>(
    "policies_content",
    defaultPolicies,
    "policies_content_changes"
  );
}

// ─── usePoliciesList ──────────────────────────────────────────────────────────

export function usePoliciesList() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPolicies = useCallback(async () => {
    if (!isSupabaseEnabled || !supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from("policies_list")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (fetchError) throw fetchError;
      setPolicies((data as Policy[]) || []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch policies");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
    if (!isSupabaseEnabled || !supabase) return;

    const channel = supabase
      .channel("policies_list_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "policies_list" },
        () => { fetchPolicies(); }
      )
      .subscribe();

    return () => { supabase?.removeChannel(channel); };
  }, [fetchPolicies]);

  // [FIX-8] Optimistic update for individual policy mutations.
  const updatePolicy = useCallback(
    async (
      id: string | number,
      updates: Partial<Policy>
    ): Promise<{ success?: boolean; error?: string }> => {
      if (!isSupabaseEnabled || !supabase) {
        return { error: "Supabase not configured" };
      }

      const previous = policies;

      // Optimistic patch [FIX-8]
      setPolicies((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );

      try {
        const { error: updateError } = await supabase
          .from("policies_list")
          .update(updates)
          .eq("id", id);

        if (updateError) throw updateError;
        return { success: true };
      } catch (err: unknown) {
        setPolicies(previous); // rollback [FIX-8]
        const msg = err instanceof Error ? err.message : "Failed to update policy";
        return { error: msg };
      }
    },
    [policies]
  );

  return { policies, loading, error, updatePolicy, refetch: fetchPolicies };
}
