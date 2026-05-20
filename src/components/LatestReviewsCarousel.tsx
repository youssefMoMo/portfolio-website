import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Review = {
  id: number;
  name: string;
  rating: number;
  text: string;
  projectType: string;
  date: string;
  verified: boolean;
};

const reviewsData: Review[] = [
  {
    id: 1,
    name: "10dok",
    rating: 5,
    text: "super good and affordable, without your ui I wouldve quit finishing my game",
    projectType: "UI Design",
    date: "2024-09",
    verified: true,
  },
  {
    id: 2,
    name: "Gren",
    rating: 5,
    text: "Very fast orders and good quality",
    projectType: "UI Design",
    date: "2024-10",
    verified: true,
  },
  {
    id: 3,
    name: "snowstorm/king",
    rating: 5,
    text: "good, cheap, fast, ui is high quality and more affordable",
    projectType: "UI Design",
    date: "2024-10",
    verified: true,
  },
  {
    id: 4,
    name: "schwerer",
    rating: 5,
    text: "affordable, fast, flexible with revisions and good quality solid",
    projectType: "UI Design",
    date: "2024-11",
    verified: true,
  },
  {
    id: 5,
    name: "nilcous",
    rating: 4,
    text: "handled everything perfectly, great experience, fast delivery. Could improve communication",
    projectType: "UI Design",
    date: "2024-09",
    verified: true,
  },
  {
    id: 6,
    name: "CyraX",
    rating: 5,
    text: "Very fast and efficient, did exactly what I want. Recommended UI artist!",
    projectType: "UI Design",
    date: "2024-08",
    verified: true,
  },
];

export function LatestReviewsCarousel() {
  const [currentPage, setCurrentPage] = useState(0);
  const cardsPerPage = 3;
  const totalPages = Math.ceil(reviewsData.length / cardsPerPage);

  const currentReviews = reviewsData.slice(
    currentPage * cardsPerPage,
    (currentPage + 1) * cardsPerPage,
  );

  return (
    <section className="w-full max-w-7xl mx-auto px-6 mb-24 relative z-10">
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

      {/* Carousel Container */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {currentReviews.map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Card className="h-full bg-white/60 dark:bg-card/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 hover:border-primary/30 transition-all duration-300 shadow-sm dark:shadow-none">
                  <CardContent className="p-6">
                    {/* Header: Avatar + Name + Verified */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                          <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg text-foreground">
                              {review.name}
                            </h3>
                            {review.verified && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring" }}
                              >
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                              </motion.div>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {review.projectType}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Stars Rating */}
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(review.rating)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{
                            delay: i * 0.05,
                            type: "spring",
                            stiffness: 300,
                          }}
                          whileHover={{ scale: 1.2, rotate: 15 }}
                        >
                          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
                        </motion.div>
                      ))}
                    </div>

                    {/* Review Text */}
                    <p className="text-muted-foreground leading-relaxed mb-4 line-clamp-3">
                      "{review.text}"
                    </p>

                    {/* Date */}
                    <p className="text-xs text-muted-foreground">
                      {review.date}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-3 mt-8">
        {Array.from({ length: totalPages }).map((_, index) => (
          <motion.button
            key={index}
            onClick={() => setCurrentPage(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentPage
                ? "bg-primary w-8"
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            }`}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            aria-label={`Go to page ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
