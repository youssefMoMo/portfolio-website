import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Star,
  CheckCircle,
  Briefcase,
  Users,
  Clock,
  Zap,
  Gamepad,
  RefreshCw,
  Repeat,
} from "lucide-react";
import { statsData } from "@/lib/data";
import { getContent, Review } from "@/lib/contentManager";

const STATS_ICONS: Record<string, any> = {
  briefcase: Briefcase,
  users: Users,
  clock: Clock,
  star: Star,
  gamepad: Gamepad,
  zap: Zap,
  refresh: RefreshCw,
  repeat: Repeat,
};

const filteredTools = [
  { id: 1, name: "Photoshop", logo: "/images/photoshop.png", emoji: "🖼️" },
  { id: 2, name: "Figma", logo: "/images/figma.png", emoji: "🎨" },
  { id: 3, name: "Roblox Studio", logo: "/images/roblox-studio.png", emoji: "🎮" },
];

export function DualMarqueeSection() {
  // ✅ جيب الريفيوز من contentManager عشان يشمل الريفيوز الجديدة
  const [liveReviews, setLiveReviews] = useState<Review[]>([]);

  useEffect(() => {
    (async () => {
      const data = await getContent("reviews");
      const verified = data?.reviews?.filter(r => r.verified) || [];
      setLiveReviews(verified.length > 0 ? verified : []);
    })();
    // اسمع لو في ريفيو جديد اتضاف
    const handler = (e: CustomEvent) => {
      if (e.detail?.type === "reviews") {
        const verified = e.detail.data?.reviews?.filter((r: Review) => r.verified) || [];
        setLiveReviews(verified);
      }
    };
    window.addEventListener("contentUpdated", handler as EventListener);
    return () => window.removeEventListener("contentUpdated", handler as EventListener);
  }, []);

  const reviews = liveReviews.length > 0 ? liveReviews : [];
  // ضاعف الريفيوز عشان الـ loop يبان continuous
  const duplicatedReviews = reviews.length > 0
    ? [...reviews, ...reviews, ...reviews, ...reviews]
    : [];
  const duplicatedStats = [...statsData, ...statsData, ...statsData];
  const duplicatedTools = [...filteredTools, ...filteredTools, ...filteredTools, ...filteredTools];

  return (
    <section className="w-full py-10 sm:py-12 overflow-hidden border-y border-white/5 relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-8 sm:mb-10 relative z-10">
        <h3 className="text-lg sm:text-xl md:text-2xl font-display font-bold text-center bg-gradient-to-r from-primary via-indigo-400 to-cyan-400 bg-clip-text text-transparent px-2">
          What People Say & Key Achievements
        </h3>
      </div>

      {/* ══ Reviews Marquee ══ */}
      {duplicatedReviews.length > 0 && (
        <div
          className="relative w-full overflow-hidden mb-6 sm:mb-8"
          style={{
            maskImage: "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
          }}
        >
          <motion.div
            className="flex gap-4 sm:gap-6 whitespace-nowrap"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 60, ease: "linear", repeat: Infinity }}
          >
            {duplicatedReviews.map((review, index) => (
              <div
                key={`${review.id}-${index}`}
                className="flex-shrink-0 bg-card/60 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 w-[280px] sm:w-[320px] hover:border-primary/30 hover:bg-card/80 transition-all cursor-default"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-primary font-bold text-xs sm:text-sm flex-shrink-0">
                    {review.avatar || review.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-foreground text-xs sm:text-sm truncate">{review.name}</h4>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{review.project_type} • {review.date}</p>
                  </div>
                  {review.verified && <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 ml-auto flex-shrink-0" />}
                </div>
                <div className="flex gap-0.5 sm:gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted"}`} />
                  ))}
                </div>
                <p className="text-[11px] sm:text-sm text-muted-foreground leading-relaxed line-clamp-2">
                  "{review.text}"
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      )}

      {/* ══ Stats Marquee ══ */}
      <div
        className="relative w-full overflow-hidden mb-6 sm:mb-8"
        style={{
          maskImage: "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
        }}
      >
        <motion.div
          className="flex gap-4 sm:gap-6 whitespace-nowrap"
          animate={{ x: ["-50%", "0%"] }}
          transition={{ duration: 72, ease: "linear", repeat: Infinity }}
        >
          {duplicatedStats.map((stat, index) => {
            const Icon = STATS_ICONS[stat.icon] || Briefcase;
            return (
              <div
                key={`${stat.id}-${index}`}
                className="flex-shrink-0 bg-card/60 backdrop-blur-sm border border-primary/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 w-[200px] sm:w-[240px] hover:border-primary/40 hover:bg-card/80 transition-all cursor-default"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3 sm:mb-4">
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="text-2xl sm:text-3xl font-display font-bold bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent mb-1 sm:mb-2">
                  {stat.value}
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground">{stat.title}</p>
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* ══ Tools Marquee ══ */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          maskImage: "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
        }}
      >
        <motion.div
          className="flex gap-8 sm:gap-12 whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 80, ease: "linear", repeat: Infinity }}
        >
          {duplicatedTools.map((tool, index) => (
            <div
              key={`${tool.name}-${index}`}
              className="flex-shrink-0 bg-card/60 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-5 sm:p-6 w-[140px] sm:w-[160px] hover:border-primary/30 hover:bg-card/80 transition-all cursor-default flex flex-col items-center justify-center gap-3"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-primary/10 flex items-center justify-center relative overflow-hidden">
                <img
                  src={tool.logo}
                  alt={tool.name}
                  className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = "none";
                    const fb = (e.target as HTMLImageElement).parentElement?.querySelector(".fb");
                    if (fb) { (fb as HTMLElement).style.display = "flex"; }
                  }}
                />
                <div className="fb hidden absolute inset-0 items-center justify-center text-2xl sm:text-3xl">
                  {tool.emoji}
                </div>
              </div>
              <p className="text-[11px] sm:text-xs font-medium text-foreground text-center">{tool.name}</p>
            </div>
          ))}
        </motion.div>
      </div>

    </section>
  );
}
