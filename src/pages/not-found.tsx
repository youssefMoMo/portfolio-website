import { Link } from "wouter";
import { motion } from "framer-motion";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <p className="text-8xl font-bold font-display bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent mb-4">
          404
        </p>
        <h1 className="text-2xl font-bold mb-2">{t("notFound.message")}</h1>
        <p className="text-muted-foreground mb-8">
          {t("notFound.description")}
        </p>
        <Link href="/">
          <Button className="gap-2 rounded-full px-8">
            <ArrowLeft className="w-4 h-4" />
            {t("notFound.goHome")}
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
