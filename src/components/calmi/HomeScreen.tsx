import { motion } from "framer-motion";
import { MessageSquare, Mic, LogOut } from "lucide-react";

interface HomeScreenProps {
  onStartConversation: () => void;
  onSignOut: () => void;
}

export function HomeScreen({ onStartConversation, onSignOut }: HomeScreenProps) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-sm text-center"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"
        >
          <div className="h-8 w-8 rounded-full bg-primary shadow-[0_0_30px_rgba(34,197,94,0.2)]" />
        </motion.div>

        {/* Greeting */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-2xl font-medium tracking-tight text-foreground"
        >
          {greeting}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-2 text-base leading-relaxed text-muted-foreground"
        >
          Take a moment whenever you're ready.
        </motion.p>

        {/* Start button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          onClick={onStartConversation}
          className="mt-10 inline-flex items-center gap-3 rounded-2xl bg-surface px-8 py-4 shadow-soft transition-all duration-200 hover:shadow-active active:scale-[0.98]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-base font-medium text-foreground">Start a conversation</p>
            <p className="text-xs text-muted-foreground">Text or voice — your choice</p>
          </div>
        </motion.button>

        {/* Sign out */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          onClick={onSignOut}
          className="mt-8 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="h-3 w-3" />
          Sign out
        </motion.button>
      </motion.div>
    </div>
  );
}
