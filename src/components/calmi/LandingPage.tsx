import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MessageCircle, Mic, Brain, LineChart, BookHeart, ShieldCheck, Heart, Lock, Quote } from "lucide-react";

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
        {/* Soft ambient background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "radial-gradient(hsl(var(--muted-foreground) / 0.18) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage:
              "radial-gradient(ellipse at center, black 40%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="relative max-w-6xl mx-auto"
        >
          {/* Two-column hero: copy on left, chat-mockup card on right */}
          <div className="grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-14 items-center mb-16 sm:mb-24">
            <div className="max-w-2xl">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-foreground leading-[1.05] mb-6 lowercase">
                your space to
                <br />
                process it all.
                <br />
                <span className="text-primary">that's coree.</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground font-medium mb-8 leading-relaxed lowercase">
                life feels heavy sometimes. coree is your space to talk, process,
                and understand what's going on inside - without any BS.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={onGetStarted} className="btn-duo text-sm px-8 py-4">
                  <span>start talking it out</span>
                  <span className="ml-2 opacity-90 normal-case">- it's free</span>
                </button>
                <button onClick={onLogin} className="btn-duo-secondary text-sm px-6 py-3 rounded-2xl">
                  i already have an account
                </button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground font-medium lowercase">
                loved by 50+ people like you
              </p>
            </div>

            {/* Right side: layered visual - chat card + floating badges */}
            <div className="relative h-[420px] sm:h-[460px] w-full">
              {/* Main chat card */}
              <motion.div
                initial={{ opacity: 0, y: 20, rotate: -2 }}
                animate={{ opacity: 1, y: 0, rotate: -2 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="absolute inset-0 sm:inset-x-6 card-duo p-5 sm:p-6 flex flex-col gap-3"
              >
                <div className="flex items-center gap-2 pb-3 border-b-2 border-border-color">
                  <img src="/logo-icon.svg" alt="coree" className="h-6 w-6" />
                  <span className="text-sm font-bold lowercase">coree</span>
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-[breathe_1.6s_ease-in-out_infinite]" />
                    listening
                  </span>
                </div>

                <div className="flex justify-end">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35, duration: 0.4 }}
                    className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 max-w-[80%] text-sm font-medium lowercase"
                  >
                    honestly? i can't switch off tonight.
                  </motion.div>
                </div>

                <div className="flex justify-start">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.4 }}
                    className="bg-muted text-foreground rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%] text-sm font-medium lowercase"
                  >
                    that sounds exhausting. what's the loudest thought right now?
                  </motion.div>
                </div>

                <div className="flex justify-end">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.05, duration: 0.4 }}
                    className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 max-w-[80%] text-sm font-medium lowercase"
                  >
                    that i'm behind on everything.
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.4, duration: 0.4 }}
                  className="flex justify-start"
                >
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-[breathe_1s_ease-in-out_infinite]"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                </motion.div>

                <div className="mt-auto pt-3 border-t-2 border-border-color flex items-center gap-2">
                  <div className="flex-1 rounded-full bg-muted h-9" />
                  <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
                    <Mic className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
                  </div>
                </div>
              </motion.div>

              {/* Floating quote sticker */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85, rotate: 6 }}
                animate={{ opacity: 1, scale: 1, rotate: 6 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="hidden sm:flex absolute -top-4 -right-2 card-duo bg-card px-4 py-3 items-center gap-2 max-w-[220px]"
              >
                <Quote className="h-4 w-4 text-primary shrink-0" strokeWidth={2.5} />
                <span className="text-xs font-bold text-foreground lowercase leading-snug">
                  finally, a space i actually want to open.
                </span>
              </motion.div>

              {/* Floating stat pill */}
              <motion.div
                initial={{ opacity: 0, y: 12, rotate: -6 }}
                animate={{ opacity: 1, y: 0, rotate: -6 }}
                transition={{ duration: 0.5, delay: 0.75 }}
                className="hidden sm:flex absolute -bottom-4 -left-2 card-duo bg-card px-4 py-3 items-center gap-3"
              >
                <div className="h-8 w-8 rounded-xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                  <Heart className="h-4 w-4 text-primary" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-sm font-black text-foreground leading-none">5 mins</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">avg check-in</p>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="mt-2 relative z-10">
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              {[
                { icon: Lock, label: "encrypted" },
                { icon: ShieldCheck, label: "private" },
                { icon: Heart, label: "human-first" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 rounded-full border-2 border-border-color bg-card px-3 py-1.5">
                  <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Feature highlights — bento-style engaging layout */}
          <section aria-labelledby="features-heading" className="mt-20 sm:mt-28">
            <div className="max-w-3xl mb-10 sm:mb-12">
              <span className="inline-block text-[11px] font-black uppercase tracking-widest text-primary mb-3">what you get</span>
              <h2 id="features-heading" className="text-3xl sm:text-5xl font-black text-foreground leading-[1.05] mb-4 lowercase">
                everything you need
                <br />
                to feel <span className="text-primary italic">heard.</span>
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground font-medium lowercase">
                small features, big calm. built for short check-ins or the long days.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 auto-rows-[minmax(180px,auto)] gap-4 sm:gap-5">
              {/* Big hero card — voice mode */}
              <motion.article
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45 }}
                className="card-duo relative overflow-hidden p-6 sm:p-8 lg:col-span-4 lg:row-span-2 bg-primary text-primary-foreground border-primary"
                style={{ boxShadow: "0 4px 0 0 hsl(211 71% 38%)" }}
              >
                <div className="relative z-10 flex flex-col h-full">
                  <div className="h-11 w-11 rounded-2xl bg-primary-foreground/15 border-2 border-primary-foreground/25 flex items-center justify-center mb-4">
                    <Mic className="h-5 w-5" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black lowercase mb-2">voice mode</h3>
                  <p className="text-sm sm:text-base opacity-90 leading-relaxed lowercase max-w-md">
                    talk like you would with a friend. natural voice in, natural voice back - no scripts, no waiting rooms.
                  </p>
                  <div className="mt-auto pt-6 flex items-end gap-1">
                    {[24, 40, 56, 32, 64, 48, 72, 40, 56, 28, 44, 60, 36, 52, 44, 32].map((h, i) => (
                      <span
                        key={i}
                        className="w-1.5 rounded-full bg-primary-foreground/80 animate-[breathe_1.6s_ease-in-out_infinite]"
                        style={{ height: `${h}px`, animationDelay: `${i * 80}ms` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary-foreground/10 blur-2xl" />
              </motion.article>

              {/* Text mode */}
              <motion.article
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: 0.05 }}
                className="card-duo p-6 lg:col-span-2 lg:row-span-2 flex flex-col"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-3">
                  <MessageCircle className="h-5 w-5 text-primary" strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-black text-foreground mb-1.5 lowercase">text mode</h3>
                <p className="text-sm text-muted-foreground leading-relaxed lowercase">
                  type at your pace. warm, short replies - no walls of advice.
                </p>
                <div className="mt-auto space-y-1.5 pt-5">
                  <div className="ml-auto max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-br-md px-3 py-2 text-xs font-medium lowercase">
                    can we just sit with this?
                  </div>
                  <div className="max-w-[85%] bg-muted text-foreground rounded-2xl rounded-bl-md px-3 py-2 text-xs font-medium lowercase">
                    yeah. we can.
                  </div>
                </div>
              </motion.article>

              {/* Remembers you */}
              <motion.article
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: 0.1 }}
                className="card-duo p-6 lg:col-span-2"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                    <Brain className="h-5 w-5 text-primary" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-base font-black text-foreground lowercase">remembers you</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed lowercase">
                  picks up where you left off - your moods, themes, what's weighing on you.
                </p>
              </motion.article>

              {/* Weekly insights */}
              <motion.article
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: 0.15 }}
                className="card-duo p-6 lg:col-span-2 relative overflow-hidden"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                    <LineChart className="h-5 w-5 text-primary" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-base font-black text-foreground lowercase">weekly insights</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed lowercase">
                  a gentle mood radar. patterns, not judgments.
                </p>
                <svg viewBox="0 0 120 40" className="mt-3 w-full h-10">
                  <polyline
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points="2,30 18,22 34,26 50,14 66,20 82,10 98,16 118,6"
                  />
                </svg>
              </motion.article>

              {/* Journal */}
              <motion.article
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: 0.2 }}
                className="card-duo p-6 lg:col-span-2"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                    <BookHeart className="h-5 w-5 text-primary" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-base font-black text-foreground lowercase">private journal</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed lowercase">
                  quick notes or voice memos. yours to keep, yours to delete.
                </p>
              </motion.article>

              {/* Private by design — wide accent */}
              <motion.article
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: 0.25 }}
                className="card-duo p-6 lg:col-span-6 flex flex-col sm:flex-row items-start sm:items-center gap-5"
              >
                <div className="h-12 w-12 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="h-6 w-6 text-primary" strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-black text-foreground mb-1 lowercase">private by design</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed lowercase">
                    end-to-end encrypted. no ads, no sharing, no diagnosing. just a safe space.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["encrypted", "no ads", "no sharing", "delete any time"].map((tag) => (
                    <span key={tag} className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 border-2 border-primary/20 rounded-full px-2.5 py-1">
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.article>
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
