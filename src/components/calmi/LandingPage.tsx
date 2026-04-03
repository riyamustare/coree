import { motion } from "framer-motion";
import { Shield, Heart, MessageSquare, Mic, ArrowRight } from "lucide-react";

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-primary shadow-[0_0_20px_rgba(34,197,94,0.2)]" />
          <span className="text-lg font-medium tracking-tight text-foreground">Core</span>
        </div>
        <button
          onClick={onLogin}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign in
        </button>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          className="max-w-lg text-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10"
          >
            <div className="h-10 w-10 rounded-full bg-primary shadow-[0_0_40px_rgba(34,197,94,0.3)] animate-breathe" />
          </motion.div>

          <h1 className="text-4xl sm:text-5xl font-medium tracking-tight text-foreground leading-tight">
            A quiet space for<br />
            <span className="text-primary">how you feel</span>
          </h1>

          <p className="mt-4 text-lg text-muted-foreground leading-relaxed max-w-md mx-auto">
            Talk through your thoughts with an AI companion that listens without judgment. 
            Text or voice — whenever you need it.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <button
              onClick={onGetStarted}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-base font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] shadow-[0_0_30px_rgba(34,197,94,0.15)]"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={onLogin}
              className="inline-flex items-center gap-2 rounded-2xl bg-surface px-8 py-4 text-base font-medium text-foreground shadow-soft transition-all hover:shadow-active active:scale-[0.98]"
            >
              I have an account
            </button>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full"
        >
          {[
            { icon: Heart, title: "Empathetic listening", desc: "Responds with genuine care and understanding" },
            { icon: MessageSquare, title: "Text or voice", desc: "Type or speak — whatever feels right" },
            { icon: Shield, title: "Private & safe", desc: "Your conversations stay between you and Core" },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.7 + i * 0.1 }}
              className="rounded-2xl bg-surface p-5 shadow-soft text-center"
            >
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">{feature.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
