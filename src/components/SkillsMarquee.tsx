import { motion } from "framer-motion";
const toolsData = [
  { id: 1, name: "Figma", icon: "🎨" },
  { id: 2, name: "Photoshop", icon: "🖼️" },
  { id: 3, name: "Illustrator", icon: "🎭" },
  { id: 4, name: "Premiere Pro", icon: "🎬" },
  { id: 5, name: "After Effects", icon: "✨" },
  { id: 6, name: "Roblox Studio", icon: "🎮" },
  { id: 7, name: "Blender", icon: "🔷" },
  { id: 8, name: "Unity", icon: "🎯" },
];

export function SkillsMarquee() {
  const duplicatedTools = [...toolsData, ...toolsData, ...toolsData];

  return (
    <section className="w-full py-12 overflow-hidden border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6 mb-8">
        <h3 className="text-2xl md:text-3xl font-display font-bold text-center">
          Tools & Technologies I Work With
        </h3>
      </div>

      {/* Marquee Container with Fade Mask */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
        }}
      >
        <motion.div
          className="flex gap-8"
          initial={{ x: 0 }}
          animate={{ x: "-33.33%" }}
          transition={{
            duration: 30,
            ease: "linear",
            repeat: Infinity,
          }}
        >
          {duplicatedTools.map((tool, index) => (
            <motion.div
              key={`${tool.name}-${index}`}
              className="flex-shrink-0 bg-card/60 backdrop-blur-sm border border-white/10 rounded-full px-6 py-3 flex items-center gap-3 hover:border-primary/30 hover:bg-card/80 transition-all cursor-default"
              whileHover={{ scale: 1.05 }}
            >
              <span className="text-2xl">{tool.icon}</span>
              <span className="text-sm font-medium text-foreground">
                {tool.name}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
