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
      <header className="fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl z-50 rounded-3xl bg-[#FAF7F2]/60 backdrop-blur-md border border-white/40 shadow-sm">
        <div className="flex justify-between items-center px-4 py-3">
          <img src="/logo.svg" alt="coree" className="h-6 md:h-6" />
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
          <div className="max-w-3xl mb-12 sm:mb-12">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6" style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
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
              <span className="ml-2 text-sm opacity-90">- it's free</span>
            </button>
            <p className="mt-4 text-sm text-gray-500 font-medium">
              loved by 10+ people like you
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

          {/* Feature highlights */}
          <section
            aria-labelledby="features-heading"
            className="mt-20 sm:mt-28"
          >
            <div className="max-w-3xl mb-10 sm:mb-12">
              <h2
                id="features-heading"
                className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-3"
              >
                everything you need to feel heard.
              </h2>
              <p className="text-base sm:text-lg text-gray-600 font-medium">
                small features, big calm. built for short check-ins or the long days.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {[
                {
                  title: "text mode",
                  desc: "type it out at your pace. coree replies in short, warm sentences — no walls of advice.",
                },
                {
                  title: "voice mode",
                  desc: "talk like you would with a friend. natural voice in, natural voice back.",
                },
                {
                  title: "remembers you",
                  desc: "picks up where you left off — your moods, themes, and what's been weighing on you.",
                },
                {
                  title: "weekly insights",
                  desc: "a gentle mood radar from your chats and journal — patterns, not judgments.",
                },
                {
                  title: "private journal",
                  desc: "drop a quick note or voice memo. yours alone, encrypted and yours to delete anytime.",
                },
                {
                  title: "private by design",
                  desc: "end-to-end encrypted. no ads, no sharing, no diagnosing. just a safe space.",
                },
              ].map(({ title, desc }, i) => (
                <motion.article
                  key={title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.4, delay: i * 0.05, ease: [0.4, 0, 0.2, 1] }}
                  className="bg-white border border-gray-200/70 rounded-2xl p-5 sm:p-6 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <h3 className="text-base font-semibold text-gray-900 mb-1.5">
                    {title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
                </motion.article>
              ))}
            </div>
          </section>
        </motion.div>
      </main>

      {/* SEO: structured data for features */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "coree",
            applicationCategory: "HealthApplication",
            description:
              "coree is your friendly AI companion for short, supportive voice or text conversations.",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            featureList: [
              "Text mode chat",
              "Voice mode conversations",
              "Long-term memory",
              "Weekly mood insights",
              "Private journal",
              "End-to-end encrypted",
            ],
          }),
        }}
      />
    </div>
  );
}
