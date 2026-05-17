import { motion } from "framer-motion";

interface VoiceVisualizerProps {
  isActive: boolean;
  isSpeaking?: boolean;
  transcription?: string;
}

export function VoiceVisualizer({ isActive, isSpeaking, transcription }: VoiceVisualizerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12">
      


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
