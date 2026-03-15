import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Lock, EyeOff, Fingerprint } from "lucide-react";

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
      setStep(1);
    } else if (step === 1 && selectedIntent) {
      setStep(2);
    } else if (step === 2) {
      onComplete(selectedIntent!);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const progress = ((step + 1) / 3) * 100;

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-8">
      {/* Header with back + progress */}
      <div className="flex items-center gap-3 mb-10">
        {step > 0 ? (
          <button onClick={handleBack} className="text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <div className="w-5" />
        )}
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-foreground"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.35 }}
            className="flex flex-1 flex-col justify-between"
          >
            <div className="space-y-6">
              {/* Yellow dot */}
              <div className="h-10 w-10 rounded-full bg-accent" />

              <div className="space-y-5 text-lg leading-relaxed text-foreground">
                <p className="font-medium">hi friend</p>
                <p>we created calmi because life can be... a lot</p>
                <p>sometimes you just need someone to talk to</p>
                <p>
                  whether you're navigating a rough day,
                  <br />
                  figuring things out,
                  <br />
                  or just need a moment to breathe
                </p>
                <p className="font-semibold">we're here for you</p>
                <div className="pt-2">
                  <p className="text-muted-foreground">love,</p>
                  <p className="text-xl font-semibold">dennis &amp; vlady</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleContinue}
              className="mt-10 w-full max-w-xs mx-auto rounded-2xl bg-foreground px-8 py-4 text-base font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]"
            >
              start
            </button>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="intent"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.35 }}
            className="flex flex-1 flex-col justify-between"
          >
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-8">
                what brings you to calmi?
              </h1>
              <div className="space-y-3">
                {INTENT_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => setSelectedIntent(option)}
                    className={`w-full rounded-2xl border px-5 py-4 text-left text-base transition-all ${
                      selectedIntent === option
                        ? "border-foreground bg-foreground/5 font-medium"
                        : "border-border bg-surface hover:border-foreground/30"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleContinue}
              disabled={!selectedIntent}
              className="mt-10 w-full rounded-2xl bg-foreground px-8 py-4 text-base font-medium text-background transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            >
              continue
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="privacy"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.35 }}
            className="flex flex-1 flex-col justify-between"
          >
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                our commitment to you
              </h1>
              <p className="mt-2 text-muted-foreground">
                your mental health is personal and private
              </p>

              <div className="mt-10 space-y-8">
                <div className="flex gap-4">
                  <Lock className="h-6 w-6 text-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">locked tight</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      everything you say is encrypted. standard stuff.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <EyeOff className="h-6 w-6 text-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">no peeking</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      your convos aren't used to train or improve calmi.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Fingerprint className="h-6 w-6 text-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">pinky promise</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      we mean it. your trust &gt; our metrics. and a pinky promise? that's sacred.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleContinue}
              className="mt-10 w-full rounded-2xl bg-foreground px-8 py-4 text-base font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]"
            >
              continue
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
