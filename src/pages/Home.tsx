import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Briefcase, Users, Clock, Star, Gamepad2, Zap, RefreshCcw, Repeat, ArrowRight, MessageSquare, ImageOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { getContent, HomeContent } from "@/lib/contentManager";
import { useContentRealtime } from "@/hooks/useContentRealtime";
import { profile, statsData } from "@/lib/data";
import { openDiscordProfile } from "@/lib/discord";
import { DualMarqueeSection } from "@/components/DualMarqueeSection";

const ALL_PORTFOLIO_IMAGES = Array.from({ length: 22 }, (_, i) => ({
  id: i + 1,
  title: `Design ${i + 1}`,
  image: `/images/portfolio/work${i + 1}.png`,
  category: "UI Design",
}));

function getWeeklyRandomItems(count: number) {
  const now = new Date();
  const weekNumber = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000),
  );
  const seed = weekNumber * 9301 + 49297;
  const shuffled = [...ALL_PORTFOLIO_IMAGES].sort((a, b) => {
    const ra = ((seed * a.id * 1234567) % 1000) / 1000;
    const rb = ((seed * b.id * 1234567) % 1000) / 1000;
    return ra - rb;
  });
  return shuffled.slice(0, count);
}

const statIcons: Record<string, React.ElementType> = {
  briefcase: Briefcase, users: Users, clock: Clock, star: Star,
  gamepad: Gamepad2, zap: Zap, refresh: RefreshCcw, repeat: Repeat,
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" },
  }),
};

// Safe image for Home — prevents infinite onError recursion
function HomeImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const triedFallback = useRef(false);
  if (failed) return <div className="w-full h-full flex items-center justify-center bg-white/5"><ImageOff className="w-8 h-8 text-white/20" /></div>;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={(e) => {
        const el = e.currentTarget;
        if (!triedFallback.current) {
          triedFallback.current = true;
          el.src = "/images/global/fallback.png";
        } else {
          setFailed(true);
        }
      }}
    />
  );
}

export default function Home() {
  const { t } = useLanguage();
  const [homeContent, setHomeContent] = useState<HomeContent | null>(null);
  const weeklyItems = useMemo(() => getWeeklyRandomItems(6), []);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const home = await getContent("home");
        if (mountedRef.current && !cancelled) setHomeContent(home);
      } catch { /* keep null — UI uses t() fallbacks */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Live updates from admin saves
  useContentRealtime("home", async () => {
    if (!mountedRef.current) return;
    try {
      const home = await getContent("home");
      if (mountedRef.current) setHomeContent(home);
    } catch { /* ignore */ }
  });

  const content = homeContent;

  return (
    <div className="min-h-screen">
      <section className="relative pt-8 pb-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
            <motion.div
              initial={{ rotateX: 0 }}
              animate={{ rotateX: [0, 5, -5, 0], rotateY: [0, 5, -5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              style={{ perspective: 800 }}
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 text-sm font-semibold mb-8 border border-emerald-500/25"
            >
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              {content?.hero_badge || t("hero.badge")}
            </motion.div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold font-display leading-tight mb-6"
          >
            <span className="bg-gradient-to-r from-primary via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              {content?.hero_title1 || t("hero.title1")}
            </span>
            <br />
            <span className="text-foreground">{content?.hero_title2 || t("hero.title2")}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            {content?.hero_subtitle || t("hero.subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex flex-wrap gap-4 justify-center"
          >
            <Link href="/portfolio">
              <Button size="lg" className="gap-2 rounded-full px-8 h-12 text-base font-semibold bg-gradient-to-r from-primary to-indigo-500 hover:from-primary/90 hover:to-indigo-500/90">
                {t("btn.portfolio")} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="gap-2 rounded-full px-8 h-12 text-base font-semibold border-white/10 hover:bg-white/5">
                {t("btn.pricing")}
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {statsData.slice(0, 4).map((stat, i) => {
              const IconComp = statIcons[stat.icon] || Star;
              const dynamicValues: Record<number, string> = {
                1: content?.stats_projects || stat.value,
                2: content?.stats_clients  || stat.value,
                3: content?.stats_years    || stat.value,
                4: content?.stats_rating   || stat.value,
              };
              return (
                <motion.div
                  key={stat.id} custom={i} variants={fadeUp}
                  initial="hidden" whileInView="visible" viewport={{ once: true }}
                  className="group relative p-6 rounded-2xl bg-card/40 backdrop-blur-xl border border-white/5 hover:border-primary/30 transition-all duration-300 text-center"
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <IconComp className="w-6 h-6 text-primary mx-auto mb-3" />
                    <p className="text-3xl md:text-4xl font-bold font-display bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
                      {dynamicValues[stat.id] || stat.value}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{stat.title}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <DualMarqueeSection />

      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl md:text-4xl font-display font-bold mb-4">
              {t("portfolio.title")}
            </motion.h2>
            <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-muted-foreground max-w-xl mx-auto">
              {t("portfolio.subtitle")}
            </motion.p>
          </div>

          {/* Auto-scrolling marquee — preserves card design, adds continuous motion.
              dir="ltr" forces consistent layout regardless of document direction.
              Without this, in Arabic (RTL) the flex container's anchor flips
              and the marquee freezes / disappears off-screen. */}
          <div
            className="relative w-full overflow-hidden"
            dir="ltr"
            style={{
              direction: "ltr",
              maskImage: "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
            }}
          >
            <motion.div
              className="flex gap-6 w-max"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 35, ease: "linear", repeat: Infinity }}
            >
              {[...weeklyItems, ...weeklyItems].map((item, i) => (
                <div
                  key={`${item.id}-${i}`}
                  className="group relative overflow-hidden rounded-2xl bg-card/40 border border-white/5 hover:border-primary/30 transition-all duration-500 w-[320px] md:w-[380px] flex-shrink-0"
                >
                  <div className="aspect-video overflow-hidden bg-card/60 relative">
                    <HomeImage
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                    <p className="text-white font-semibold">{item.title}</p>
                    <p className="text-white/70 text-sm">{item.category}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          <div className="text-center mt-10">
            <Link href="/portfolio">
              <Button variant="outline" className="gap-2 rounded-full px-8">
                {t("btn.portfolio")} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="relative rounded-3xl bg-card/40 backdrop-blur-xl border border-white/10 p-12 md:p-16 text-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-cyan-500/10" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                {content?.cta_title || t("cta.title")}
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8">
                {content?.cta_subtitle || t("cta.subtitle")}
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link href="/pricing">
                  <Button size="lg" className="gap-2 rounded-full px-8 bg-gradient-to-r from-primary to-indigo-500">
                    {t("cta.plan")} <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Button
                  size="lg" variant="outline"
                  className="gap-2 rounded-full px-8 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold discord-glow"
                  onClick={() => openDiscordProfile(profile.discord)}
                >
                  <MessageSquare className="w-4 h-4" />
                  {t("cta.discord")}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
