import { Helmet } from "react-helmet-async";
import { DISCORD_PROFILE_URL } from "@/lib/discord";

type SEOProps = {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  canonicalUrl?: string;
};

export function SEO({
  title = "Youssef Design - Professional Roblox UI/UX Designer",
  description = "Professional UI/UX Designer specializing in Roblox game interfaces. Creating immersive and high-quality user experiences for the next generation of gaming.",
  keywords = "Youssef, UI/UX Designer, Roblox UI, Game UI, Flat UI Design, Roblox Creator, Game Interface Designer",
  image = "https://youssef-portoflio.store/og-image.jpg",
  canonicalUrl = "https://youssef-portoflio.store",
}: SEOProps) {
  const siteUrl = "https://youssef-portoflio.store";
  const siteName = "Youssef Design";

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content="Youssef Design" />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={siteUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={siteUrl} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />
      <meta property="twitter:creator" content="@youssef_design" />

      {/* Additional SEO */}
      <meta name="theme-color" content="#6366F1" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta
        name="apple-mobile-web-app-status-bar-style"
        content="black-translucent"
      />
      <meta name="apple-mobile-web-app-title" content={siteName} />

      {/* JSON-LD Schema */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Person",
          name: "Youssef Design",
          url: siteUrl,
          jobTitle: "Professional UI/UX Designer",
          description:
            "Professional Roblox UI/UX Designer specializing in creating immersive and high-quality user interfaces for games",
          sameAs: [
            DISCORD_PROFILE_URL,
            "https://twitter.com/youssef_design",
            "https://behance.net/youssef_design",
          ],
          worksFor: {
            "@type": "Organization",
            name: "Youssef Design Portfolio",
          },
          knowsAbout: [
            "UI/UX Design",
            "Roblox Game Development",
            "Game Interface Design",
            "Flat UI Design",
            "User Experience",
          ],
        })}
      </script>

      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Youssef Design Portfolio",
          url: siteUrl,
          description: "Professional Roblox UI/UX Designer Portfolio",
          publisher: {
            "@type": "Person",
            name: "Youssef Design",
          },
        })}
      </script>
    </Helmet>
  );
}
