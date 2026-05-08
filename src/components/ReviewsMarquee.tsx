import { motion } from "framer-motion";
import { Star, CheckCircle2 } from "lucide-react";
import { reviewsData } from "@/lib/data";

export function ReviewsMarquee() {
  // Duplicate reviews for seamless loop
  const duplicatedReviews = [...reviewsData, ...reviewsData, ...reviewsData];

  return (
    <section className="w-full max-w-7xl mx-auto px-6 mb-24 relative z-10 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
          Latest Reviews
        </h2>
        <motion.div
          className="w-20 h-1.5 bg-primary rounded-full mx-auto"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        />
      </motion.div>

      {/* Marquee Container */}
      <div className="relative">
        {/* Left Fade */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />

        {/* Right Fade */}
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        {/* Marquee Track */}
        <div className="flex gap-6">
          <motion.div
            className="flex gap-6"
            animate={{ x: [0, -33.333] }}
            transition={{
              duration: 60,
              repeat: 999999,
              ease: "linear",
              repeatType: "loop",
            }}
          >
            {duplicatedReviews.map((review, index) => (
              <motion.div
                key={`${review.id}-${index}`}
                className="flex-shrink-0 w-96"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="h-full bg-card/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-primary/30 transition-all duration-300">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                        <Star className="w-6 h-6 text-white fill-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">
                          {review.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {review.project_type}
                        </p>
                      </div>
                    </div>
                    {review.verified && (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]"
                      />
                    ))}
                  </div>

                  {/* Text */}
                  <p className="text-muted-foreground leading-relaxed mb-4 line-clamp-3">
                    "{review.text}"
                  </p>

                  {/* Date */}
                  <p className="text-xs text-muted-foreground">{review.date}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
