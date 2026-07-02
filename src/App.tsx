import { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LoadingAnimation from "@/components/LoadingAnimation";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import PromisePage from "./pages/PromisePage.tsx";

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
