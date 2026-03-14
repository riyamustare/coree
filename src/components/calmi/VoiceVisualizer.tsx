import { motion } from "framer-motion";

interface VoiceVisualizerProps {
  isActive: boolean;
  isSpeaking?: boolean;
}

export function VoiceVisualizer({ isActive, isSpeaking }: VoiceVisualizerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-16">
      <motion.div
        animate={{
          scale: isActive ? [1, 1.04, 1] : 1,
        }}
        transition={{
          repeat: isActive ? Infinity : 0,
          duration: isSpeaking ? 1.5 : 2.5,
          ease: [0.4, 0, 0.2, 1],
        }}
        className="relative flex h-32 w-32 items-center justify-center"
      >
        {/* Outer glow */}
        <motion.div
          animate={{
            opacity: isActive ? [0.15, 0.3, 0.15] : 0.1,
            scale: isActive ? [1, 1.1, 1] : 1,
          }}
          transition={{
            repeat: isActive ? Infinity : 0,
            duration: 3,
            ease: [0.4, 0, 0.2, 1],
          }}
          className="absolute h-full w-full rounded-full bg-primary/10"
        />
        {/* Inner orb */}
        <div className="h-16 w-16 rounded-full bg-primary shadow-[0_0_40px_rgba(34,197,94,0.3)]" />
      </motion.div>

      <p className="text-sm text-muted-foreground tracking-wide">
        {isSpeaking ? "Calmi is speaking..." : isActive ? "Listening..." : "Tap to start"}
      </p>
    </div>
  );
}
