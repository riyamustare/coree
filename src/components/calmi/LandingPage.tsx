import { motion } from "framer-motion";

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

// Visual design ported from the user's Hero.jsx reference:
// warm cream background (#FAF7F2), bold gray-900 headline, blue CTA (#277BD9).
export function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Floating header */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl z-50 rounded-3xl">
        <div className="flex justify-between items-center px-4 py-3">
          <div className="text-xl md:text-2xl font-bold text-black">coree</div>
          <button
            onClick={onLogin}
            className="bg-[#277BD9] text-[#FAF7F2] w-[130px] h-[40px] rounded-full font-medium hover:bg-[#2e90ff] transition"
          >
            get started
          </button>
        </div>
      </header>

      <main className="pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="max-w-5xl mx-auto"
        >
          <div className="max-w-3xl mb-12 sm:mb-16">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              your space to process it all.
              <br />
              <span className="font-black">that's coree.</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 font-medium mb-8 leading-relaxed">
              life feels heavy sometimes. coree is your space to talk, process,
              and understand what's going on inside without any BS.
            </p>
            <button
              onClick={onGetStarted}
              className="inline-flex items-center px-8 py-3.5 bg-[#277BD9] text-white font-semibold rounded-xl hover:bg-[#2e90ff] transition-all shadow-md hover:shadow-lg"
            >
              <span>start talking it out</span>
              <span className="ml-2 text-sm opacity-90">— it's free</span>
            </button>
            <p className="mt-4 text-sm text-gray-500 font-medium">
              loved by 10,000+ people like you
            </p>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 sm:mt-16">
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 opacity-40">
              <div className="text-xs sm:text-sm font-semibold text-gray-600 tracking-wider">
                ENCRYPTED
              </div>
              <div className="text-xs sm:text-sm font-semibold text-gray-600 tracking-wider">
                PRIVATE
              </div>
              <div className="text-xs sm:text-sm font-semibold text-gray-600 tracking-wider">
                AI-POWERED
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
