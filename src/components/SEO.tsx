// src/components/SEO.tsx
//
// ─── REFACTOR NOTES ─────────────────────────────────────────────────────────
//
//  DOMAIN TYPO FIX
//    • Old: `youssef-portoflio.store` (missing 'i' — "portoflio" not "portfolio")
//    • New: `youssef-portfolio.store`
//    • Every occurrence (siteUrl, default image, default canonicalUrl, og:url,
//      twitter:url) is updated. The bug caused all crawlers and social scrapers
//      to receive a 404 when resolving the canonical URL or OG image.
//
//  DUPLICATE JSON-LD MERGED
//    • The old implementation injected two separate `<script type="application/ld+json">`
//      blocks — one for the `Person` schema and one for the `WebSite` schema.
//      Duplicate ld+json scripts are valid but redundant, and some crawlers
//      process only the first one per page.
//    • Both schemas are now combined in a single `@graph` array inside one
//      script block. This is the canonical pattern recommended by Google's
//      Structured Data documentation and schema.org.
//
//  DYNAMIC `lang` ATTRIBUTE
//    • The previous component had no `htmlAttributes` binding, so the
//      `<html lang="...">` attribute was always whatever the HTML template
//      defaulted to (usually `lang="en"`) regardless of the active language.
//    • `useLanguage()` provides the current `lang` value ("en" | "ar" | "es").
//    • `<Helmet htmlAttributes={{ lang }}>` keeps `<html lang>` in sync with
//      every language switch — important for screen readers and search engine
//      locale signals.

import { Helmet } from "react-helmet-async";
import { DISCORD_PROFILE_URL } from "@/lib/discord";
import { useLanguage } from "@/hooks/use-language";

// ─── Canonical site URL (single definition — fixes the typo) ─────────────────

const SITE_URL  = "https://youssef-portfolio.store";
const SITE_NAME = "Youssef Design";

// ─── Types ────────────────────────────────────────────────────────────────────

type SEOProps = {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
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
  canonicalUrl = SITE_URL,
}: SEOProps) {
  // Bind <html lang="..."> to the currently active language
  const { lang } = useLanguage();

  // ── Consolidated JSON-LD @graph ───────────────────────────────────────────
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
      {/* ── Basic meta ─────────────────────────────────────────────── */}
      <title>{title}</title>
      <meta name="description"  content={description} />
      <meta name="keywords"     content={keywords} />
      <meta name="author"       content={SITE_NAME} />
      <meta name="robots"       content="index, follow" />
      <link rel="canonical"     href={canonicalUrl} />

      {/* ── Open Graph / Facebook ───────────────────────────────────── */}
      <meta property="og:type"        content="website" />
      <meta property="og:url"         content={SITE_URL} />
      <meta property="og:title"       content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image"       content={image} />
      <meta property="og:site_name"   content={SITE_NAME} />
      <meta property="og:locale"      content={lang === "ar" ? "ar_SA" : lang === "es" ? "es_ES" : "en_US"} />

      {/* ── Twitter Card ─────────────────────────────────────────────── */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:url"         content={SITE_URL} />
      <meta name="twitter:title"       content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image"       content={image} />
      <meta name="twitter:creator"     content="@youssef_design" />

      {/* ── PWA / mobile ─────────────────────────────────────────────── */}
      <meta name="theme-color"                        content="#6366F1" />
      <meta name="mobile-web-app-capable"             content="yes" />
      <meta name="apple-mobile-web-app-capable"       content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title"         content={SITE_NAME} />

      {/* ── Consolidated JSON-LD (Person + WebSite in one @graph) ───── */}
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>
    </Helmet>
  );
}
