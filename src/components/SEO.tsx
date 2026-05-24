// src/components/SEO.tsx
//
// ─── REFACTOR NOTES ─────────────────────────────────────────────────────────
//
//  DYNAMIC ORIGIN HOOK  (useRuntimeOrigin)
//    • Canonical URLs and og:url / twitter:url previously hardcoded
//      "https://youssef-portfolio.store" at module scope. That value is
//      baked in at bundle time, so Vercel preview deployments (*.vercel.app)
//      and any future domain aliases would emit the wrong canonical, causing
//      crawlers to index the wrong host and social scrapers to resolve a
//      potentially incorrect URL.
//    • `useRuntimeOrigin()` reads `window.location.origin` on the client at
//      render time and appends `window.location.pathname` to produce a fully
//      qualified URL that always reflects the live domain, whether that is
//      the custom domain, a Vercel preview URL, or localhost during dev.
//    • A compile-time fallback (`SITE_URL`) is retained for SSR / prerender
//      contexts where `window` is not available (typeof window === 'undefined'),
//      ensuring the component never throws in non-browser environments.
//
//  CANONICAL / OG URL RESOLUTION
//    • `canonicalUrl` prop: when not supplied, defaults to the runtime origin
//      + current pathname instead of the static constant.
//    • `og:url` and `twitter:url`: both now use the resolved runtime URL so
//      social share metadata is accurate across all deployment contexts.
//    • The static `image` prop still falls back to `${SITE_URL}/og-image.jpg`
//      because OG images are stored on the canonical production CDN and do not
//      need to be host-relative.
//
//  DUPLICATE JSON-LD KEPT MERGED
//    • Both Person and WebSite schemas remain combined in a single @graph
//      block — canonical per Google's Structured Data documentation.
//
//  DYNAMIC `lang` ATTRIBUTE
//    • `<Helmet htmlAttributes={{ lang }}>` keeps `<html lang>` in sync with
//      every language switch — important for screen readers and search engine
//      locale signals.

import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { DISCORD_PROFILE_URL } from "@/lib/discord";
import { useLanguage } from "@/hooks/use-language";

// ─── Compile-time fallback (used for SSR / prerender only) ────────────────────
//
// This value is the canonical production domain. It is intentionally NOT used
// for any runtime meta tag — useRuntimeOrigin() supplies those values instead.
// It is only referenced when window is unavailable (e.g. a server-side
// render or static prerender build step).

const SITE_URL  = "https://youssef-portfolio.store";
const SITE_NAME = "Youssef Design";

// ─── Runtime origin hook ─────────────────────────────────────────────────────
//
// Safely reads window.location on the client. Returns:
//   • origin:   e.g. "https://youssef-portfolio.store"
//               or   "https://youssef-portfolio-abc123.vercel.app"
//               or   "http://localhost:5173"
//   • pathname: e.g. "/" | "/games" | "/admin"
//   • pageUrl:  origin + pathname — the fully qualified URL of the current page.
//
// Falls back to the compile-time SITE_URL when window is not defined.

