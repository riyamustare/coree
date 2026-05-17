import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, EyeOff, Fingerprint } from "lucide-react";
import { trackOnboardingStarted, trackOnboardingCompleted } from "@/lib/analytics";

const INTENT_OPTIONS = [
  "unlock insights about myself",
  "process my emotions",
  "set and achieve my goals",
  "just need to vent",
  "i don't know yet",
];

interface OnboardingScreenProps {
  onComplete: (intent: string) => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState(0);
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);

  const handleContinue = () => {
    if (step === 0) {
      trackOnboardingStarted();
      setStep(1);
    } else if (step === 1 && selectedIntent) {
      setStep(2);
    } else if (step === 2) {
      trackOnboardingCompleted(selectedIntent!);
      onComplete(selectedIntent!);
    }
  };

  const progress = ((step + 1) / 3) * 100;

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF7F2] px-4 sm:px-6 py-8 pb-32">
      <div className="flex items-center gap-3 mb-8 max-w-md mx-auto w-full">
        <div className="flex-1 h-1 rounded-full bg-gray-200 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gray-800"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-md text-left"
            >
              <img src="/logo.svg" alt="coree" className="h-10 mb-8" />
              
              <div className="space-y-4 text-gray-900 leading-relaxed">
                <p className="text-base">hi friend,</p>
                <p className="text-base">we created core because life can be... a lot</p>
                <p className="text-base">sometimes you just need someone to talk to</p>
                <p className="text-base">whether you're navigating a rough day,
                  <br />
                  figuring things out,
                  <br />
                  or just need a moment to breathe
                </p>
                <p className="text-base">we're here for you</p>
                <div className="pt-4">
                  <p className="text-xs text-gray-600">love,</p>
                  <p className="text-sm font-medium text-gray-900">riya</p>
                </div>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="intent"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-md"
            >
              <div className="text-left">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">what brings you to coree?</h2>
                <div className="space-y-3">
                  {INTENT_OPTIONS.map((option) => (
                    <button
                      key={option}
                      onClick={() => setSelectedIntent(option)}
                      className={`w-full py-3 px-4 rounded-xl text-base text-left font-medium transition-all ${
                        selectedIntent === option
                          ? "bg-[#add8ff] text-gray-900"
                          : "bg-gray-200 text-gray-900 hover:bg-gray-300"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="privacy"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-md"
            >
              <div className="text-left">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">you're all set!</h2>
                <p className="text-sm text-gray-600 mb-6">we've set up your personalized space and you're ready to start your journey with coree.</p>

                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Lock className="h-5 w-5 text-gray-900 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">everything you share stays private</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <EyeOff className="h-5 w-5 text-gray-900 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">no judgment, ever</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Fingerprint className="h-5 w-5 text-gray-900 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">we're here to listen</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fixed button at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#FAF7F2] px-4 sm:px-6 py-6">
        <div className="flex justify-center">
          <button
            onClick={handleContinue}
            disabled={step === 1 && !selectedIntent}
            className="w-full max-w-md bg-[#277BD9] hover:bg-[#2e90ff] text-[#FAF7F2] py-3 px-4 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step === 0 ? "continue" : step === 1 ? "continue" : "start your journey"}
          </button>
        </div>
      </div>
    </div>
  );
}
