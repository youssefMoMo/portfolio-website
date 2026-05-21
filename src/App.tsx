import { Suspense, lazy, useEffect, useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/hooks/use-theme";
import { LanguageProvider } from "@/hooks/use-language";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useUserTracker, subscribeToBanStatus } from "@/hooks/useUserTracker";
import { BannedScreen } from "@/components/BannedScreen";

const Home           = lazy(() => import("@/pages/Home"));
const Portfolio      = lazy(() => import("@/pages/Portfolio"));
const Games          = lazy(() => import("@/pages/Games"));
const Pricing        = lazy(() => import("@/pages/Pricing"));
const Reviews        = lazy(() => import("@/pages/Reviews"));
const Policies       = lazy(() => import("@/pages/Policies"));
const Admin          = lazy(() => import("@/pages/Admin"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminCallback  = lazy(() => import("@/pages/admin/callback"));
const NotFound       = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const PAGE_TRANSITION = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: 4 },
  transition: { duration: 0.18, ease: "easeOut" },
};

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      {...PAGE_TRANSITION}
      style={{ willChange: "opacity, transform" }}
    >
      <ErrorBoundary>{children}</ErrorBoundary>
    </motion.div>
  );
}

const PageLoader = (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
  </div>
);

function AppRoutes() {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Switch key={location} location={location}>
        <Route path="/">
          <PageWrapper><Suspense fallback={PageLoader}><Home /></Suspense></PageWrapper>
        </Route>
        <Route path="/portfolio">
          <PageWrapper><Suspense fallback={PageLoader}><Portfolio /></Suspense></PageWrapper>
        </Route>
        <Route path="/games">
          <PageWrapper><Suspense fallback={PageLoader}><Games /></Suspense></PageWrapper>
        </Route>
        <Route path="/pricing">
          <PageWrapper><Suspense fallback={PageLoader}><Pricing /></Suspense></PageWrapper>
        </Route>
        <Route path="/reviews">
          <PageWrapper><Suspense fallback={PageLoader}><Reviews /></Suspense></PageWrapper>
        </Route>
        <Route path="/policies">
          <PageWrapper><Suspense fallback={PageLoader}><Policies /></Suspense></PageWrapper>
        </Route>
        <Route path="/admin">
          <PageWrapper><Suspense fallback={PageLoader}><Admin /></Suspense></PageWrapper>
        </Route>
        <Route path="/admin/callback">
          <PageWrapper><Suspense fallback={PageLoader}><AdminCallback /></Suspense></PageWrapper>
        </Route>
        <Route path="/admin/dashboard">
          <PageWrapper>
            <Suspense fallback={PageLoader}>
              <ProtectedRoute><AdminDashboard /></ProtectedRoute>
            </Suspense>
          </PageWrapper>
        </Route>
        <Route>
          <PageWrapper><Suspense fallback={PageLoader}><NotFound /></Suspense></PageWrapper>
        </Route>
      </Switch>
    </AnimatePresence>
  );
}

function AppContent() {
  const { sessionToken } = useUserTracker();
  const [isBanned, setIsBanned] = useState(false);

  // Subscribe to realtime ban-status changes from the admin panel
  useEffect(() => {
    if (!sessionToken) return;
    const unsub = subscribeToBanStatus(sessionToken, () => setIsBanned(true));
    return unsub;
  }, [sessionToken]);

  if (isBanned) return <BannedScreen sessionToken={sessionToken} />;

  return (
    <Layout>
      <SEO />
      <AppRoutes />
    </Layout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <LanguageProvider defaultLanguage="en" storageKey="yd_language">
          <TooltipProvider delayDuration={0}>
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center bg-background">
                  <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                    <p className="text-muted-foreground text-sm">Loading...</p>
                  </div>
                </div>
              }
            >
              <AppContent />
            </Suspense>
            <Toaster />
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
