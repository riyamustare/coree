import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Lock, Mic, Quote, ShieldCheck } from "lucide-react";
import { trackCtaClick, trackPageViewed } from "@/lib/analytics";

interface SeoLandingPageProps {
  variant: "ai-friend" | "ai-therapist" | "ai-therapy";
}

const pageCopy = {
  "ai-friend": {
    eyebrow: "your ai friend, anytime",
    h1a: "an ai friend",
    h1b: "who actually listens.",
    h1c: "meet coree.",
    body: "coree is the ai friend you talk to when life gets loud - late nights, big feelings, small wins. voice or text, always private, always yours.",
    userMsg: "i just need someone to talk to tonight.",
    aiMsg: "i'm here. what's been sitting with you today?",
    supportTitle: "an ai friend built for real conversations",
    supportBody: "coree is where people search for an ai friend to talk to - warm, honest, judgment-free. no scripts, no small talk, no waiting rooms.",
  },
  "ai-therapist": {
    eyebrow: "your private ai therapist chat",
    h1a: "an ai therapist chat",
    h1b: "in your pocket.",
    h1c: "that's coree.",
    body: "coree is a private ai therapist-style chat for the everyday moments therapy doesn't reach - anxiety, overthinking, relationships, burnout. voice or text, whenever you need it.",
    userMsg: "i can't stop overthinking everything.",
    aiMsg: "let's slow it down. which thought is the loudest right now?",
    supportTitle: "an ai therapist chat for everyday emotional support",
    supportBody: "coree is where people go for an ai therapist chat online - reflective, private, always available. it isn't a replacement for a licensed therapist, but it's a space to be heard.",
  },
  "ai-therapy": {
    eyebrow: "ai therapy that feels human",
    h1a: "ai therapy sessions",
    h1b: "for real life.",
    h1c: "coree gets it.",
    body: "short ai therapy sessions to vent, journal, and notice your patterns. coree remembers what matters and meets you where you are - anxious, stuck, or just tired.",
    userMsg: "everything feels heavy this week.",
    aiMsg: "that sounds a lot to carry. want to unpack the heaviest part first?",
    supportTitle: "ai therapy for stress, anxiety, and everyday moments",
    supportBody: "coree offers online ai therapy sessions people actually use - private conversations, gentle reflections, and space to make sense of what you're feeling.",
  },
} as const;

export default function SeoLandingPage({ variant }: SeoLandingPageProps) {
  const copy = pageCopy[variant];
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    trackPageViewed("seo_landing", variant);
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [variant]);

  const ctaLocation = `seo_${variant}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-6xl top-4">
        <div
          className={`flex justify-between items-center px-4 sm:px-6 transition-all duration-300 ease-out rounded-3xl border ${
            scrolled
              ? "py-3 bg-background/70 backdrop-blur-md border-border/60 shadow-sm"
              : "py-4 bg-transparent border-transparent"
          }`}
        >
          <Link to="/" aria-label="coree home">
            <img src="/logo.svg" alt="coree" className="h-6 md:h-6" />
          </Link>
          <Link
            to="/"
            onClick={() => trackCtaClick("get_started", `${ctaLocation}_header`)}
            className="btn-duo h-10 px-5 text-xs rounded-full"
          >
            get started
          </Link>
        </div>
      </header>

      <main className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "radial-gradient(hsl(var(--muted-foreground) / 0.18) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="relative max-w-6xl mx-auto"
        >
          <div className="grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-14 items-center mb-16 sm:mb-24">
            <div className="max-w-2xl">
              <p className="mb-4 text-xs font-black uppercase tracking-widest text-primary">{copy.eyebrow}</p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-foreground leading-[1.05] mb-6 lowercase">
                {copy.h1a}
                <br />
                {copy.h1b}
                <br />
                <span className="text-primary">{copy.h1c}</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground font-medium mb-8 leading-relaxed lowercase">
                {copy.body}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/"
                  onClick={() => trackCtaClick("start_free", `${ctaLocation}_hero`)}
                  className="btn-duo text-sm px-8 py-4"
                >
                  <span>start talking to coree</span>
                  <span className="ml-2 opacity-90 normal-case">- it's free</span>
                </Link>
                <Link
                  to="/privacy"
                  onClick={() => trackCtaClick("privacy", `${ctaLocation}_hero`)}
                  className="btn-duo-secondary text-sm px-6 py-3 rounded-2xl"
                >
                  private by design
                </Link>
              </div>
              <p className="mt-4 text-sm text-muted-foreground font-medium lowercase">
                loved by 50+ people like you
              </p>
            </div>

            <div className="relative h-[420px] sm:h-[460px] w-full">
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
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%] text-sm font-medium lowercase">
                    {copy.userMsg}
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-muted text-foreground rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%] text-sm font-medium lowercase">
                    {copy.aiMsg}
                  </div>
                </div>

                <div className="mt-auto pt-3 border-t-2 border-border-color flex items-center gap-2">
                  <div className="flex-1 rounded-full bg-muted h-9" />
                  <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
                    <Mic className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
                  </div>
                </div>
              </motion.div>

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

          <section className="mt-20 sm:mt-28" aria-labelledby="support-title">
            <div className="max-w-3xl mb-10">
              <h2 id="support-title" className="text-3xl sm:text-4xl font-black text-foreground leading-tight mb-3 lowercase">
                {copy.supportTitle}
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground font-medium lowercase leading-relaxed">
                {copy.supportBody}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
              {[
                { n: "01", t: "say hi", d: "sign up in seconds. no forms, no intake, no waiting." },
                { n: "02", t: "talk or type", d: "voice or text sessions whenever you need to think out loud." },
                { n: "03", t: "notice patterns", d: "gentle weekly reflections so you pick up where you left off." },
              ].map(({ n, t, d }) => (
                <div key={n} className="card-duo p-5 sm:p-6">
                  <span className="text-xs font-black text-primary tracking-widest">{n}</span>
                  <h3 className="mt-2 text-base font-bold text-foreground lowercase">{t}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed lowercase">{d}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-20 sm:mt-28">
            <div className="card-duo p-8 sm:p-12 text-center">
              <h2 className="text-2xl sm:text-4xl font-black text-foreground leading-tight mb-3 lowercase">
                your feelings deserve a soft place to land.
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground font-medium mb-6 lowercase">
                take five minutes for yourself. coree is ready when you are.
              </p>
              <Link
                to="/"
                onClick={() => trackCtaClick("start_free", `${ctaLocation}_final`)}
                className="btn-duo text-sm px-8 py-4 inline-block"
              >
                start free - no card needed
              </Link>
            </div>
          </section>
        </motion.div>
      </main>

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
                <p className="font-bold uppercase tracking-wider text-foreground text-xs mb-3">explore</p>
                <ul className="space-y-2 text-muted-foreground lowercase">
                  <li><Link to="/ai-friend" className="hover:text-foreground transition">ai friend</Link></li>
                  <li><Link to="/ai-therapist" className="hover:text-foreground transition">ai therapist chat</Link></li>
                  <li><Link to="/ai-therapy" className="hover:text-foreground transition">ai therapy</Link></li>
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
    </div>
  );
}