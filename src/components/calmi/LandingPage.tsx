import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MessageCircle, Mic, Brain, LineChart, BookHeart, ShieldCheck, Heart, Lock, Sparkles } from "lucide-react";

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

// Visual design ported from the user's Hero.jsx reference:
// warm cream background (#FAF7F2), bold gray-900 headline, blue CTA (#277BD9).
export function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Floating header */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl z-50 rounded-3xl bg-background/60 backdrop-blur-md border border-border/60 shadow-sm">
        <div className="flex justify-between items-center px-4 py-3">
          <img src="/logo.svg" alt="coree" className="h-6 md:h-6" />
          <div className="flex items-center gap-2">
            <button onClick={onLogin} className="text-xs font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground px-3 py-2 transition">
              log in
            </button>
            <button onClick={onLogin} className="btn-duo h-10 px-5 text-xs rounded-full">
              get started
            </button>
          </div>
        </div>
      </header>

      <main className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* --- Creative hero background --- */}
        {/* Spiraling curved text on the left */}
        <div className="pointer-events-none absolute -left-24 sm:-left-16 top-24 sm:top-16 w-[380px] h-[380px] sm:w-[520px] sm:h-[520px] opacity-70">
          <svg viewBox="0 0 500 500" className="w-full h-full animate-[spin_60s_linear_infinite]">
            <defs>
              <path
                id="spiral-path"
                d="M 250,250 m -180,0 a 180,180 0 1,1 360,0 a 180,180 0 1,1 -360,0"
              />
            </defs>
            <text className="fill-muted-foreground" style={{ fontSize: 18, fontWeight: 700, letterSpacing: 2 }}>
              <textPath href="#spiral-path" startOffset="0">
                what's on your mind · unpack it one thought at a time · you don't have to hold it alone · 
              </textPath>
            </text>
          </svg>
        </div>

        {/* Floating soft blobs */}
        <div className="pointer-events-none absolute top-40 right-10 w-40 h-40 rounded-full bg-primary/10 blur-3xl animate-[breathe_6s_ease-in-out_infinite]" />
        <div className="pointer-events-none absolute bottom-40 left-1/3 w-52 h-52 rounded-full bg-primary/5 blur-3xl animate-[breathe_8s_ease-in-out_infinite]" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="relative max-w-5xl mx-auto"
        >
          <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-12 relative z-10">
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black text-foreground leading-tight mb-6 lowercase"
            >
              your space to process it all.
              <br />
              <span className="text-primary">that's coree.</span>
            </motion.h1>
            <p className="text-lg sm:text-xl text-muted-foreground font-medium mb-8 leading-relaxed lowercase max-w-2xl mx-auto">
              life feels heavy sometimes. coree is your space to talk, process,
              and understand what's going on inside - without any BS.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button onClick={onGetStarted} className="btn-duo text-sm px-8 py-4">
                <span>start talking it out</span>
                <span className="ml-2 opacity-90 normal-case">- it's free</span>
              </button>
              <button onClick={onLogin} className="btn-duo-secondary text-sm px-6 py-3 rounded-2xl">
                i already have an account
              </button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground font-medium lowercase">
              loved by 20+ people like you · no credit card, no judgment
            </p>

            {/* Floating pill: "listening" indicator */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-10 inline-flex items-center gap-3 rounded-full bg-primary text-primary-foreground px-5 py-2.5 shadow-lg"
              style={{ boxShadow: "0 6px 0 0 hsl(211 71% 38%)" }}
            >
              <span className="h-6 w-6 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Mic className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              <span className="text-sm font-bold lowercase">i'm listening</span>
              <span className="flex items-end gap-0.5 h-4">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="w-0.5 bg-primary-foreground rounded-full animate-[breathe_1.2s_ease-in-out_infinite]"
                    style={{ height: `${40 + ((i * 17) % 60)}%`, animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </span>
            </motion.div>
          </div>

          {/* Rotating banner strip - a tilted marquee like the reference */}
          <div className="relative my-14 sm:my-20 -mx-4 sm:-mx-6 lg:-mx-8">
            <div
              className="relative bg-foreground text-background overflow-hidden py-4 border-y-2 border-foreground"
              style={{ transform: "rotate(-3deg)" }}
            >
              <div className="flex whitespace-nowrap animate-[marquee_28s_linear_infinite] gap-10 text-lg sm:text-xl font-black uppercase tracking-wide">
                {Array.from({ length: 2 }).map((_, k) => (
                  <div key={k} className="flex items-center gap-10 shrink-0">
                    {[
                      "talk it out",
                      "one thought at a time",
                      "no judgment",
                      "just you and coree",
                      "voice or text",
                      "wise friend energy",
                      "private always",
                    ].map((phrase, i) => (
                      <span key={`${k}-${i}`} className="flex items-center gap-10">
                        <span>{phrase}</span>
                        <span className="text-primary">✦</span>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="mt-6 sm:mt-8 relative z-10">
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              {[
                { icon: Lock, label: "encrypted" },
                { icon: ShieldCheck, label: "private" },
                { icon: Heart, label: "human-first" },
                { icon: Sparkles, label: "ai-powered" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 rounded-full border-2 border-border-color bg-card px-3 py-1.5">
                  <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">{label}</span>
                </div>
              ))}
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
                className="text-3xl sm:text-4xl font-black text-foreground leading-tight mb-3 lowercase"
              >
                everything you need to feel heard.
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground font-medium lowercase">
                small features, big calm. built for short check-ins or the long days.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {[
                { icon: MessageCircle, title: "text mode", desc: "type it out at your pace. coree replies in short, warm sentences - no walls of advice." },
                { icon: Mic, title: "voice mode", desc: "talk like you would with a friend. natural voice in, natural voice back." },
                { icon: Brain, title: "remembers you", desc: "picks up where you left off - your moods, themes, and what's been weighing on you." },
                { icon: LineChart, title: "weekly insights", desc: "a gentle mood radar from your chats and journal - patterns, not judgments." },
                { icon: BookHeart, title: "private journal", desc: "drop a quick note or voice memo. yours alone, encrypted and yours to delete anytime." },
                { icon: ShieldCheck, title: "private by design", desc: "end-to-end encrypted. no ads, no sharing, no diagnosing. just a safe space." },
              ].map(({ icon: Icon, title, desc }, i) => (
                <motion.article
                  key={title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.4, delay: i * 0.05, ease: [0.4, 0, 0.2, 1] }}
                  className="card-duo p-5 sm:p-6"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-3">
                    <Icon className="h-5 w-5 text-primary" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1.5 lowercase">
                    {title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed lowercase">{desc}</p>
                </motion.article>
              ))}
            </div>
          </section>

          {/* How it works */}
          <section className="mt-20 sm:mt-28">
            <div className="max-w-3xl mb-10">
              <h2 className="text-3xl sm:text-4xl font-black text-foreground leading-tight mb-3 lowercase">
                how it works
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground font-medium lowercase">
                three tiny steps. no forms, no intake, no waiting rooms.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
              {[
                { n: "01", t: "say hi", d: "sign up in seconds. tell coree what brought you here." },
                { n: "02", t: "talk or type", d: "start a session whenever you need to think out loud." },
                { n: "03", t: "notice patterns", d: "see gentle weekly reflections and pick up where you left off." },
              ].map(({ n, t, d }) => (
                <div key={n} className="card-duo p-5 sm:p-6">
                  <span className="text-xs font-black text-primary tracking-widest">{n}</span>
                  <h3 className="mt-2 text-base font-bold text-foreground lowercase">{t}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed lowercase">{d}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Final CTA */}
          <section className="mt-20 sm:mt-28">
            <div className="card-duo p-8 sm:p-12 text-center">
              <h2 className="text-2xl sm:text-4xl font-black text-foreground leading-tight mb-3 lowercase">
                your feelings deserve a soft place to land.
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground font-medium mb-6 lowercase">
                take five minutes for yourself. coree is ready when you are.
              </p>
              <button onClick={onGetStarted} className="btn-duo text-sm px-8 py-4">
                start free - no card needed
              </button>
            </div>
          </section>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-border-color mt-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row justify-between gap-8">
            <div className="max-w-sm">
              <img src="/logo.svg" alt="coree" className="h-6 mb-3" />
              <p className="text-sm text-muted-foreground font-medium lowercase">
                a private space to talk it out. not therapy - just a wise friend, whenever.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 sm:gap-14 text-sm">
              <div>
                <p className="font-bold uppercase tracking-wider text-foreground text-xs mb-3">product</p>
                <ul className="space-y-2 text-muted-foreground lowercase">
                  <li><button onClick={onGetStarted} className="hover:text-foreground transition">get started</button></li>
                  <li><button onClick={onLogin} className="hover:text-foreground transition">log in</button></li>
                </ul>
              </div>
              <div>
                <p className="font-bold uppercase tracking-wider text-foreground text-xs mb-3">promise</p>
                <ul className="space-y-2 text-muted-foreground lowercase">
                  <li><Link to="/privacy" className="hover:text-foreground transition">private by design</Link></li>
                  <li><Link to="/encryption" className="hover:text-foreground transition">encrypted always</Link></li>
                  <li><Link to="/no-diagnoses" className="hover:text-foreground transition">no diagnoses</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-border/60 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-muted-foreground">
            <p className="lowercase">© 2025 coree · made with care</p>
            <p className="lowercase">if you're in crisis, please reach a professional or local helpline.</p>
          </div>
        </div>
      </footer>

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
