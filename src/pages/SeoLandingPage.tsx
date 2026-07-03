import { Link } from "react-router-dom";
import { Heart, Lock, MessageCircle, ShieldCheck } from "lucide-react";

interface SeoLandingPageProps {
  variant: "ai-friend" | "ai-therapist" | "ai-therapy";
}

const pageCopy = {
  "ai-friend": {
    eyebrow: "ai friend to talk to",
    title: "coree is your private ai friend when you need to talk.",
    body: "Talk or text with coree for warm check-ins, late-night thoughts, loneliness, stress, and everyday emotions. It feels like a wise friend who remembers what matters.",
  },
  "ai-therapist": {
    eyebrow: "ai therapist-style support",
    title: "coree offers therapist-style ai support without the waiting room.",
    body: "coree helps you slow down, name what you feel, and reflect with gentle questions. It is supportive and private, but it does not diagnose, treat, or replace a licensed therapist.",
  },
  "ai-therapy": {
    eyebrow: "ai therapy companion",
    title: "coree helps you process emotions with therapy-style conversations.",
    body: "Use coree for short voice or text sessions when you want to vent, journal, notice patterns, or feel less alone. It is emotional support for everyday moments, not medical care.",
  },
} as const;

export default function SeoLandingPage({ variant }: SeoLandingPageProps) {
  const copy = pageCopy[variant];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex w-[92%] max-w-6xl items-center justify-between py-5">
        <Link to="/" className="flex items-center gap-2" aria-label="coree home">
          <img src="/logo.svg" alt="coree" className="h-6" />
        </Link>
        <Link to="/" className="btn-duo h-10 px-5 text-xs rounded-full">
          start free
        </Link>
      </header>

      <main className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8">
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

        <section className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-3xl">
            <p className="mb-4 text-xs font-black uppercase tracking-wider text-primary">{copy.eyebrow}</p>
            <h1 className="text-4xl font-black leading-tight text-foreground sm:text-5xl lg:text-6xl lowercase">
              {copy.title}
            </h1>
            <p className="mt-6 text-lg font-medium leading-relaxed text-muted-foreground sm:text-xl lowercase">
              {copy.body}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/" className="btn-duo px-8 py-4 text-sm">
                talk to coree free
              </Link>
              <Link to="/privacy" className="btn-duo-secondary rounded-2xl px-6 py-3 text-sm">
                see privacy promise
              </Link>
            </div>
          </div>

          <div className="card-duo p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2 border-b-2 border-border-color pb-3">
              <img src="/logo-icon.svg" alt="coree" className="h-6 w-6" />
              <span className="text-sm font-bold lowercase">coree</span>
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-primary">online</span>
            </div>
            <div className="space-y-3 text-sm font-medium lowercase">
              <p className="ml-auto max-w-[82%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground">
                i need an ai friend for therapy-style support tonight.
              </p>
              <p className="max-w-[88%] rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 text-foreground">
                i'm here. what feels heaviest right now?
              </p>
              <p className="ml-auto max-w-[82%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground">
                i feel alone and anxious.
              </p>
              <p className="max-w-[88%] rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 text-foreground">
                that sounds painful. let's slow it down together.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-20 max-w-6xl sm:mt-28" aria-labelledby="support-title">
          <div className="mb-10 max-w-3xl">
            <h2 id="support-title" className="text-3xl font-black leading-tight text-foreground sm:text-4xl lowercase">
              ai friend, ai therapist-style reflection, and private emotional support.
            </h2>
            <p className="mt-3 text-base font-medium leading-relaxed text-muted-foreground sm:text-lg lowercase">
              coree is built for people searching for an ai friend to talk to, ai therapy support, or a gentle place to process life without judgment.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: MessageCircle, title: "talk or text", body: "voice and chat sessions for quick emotional check-ins." },
              { icon: Heart, title: "wise friend tone", body: "warm reflections, short replies, and gentle questions." },
              { icon: Lock, title: "private by design", body: "your conversations are protected and never sold." },
              { icon: ShieldCheck, title: "clear guardrails", body: "no diagnoses, no treatment claims, crisis support points to real help." },
            ].map(({ icon: Icon, title, body }) => (
              <article key={title} className="card-duo p-5">
                <Icon className="mb-4 h-5 w-5 text-primary" strokeWidth={2.5} />
                <h3 className="text-base font-black text-foreground lowercase">{title}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground lowercase">{body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}