import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export function PerformanceOptimizer() {
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLowPerformance, setIsLowPerformance] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // التحقق من أداء الجهاز
    const checkPerformance = () => {
      const memory = (navigator as any).deviceMemory || 4;
      const hardwareConcurrency = navigator.hardwareConcurrency || 4;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // تحديد إذا كان الجهاز ضعيف الأداء
      const lowPerf = (memory < 4 || hardwareConcurrency < 4 || isMobile);
      setIsLowPerformance(lowPerf);
      
      if (lowPerf) {
        // التحقق مما إذا كان المستخدم قد عطل هذه الميزة من قبل
        const disabled = localStorage.getItem("performance_optimizer_disabled");
        if (disabled !== "true") {
          setShowOptimizer(true);
        }
      }
    };

    // تأخير الفحص قليلاً
    const timer = setTimeout(checkPerformance, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleEnable = () => {
    setIsEnabled(true);
    setShowOptimizer(false);
    
    // تطبيق التحسينات
    document.documentElement.classList.add("performance-mode");
    
    // حفظ التفضيل
    localStorage.setItem("performance_optimizer_enabled", "true");
    
    toast({
      title: "Performance Mode Enabled",
      description: "Animations and effects reduced for better performance",
    });
  };

  const handleDisable = () => {
    setShowOptimizer(false);
    localStorage.setItem("performance_optimizer_disabled", "true");
    
    toast({
      title: "Performance Mode Disabled",
      description: "You can enable it again from settings",
    });
  };

  const toggleFromSettings = (checked: boolean) => {
    setIsEnabled(checked);
    if (checked) {
      document.documentElement.classList.add("performance-mode");
      localStorage.removeItem("performance_optimizer_disabled");
      localStorage.setItem("performance_optimizer_enabled", "true");
    } else {
      document.documentElement.classList.remove("performance-mode");
      localStorage.removeItem("performance_optimizer_enabled");
    }
  };

  if (!showOptimizer) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl shadow-2xl shadow-red-900/50 p-6 relative overflow-hidden"
        >
          {/* Animated Background */}
          <motion.div
            className="absolute inset-0 bg-white/10"
            animate={{
              x: ["0%", "100%", "0%"],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
          />
          
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="p-2 bg-white/20 rounded-lg"
                >
                  <Zap className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <h3 className="text-white font-bold text-lg">
                    Performance Mode
                  </h3>
                  <p className="text-red-100 text-sm">
                    Optimize for better performance
                  </p>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleDisable}
                className="text-white/80 hover:text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <p className="text-white/90 text-sm mb-4">
              We detected that your device might benefit from performance optimization. 
              This will reduce animations and effects for smoother experience.
            </p>
            
            <div className="flex gap-3">
              <Button
                onClick={handleEnable}
                className="flex-1 bg-white text-red-600 hover:bg-red-50 font-semibold"
              >
                Enable Now
              </Button>
              <Button
                onClick={handleDisable}
                variant="outline"
                className="flex-1 border-white/30 text-white hover:bg-white/10"
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Component for settings page
export function PerformanceSettings({ 
  isEnabled, 
  onToggle 
}: { 
  isEnabled: boolean; 
  onToggle: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-500/20 rounded-lg">
          <Zap className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h4 className="text-white font-medium">Performance Mode</h4>
          <p className="text-slate-400 text-sm">Reduce animations for better performance</p>
        </div>
      </div>
      <Switch
        checked={isEnabled}
        onCheckedChange={onToggle}
        className="data-[state=checked]:bg-red-600"
      />
    </div>
  );
}