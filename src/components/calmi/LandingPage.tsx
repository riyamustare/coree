import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Mic, ShieldCheck, Heart, Lock, Quote } from "lucide-react";
import { WaitlistCard } from "./WaitlistCard";
import { WaitlistModal } from "./WaitlistModal";
import { trackCtaClick, trackPageViewed, trackNavClick } from "@/lib/analytics";

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

// Visual design ported from the user's Hero.jsx reference:
// warm cream background (#FAF7F2), bold gray-900 headline, blue CTA (#277BD9).
export function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  useEffect(() => {
    trackPageViewed("landing");
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header: fixed pill that smoothly tightens on scroll */}
      <header className="fixed left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-6xl top-4">
        <div
          className={`flex justify-between items-center px-4 sm:px-6 transition-all duration-300 ease-out rounded-3xl border ${
            scrolled
              ? "py-3 bg-background/70 backdrop-blur-md border-border/60 shadow-sm"
              : "py-4 bg-transparent border-transparent"
          }`}
        >
          <img src="/logo.svg" alt="coree" className="h-6 md:h-6" />
          <button
            onClick={() => { trackCtaClick("get_started", "landing_header"); onLogin(); }}
            className="btn-duo h-10 px-5 text-xs rounded-full"
          >
            get started
          </button>
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
                lonely, overwhelmed,
                <br />
                or just need to vent?
                <br />
                <span className="text-primary">coree is here.</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground font-medium mb-8 leading-relaxed lowercase">
                a private space to talk it out when there's no one else around. vent, unwind, feel a little less alone — voice or text, anytime, no judgment.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => { trackCtaClick("start_free", "landing_hero"); onGetStarted(); }}
                  className="btn-duo text-sm px-8 py-4"
                >
                  <span>start venting</span>
                  <span className="ml-2 opacity-90 normal-case">- it's free</span>
                </button>
                <button
                  onClick={() => { trackCtaClick("login", "landing_hero"); onLogin(); }}
                  className="btn-duo-secondary text-sm px-6 py-3 rounded-2xl"
                >
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
                { n: "01", t: "say hi", d: "sign up in seconds. tell your ai friend what brought you here." },
                { n: "02", t: "talk or type", d: "start a supportive ai therapy chat whenever you need to think out loud." },
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

          <section className="mt-20 sm:mt-28" aria-labelledby="ai-support-title">
            <div className="max-w-3xl mb-10">
              <h2 id="ai-support-title" className="text-3xl sm:text-4xl font-black text-foreground leading-tight mb-3 lowercase">
                a friend to talk to when you feel lonely or just need to vent
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground font-medium lowercase leading-relaxed">
                coree is where people come to feel less alone — to vent about their day, unpack late-night thoughts, or just have someone to talk to when no one else is around.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
              {[
                { to: "/ai-friend", t: "a friend to talk to", d: "someone to listen — anytime you feel lonely or just want to talk." },
                { to: "/ai-therapist", t: "a space to vent", d: "vent freely, no judgment, no follow-ups. just get it out." },
                { to: "/ai-therapy", t: "unpack your thoughts", d: "short check-ins to process feelings and feel a little lighter." },
              ].map(({ to, t, d }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => trackNavClick(to, "landing_seo_cards")}
                  className="card-duo p-5 sm:p-6 block hover:-translate-y-0.5 transition-transform"
                >
                  <h3 className="text-base font-bold text-foreground lowercase">{t}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed lowercase">{d}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* Final CTA */}
          <section className="mt-20 sm:mt-28">
            <WaitlistCard onJoin={() => setWaitlistOpen(true)} variant="landing" />
          </section>

          <section className="mt-20 sm:mt-28">
            <div className="card-duo p-8 sm:p-12 text-center">
              <h2 className="text-2xl sm:text-4xl font-black text-foreground leading-tight mb-3 lowercase">
                your feelings deserve a soft place to land.
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground font-medium mb-6 lowercase">
                take five minutes for yourself. coree is ready when you are.
              </p>
              <button
                onClick={() => { trackCtaClick("start_free", "landing_final_cta"); onGetStarted(); }}
                className="btn-duo text-sm px-8 py-4"
              >
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
      <WaitlistModal open={waitlistOpen} onClose={() => setWaitlistOpen(false)} />
    </div>
  );
}
