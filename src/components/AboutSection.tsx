import { motion } from "framer-motion";

export function AboutSection() {
  return (
    <section className="w-full max-w-5xl mx-auto px-6 py-24 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
          Behind the Pixels
        </h2>
        <motion.div
          className="w-20 h-1.5 bg-primary rounded-full mx-auto"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 md:p-12"
      >
        <p className="text-lg text-muted-foreground leading-relaxed text-center max-w-3xl mx-auto">
          Hello! :wave: Are you in need of a professional UI/UX designer for
          Roblox to get your game the visibility it needs? :rocket: I'm Youssef,
          a 20 year old full time UI/UX designer with 2 years designing unique,
          cartoony & interactive UIs for Roblox games :video_game:. :sparkles:
          What I'm Offering: Professional & creative UI design UX optimized
          :dart: Directly port all the designed assets inside Roblox Studio
          :joystick: Scaled & optimized for all devices :mobile_phone::computer:
          Fast turnaround time with smooth communication :speech_balloon: Good
          rates with a quality guarantee :money_with_wings: :handshake: Why me?
          Up to 5 free revisions until you are 100% satisfied
          :arrows_counterclockwise: I always keep you informed every step of the
          way when I am designing :open_file_folder: As a full time designer,
          you will have frequent communication and instant updates :alarm_clock:
          MONEY back guarantee if not satisfied :white_check_mark: Here are some
          portfolio samples: 👉 Check My Portfolio :bookmark_tabs: :moneybag:
          Rates: UI Design $15 / frame (or 4k Robux / frame which includes
          roblox tax) :art: UI Import $5 / frame (porting all devices) 📞
          :credit_card: Payment Methods: PayPal or Robux (always remember there
          is tax that applies to robux, the robux price reflects that). 🔒 You
          will receive final designed files as clean PNGs or directly ported to
          your project. 📦 100% Full refund if required. 💯 ⚠️ Important: Before
          ordering, please make sure to check my website for portfolio, pricing
          details, and to see what each package includes: 👉 Portfolio & Pricing
          Page 👉 Let’s get your Roblox project visualized! Contact me today and
          let's get you up and going! 🚀
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          {[
            "UI/UX Design",
            "Roblox Studio",
            "Game Interfaces",
            "Brand Identity",
          ].map((skill, i) => (
            <motion.span
              key={skill}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20"
            >
              {skill}
            </motion.span>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
