import { motion } from "framer-motion";

interface VoiceVisualizerProps {
  isActive: boolean;
  isSpeaking?: boolean;
  transcription?: string;
}

export function VoiceVisualizer({ isActive, isSpeaking, transcription }: VoiceVisualizerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12">
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
        <div className="h-16 w-16 rounded-full bg-primary shadow-[0_0_40px_rgba(34,197,94,0.3)]" />
      </motion.div>

      <p className="text-sm text-muted-foreground tracking-wide">
        {isSpeaking ? "Core is speaking..." : isActive ? "Listening..." : "Tap to start"}
      </p>

      {transcription && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm px-5 py-3 rounded-2xl bg-surface shadow-soft text-center"
        >
          <p className="text-sm text-foreground italic">"{transcription}"</p>
        </motion.div>
      )}
    </div>
  );
}