function useRuntimeOrigin(): {
  origin: string;
  pathname: string;
  pageUrl: string;
} {
  return useMemo(() => {
    if (typeof window === "undefined") {
      // Non-browser context: return the static fallback so the component
      // does not throw during SSR or static prerender.
      return {
        origin:   SITE_URL,
        pathname: "/",
        pageUrl:  SITE_URL,
      };
    }

    const origin   = window.location.origin;
    // Normalise: strip trailing slash from pathname for canonical hygiene,
    // but keep bare "/" as-is to avoid emitting an empty string.
    const rawPath  = window.location.pathname;
    const pathname = rawPath.length > 1 ? rawPath.replace(/\/$/, "") : rawPath;
    const pageUrl  = `${origin}${pathname}`;

    return { origin, pathname, pageUrl };
  }, [
    // Re-derive whenever the URL changes (client-side navigation via wouter).
    // typeof window === "undefined" is stable, so this memo only re-runs in
    // the browser — and only when location.href changes via a popstate event
    // triggered by the router. Listing the primitive values as deps is safe
    // and avoids stale closures on SPA route transitions.
    //
    // eslint-disable-next-line react-hooks/exhaustive-deps
    typeof window !== "undefined" ? window.location.href : "",
  ]);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SEOProps = {
  title?: string;
  description?: string;
  keywords?: string;
  /** Absolute URL for the OG / Twitter share image. Defaults to the production CDN path. */
  image?: string;
  /**
   * Explicit canonical URL override.
   *
   * When omitted, the canonical defaults to the runtime origin + current
   * pathname (see useRuntimeOrigin). Passing a value explicitly is useful for
   * pages that have a single canonical form regardless of which domain they
   * are rendered on (e.g. a blog post that should always canonicalise to
   * the production domain).
   */
  canonicalUrl?: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SEO({
  title = "Youssef Design - Professional Roblox UI/UX Designer",
  description =
    "Professional UI/UX Designer specializing in Roblox game interfaces. " +
    "Creating immersive and high-quality user experiences for the next generation of gaming.",
  keywords =
    "Youssef, UI/UX Designer, Roblox UI, Game UI, Flat UI Design, " +
    "Roblox Creator, Game Interface Designer",
  image       = `${SITE_URL}/og-image.jpg`,
  canonicalUrl,
}: SEOProps) {
  // Bind <html lang="..."> to the currently active language.
  const { lang } = useLanguage();

  // Derive the fully-qualified current page URL from the live host.
  const { pageUrl } = useRuntimeOrigin();

  // Resolve the canonical URL:
  //   1. If the caller passes an explicit override, honour it.
  //   2. Otherwise use the runtime-derived page URL so previews and
  //      alternate domains always emit the correct host in their meta tags.
  const resolvedCanonical = canonicalUrl ?? pageUrl;

  // ── Consolidated JSON-LD @graph ─────────────────────────────────────────
  // Two schema types in one script block — canonical per Google's guidelines.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type":       "Person",
        "@id":         `${SITE_URL}/#person`,
        name:          SITE_NAME,
        url:           SITE_URL,
        jobTitle:      "Professional UI/UX Designer",
        description:
          "Professional Roblox UI/UX Designer specializing in creating immersive " +
          "and high-quality user interfaces for games",
        sameAs: [
          DISCORD_PROFILE_URL,
          "https://twitter.com/youssef_design",
          "https://behance.net/youssef_design",
        ],
        worksFor: {
          "@type": "Organization",
          name:    `${SITE_NAME} Portfolio`,
        },
        knowsAbout: [
          "UI/UX Design",
          "Roblox Game Development",
          "Game Interface Design",
          "Flat UI Design",
          "User Experience",
        ],
      },
      {
        "@type":       "WebSite",
        "@id":         `${SITE_URL}/#website`,
        name:          `${SITE_NAME} Portfolio`,
        url:           SITE_URL,
        description:   "Professional Roblox UI/UX Designer Portfolio",
        publisher: {
          "@id": `${SITE_URL}/#person`,
        },
      },
    ],
  };

  return (
    <Helmet
      // Dynamically bind the <html lang> attribute to the active language.
      // Screen readers and search-engine locale signals depend on this.
      htmlAttributes={{ lang }}
    >
      {/* ── Basic meta ───────────────────────────────────────────────── */}
      <title>{title}</title>
      <meta name="description"  content={description} />
      <meta name="keywords"     content={keywords} />
      <meta name="author"       content={SITE_NAME} />
      <meta name="robots"       content="index, follow" />
      {/* Canonical reflects the live host at runtime — no hardcoded domain. */}
      <link rel="canonical"     href={resolvedCanonical} />

      {/* ── Open Graph / Facebook ────────────────────────────────────── */}
      <meta property="og:type"        content="website" />
      {/* og:url uses the runtime-resolved URL, not a compile-time constant. */}
      <meta property="og:url"         content={resolvedCanonical} />
      <meta property="og:title"       content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image"       content={image} />
      <meta property="og:site_name"   content={SITE_NAME} />
      <meta property="og:locale"      content={lang === "ar" ? "ar_SA" : lang === "es" ? "es_ES" : "en_US"} />

      {/* ── Twitter Card ─────────────────────────────────────────────── */}
      <meta name="twitter:card"        content="summary_large_image" />
      {/* twitter:url also uses the runtime-resolved URL. */}
      <meta name="twitter:url"         content={resolvedCanonical} />
      <meta name="twitter:title"       content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image"       content={image} />
      <meta name="twitter:creator"     content="@youssef_design" />

      {/* ── PWA / mobile ─────────────────────────────────────────────── */}
      <meta name="theme-color"                           content="#6366F1" />
      <meta name="mobile-web-app-capable"                content="yes" />
      <meta name="apple-mobile-web-app-capable"          content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title"            content={SITE_NAME} />

      {/* ── Consolidated JSON-LD (Person + WebSite in one @graph) ─────── */}
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>
    </Helmet>
  );
}
