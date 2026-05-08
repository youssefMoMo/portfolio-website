import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star, X, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";

type ReviewSubmissionFormProps = {
  onClose: () => void;
};

export function ReviewSubmissionForm({ onClose }: ReviewSubmissionFormProps) {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a star rating",
        variant: "destructive",
      });
      return;
    }

    if (!name.trim() || !text.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      if (isSupabaseEnabled && supabase) {
        const { error } = await supabase.from("reviews").insert({
          name: name.trim(),
          rating,
          text: text.trim(),
          project_type: "UI Design",
          date: new Date().toISOString().split("T")[0].slice(0, 7),
          verified: false,
          created_at: new Date().toISOString(),
        });

        if (error) throw error;
      }

      toast({
        title: "Review Submitted!",
        description:
          "Thank you for your feedback. It will be reviewed and published soon.",
      });

      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative max-w-lg w-full bg-card/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.button
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 180 }}
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          onClick={onClose}
        >
          <X className="w-5 h-5 text-white" />
        </motion.button>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold font-display mb-2">
            Write a Review
          </h2>
          <p className="text-muted-foreground text-sm">
            Share your experience working with Youssef Design
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Your Rating</Label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]"
                        : "fill-muted text-muted"
                    }`}
                  />
                </motion.button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Your Name / Username
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name or username"
              className="bg-background/50 border-white/10"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="review" className="text-sm font-medium">
              Your Review
            </Label>
            <Textarea
              id="review"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share your experience working with Youssef Design..."
              className="min-h-[120px] bg-background/50 border-white/10"
              required
            />
          </div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Submit Review
                </>
              )}
            </Button>
          </motion.div>
        </form>
      </motion.div>
    </motion.div>
  );
}
