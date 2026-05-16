import { motion } from "framer-motion";

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="mx-auto w-full max-w-sm text-center space-y-8"
      >
        <div className="space-y-3">
          <h1 className="text-5xl font-light tracking-tight text-foreground">
            Coree
          </h1>
          <p className="text-lg text-muted-foreground">
            Your AI therapy companion
          </p>
        </div>

        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>When life feels like a lot,</p>
          <p>sometimes you just need someone to talk to.</p>
          <p>
            Whether you're navigating a rough day,
            <br />
            figuring things out, or just need a moment to breathe,
          </p>
          <p>we're here for you.</p>
        </div>

        <div className="space-y-3 pt-4">
          <button
            onClick={onGetStarted}
            className="w-full rounded-2xl bg-primary px-8 py-4 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            Get Started
          </button>
          <button
            onClick={onLogin}
            className="w-full rounded-2xl bg-secondary px-8 py-4 text-sm font-medium text-secondary-foreground transition-all hover:bg-muted active:scale-[0.98]"
          >
            Sign In
          </button>
        </div>
      </motion.div>
    </div>
  );
}
