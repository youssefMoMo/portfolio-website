import { motion, AnimatePresence } from "framer-motion";
import { X, Palette, Wrench, Target, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

type CaseStudyData = {
  id: number;
  title: string;
  category: string;
  challenge: string;
  solution: string;
  colors: string[];
  tools: string[];
};

type CaseStudyModalProps = {
  project: CaseStudyData | null;
  onClose: () => void;
};

export function CaseStudyModal({ project, onClose }: CaseStudyModalProps) {
  if (!project) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 50 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <motion.button
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-50"
            onClick={onClose}
          >
            <X className="w-6 h-6 text-white" />
          </motion.button>

          {/* Header */}
          <div className="p-8 md:p-12 border-b border-white/10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <span className="text-primary text-sm font-medium mb-2 block">
                {project.category}
              </span>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                {project.title}
              </h2>
            </motion.div>
          </div>

          {/* Content */}
          <div className="p-8 md:p-12 space-y-10">
            {/* Challenge */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <Target className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-xl font-bold font-display">
                  The Challenge
                </h3>
              </div>
              <p className="text-muted-foreground leading-relaxed pl-12">
                {project.challenge}
              </p>
            </motion.div>

            {/* Solution */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Lightbulb className="w-6 h-6 text-green-500" />
                </div>
                <h3 className="text-xl font-bold font-display">The Solution</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed pl-12">
                {project.solution}
              </p>
            </motion.div>

            {/* Color Palette */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Palette className="w-6 h-6 text-purple-500" />
                </div>
                <h3 className="text-xl font-bold font-display">
                  Color Palette
                </h3>
              </div>
              <div className="flex gap-4 pl-12">
                {project.colors.map((color, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6 + i * 0.1, type: "spring" }}
                    whileHover={{ scale: 1.2, rotate: 15 }}
                    className="w-16 h-16 rounded-full border-2 border-white/20 shadow-lg"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </motion.div>

            {/* Tools */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Wrench className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold font-display">Tools Used</h3>
              </div>
              <div className="flex flex-wrap gap-3 pl-12">
                {project.tools.map((tool, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 + i * 0.05 }}
                    whileHover={{ scale: 1.05 }}
                    className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20"
                  >
                    {tool}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Footer */}
          <div className="p-8 md:p-12 border-t border-white/10">
            <Button
              onClick={onClose}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold"
            >
              Close Project
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
