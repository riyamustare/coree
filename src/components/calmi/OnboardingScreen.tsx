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
  displayName?: string | null;
}

export function OnboardingScreen({ onComplete, displayName }: OnboardingScreenProps) {
  const [step, setStep] = useState(0);
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);

  const firstName = (displayName || "").trim().split(/\s+/)[0]?.toLowerCase() || "friend";

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
    <div className="flex min-h-screen flex-col bg-background text-foreground px-4 sm:px-6 py-8 pb-32">
      <div className="flex items-center gap-3 mb-8 max-w-md mx-auto w-full">
        <div className="flex-1 h-2 rounded-full bg-muted border-2 border-border-color overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
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
              className="w-full max-w-md text-left card-duo p-6 sm:p-8"
            >
              <img src="/logo.svg" alt="coree" className="h-8 mb-6" />

              <div className="space-y-4 text-foreground leading-relaxed lowercase">
                <p className="text-base font-medium">hi {firstName},</p>
                <p className="text-base font-medium">we created coree because life can be... a lot</p>
                <p className="text-base font-medium">sometimes you just need someone to talk to</p>
                <p className="text-base font-medium">whether you're navigating a rough day,
                  <br />
                  figuring things out,
                  <br />
                  or just need a moment to breathe
                </p>
                <p className="text-base font-medium">we're here for you</p>
                <div className="pt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">love,</p>
                  <p className="text-sm font-black text-foreground lowercase">riya</p>
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
                <h2 className="text-2xl font-black text-foreground mb-6 lowercase">what brings you to coree?</h2>
                <div className="space-y-3">
                  {INTENT_OPTIONS.map((option) => (
                    <button
                      key={option}
                      onClick={() => setSelectedIntent(option)}
                      className={
                        selectedIntent === option
                          ? "w-full py-3.5 px-4 text-base text-left font-bold lowercase rounded-2xl border-2 border-primary bg-primary text-primary-foreground transition"
                          : "w-full py-3.5 px-4 text-base text-left font-bold lowercase rounded-2xl border-2 border-border-color bg-card text-foreground hover:border-primary/60 transition"
                      }
                      style={
                        selectedIntent === option
                          ? { boxShadow: "0 4px 0 0 hsl(211 71% 38%)" }
                          : { boxShadow: "0 4px 0 0 hsl(var(--border))" }
                      }
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
              className="w-full max-w-md card-duo p-6 sm:p-8"
            >
              <div className="text-left">
                <h2 className="text-2xl font-black text-foreground mb-2 lowercase">you're all set!</h2>
                <p className="text-sm text-muted-foreground mb-6 font-medium lowercase">we've set up your personalized space and you're ready to start your journey with coree.</p>

                <div className="space-y-3">
                  {[
                    { Icon: Lock, label: "everything you share stays private" },
                    { Icon: EyeOff, label: "no judgment, ever" },
                    { Icon: Fingerprint, label: "we're here to listen" },
                  ].map(({ Icon, label }) => (
                    <div key={label} className="flex items-center gap-3 rounded-2xl border-2 border-border-color bg-card px-3 py-3">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-primary" strokeWidth={2.5} />
                      </div>
                      <p className="text-sm font-bold text-foreground lowercase">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fixed button at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md px-4 sm:px-6 py-6 border-t-2 border-border-color">
        <div className="flex justify-center">
          <button
            onClick={handleContinue}
            disabled={step === 1 && !selectedIntent}
            className="btn-duo w-full max-w-md text-sm py-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step === 0 ? "continue" : step === 1 ? "continue" : "start your journey"}
          </button>
        </div>
      </div>
    </div>
  );
}
