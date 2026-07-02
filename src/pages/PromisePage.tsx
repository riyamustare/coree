import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, Lock, HeartHandshake, Check } from "lucide-react";

type PromiseKey = "privacy" | "encryption" | "no-diagnoses";

const CONTENT: Record<
  PromiseKey,
  {
    eyebrow: string;
    title: string;
    intro: string;
    icon: typeof ShieldCheck;
    bullets: { title: string; body: string }[];
  }
> = {
  privacy: {
    eyebrow: "our promise",
    title: "private by design.",
    intro:
      "coree is a space that belongs to you. we built it so your thoughts stay yours - not fuel for ads, not training data, not analytics for someone else.",
    icon: ShieldCheck,
    bullets: [
      { title: "no ads, ever", body: "we don't sell attention. no trackers, no third-party ad networks, no re-targeting." },
      { title: "your data is not training fuel", body: "your conversations are never used to train external models. period." },
      { title: "you own your history", body: "delete a session, a note, or your whole account any time. it goes with you." },
      { title: "minimum data by default", body: "we collect only what's needed to make coree work - nothing extra, no shadow profiles." },
    ],
  },
  encryption: {
    eyebrow: "our promise",
    title: "encrypted always.",
    intro:
      "everything you share with coree travels and rests behind modern encryption. no plain-text sitting around, no side doors.",
    icon: Lock,
    bullets: [
      { title: "encrypted in transit", body: "every request is protected with TLS 1.2+, so nothing you say leaks between you and coree." },
      { title: "encrypted at rest", body: "sessions, notes, and voice memos are stored encrypted on secure infrastructure." },
      { title: "scoped access controls", body: "only your account can read your data. row-level security keeps sessions isolated per user." },
      { title: "no long-term audio", body: "voice recordings are transcribed and discarded - we keep the text you can actually use." },
    ],
  },
  "no-diagnoses": {
    eyebrow: "our promise",
    title: "no diagnoses.",
    intro:
      "coree is a wise friend, not a clinician. we help you think out loud, notice patterns, and feel less alone - we don't label you.",
    icon: HeartHandshake,
    bullets: [
      { title: "not a medical tool", body: "coree does not diagnose, treat, or replace mental health care. it's a supportive companion." },
      { title: "no scary labels", body: "we won't slap a disorder on you or pathologize a hard day. we listen and reflect." },
      { title: "we point you to real help", body: "if something serious comes up, coree encourages you to reach a professional or a helpline." },
      { title: "you set the pace", body: "share as much or as little as you want. there's no intake form and no waiting room." },
    ],
  },
};

export default function PromisePage({ which }: { which: PromiseKey }) {
  const navigate = useNavigate();
  const data = CONTENT[which];
  const Icon = data.icon;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl z-50 rounded-3xl bg-background/60 backdrop-blur-md border border-border/60 shadow-sm">
        <div className="flex justify-between items-center px-4 py-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
            back
          </button>
          <img src="/logo.svg" alt="coree" className="h-6" />
          <button
            onClick={() => navigate("/")}
            className="btn-duo h-10 px-5 text-xs rounded-full"
          >
            get started
          </button>
        </div>
      </header>

      <main className="pt-32 sm:pt-40 pb-20 px-4 sm:px-6 lg:px-8">
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="max-w-3xl mx-auto"
        >
          <div className="h-14 w-14 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-5">
            <Icon className="h-7 w-7 text-primary" strokeWidth={2.5} />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
            {data.eyebrow}
          </p>
          <h1 className="text-4xl sm:text-5xl font-black text-foreground leading-tight mb-5 lowercase">
            {data.title}
          </h1>
          <p className="text-lg text-muted-foreground font-medium leading-relaxed mb-10 lowercase">
            {data.intro}
          </p>

          <div className="space-y-3">
            {data.bullets.map((b) => (
              <div key={b.title} className="card-duo p-5 flex gap-4 items-start">
                <div className="h-9 w-9 rounded-xl bg-primary/10 border-2 border-primary/20 flex-shrink-0 flex items-center justify-center">
                  <Check className="h-4 w-4 text-primary" strokeWidth={3} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground lowercase mb-1">
                    {b.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed lowercase">
                    {b.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 card-duo p-8 text-center">
            <h2 className="text-xl sm:text-2xl font-black text-foreground mb-2 lowercase">
              still have questions?
            </h2>
            <p className="text-sm text-muted-foreground font-medium mb-5 lowercase">
              we're a small team. write to us any time.
            </p>
            <a
              href="mailto:hello@coree.app"
              className="btn-duo text-sm px-6 py-3 inline-flex"
            >
              say hi
            </a>
          </div>
        </motion.article>
      </main>

      <footer className="border-t-2 border-border-color">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex justify-between items-center text-xs text-muted-foreground">
          <p className="lowercase">© 2025 coree · made with care</p>
          <button onClick={() => navigate("/")} className="hover:text-foreground transition lowercase">
            back to home
          </button>
        </div>
      </footer>
    </div>
  );
}