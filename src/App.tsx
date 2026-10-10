import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LoadingAnimation from "@/components/LoadingAnimation";
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PromisePage = lazy(() => import("./pages/PromisePage"));
const SeoLandingPage = lazy(() => import("./pages/SeoLandingPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      gcTime: 1000 * 60 * 5,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<LoadingAnimation />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/home" element={<Index />} />
            <Route path="/chat" element={<Index />} />
            <Route path="/insights" element={<Index />} />
            <Route path="/history" element={<Index />} />
            <Route path="/journal" element={<Index />} />
            <Route path="/settings" element={<Index />} />
            <Route path="/onboarding" element={<Index />} />
            <Route path="/auth" element={<Index />} />
            <Route path="/ai-friend" element={<SeoLandingPage variant="ai-friend" />} />
            <Route path="/ai-therapist" element={<SeoLandingPage variant="ai-therapist" />} />
            <Route path="/ai-therapy" element={<SeoLandingPage variant="ai-therapy" />} />
            <Route path="/someone-to-talk-to" element={<SeoLandingPage variant="someone-to-talk-to" />} />
            <Route path="/vent-online" element={<SeoLandingPage variant="vent-online" />} />
            <Route path="/feeling-lonely" element={<SeoLandingPage variant="feeling-lonely" />} />
            <Route path="/ai-companion" element={<SeoLandingPage variant="ai-companion" />} />
            <Route path="/therapy-chat" element={<SeoLandingPage variant="therapy-chat" />} />
            <Route path="/mental-health-chat" element={<SeoLandingPage variant="mental-health-chat" />} />
            <Route path="/anxiety-help" element={<SeoLandingPage variant="anxiety-help" />} />
            <Route path="/late-night-chat" element={<SeoLandingPage variant="late-night-chat" />} />
            <Route path="/privacy" element={<PromisePage which="privacy" />} />
            <Route path="/encryption" element={<PromisePage which="encryption" />} />
            <Route path="/no-diagnoses" element={<PromisePage which="no-diagnoses" />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Analytics />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
