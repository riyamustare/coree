import { motion } from "framer-motion";
import { MapPin, Sparkles, Users } from "lucide-react";

interface WaitlistCardProps {
  onJoin: () => void;
  variant?: "landing" | "home";
}

export function WaitlistCard({ onJoin, variant = "landing" }: WaitlistCardProps) {
  if (variant === "home") {
    return (
      <button
        onClick={onJoin}
        className="card-duo w-full p-4 sm:p-5 text-left relative overflow-hidden group"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border-2 border-primary/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary">
            <Sparkles className="h-2.5 w-2.5" strokeWidth={2.75} /> coming soon
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            <MapPin className="h-2.5 w-2.5" strokeWidth={2.75} /> bangalore
          </span>
        </div>
        <p className="text-sm font-bold text-foreground uppercase tracking-wide">find your people</p>
        <p className="text-xs text-muted-foreground mt-1 font-medium normal-case">
          invite-only community to meet people who match your vibe. tap to join the waitlist.
        </p>
      </button>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className="mt-20 sm:mt-28"
      aria-labelledby="waitlist-title"
    >
      <div className="card-duo p-6 sm:p-10 relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(hsl(var(--primary) / 0.18) 1.5px, transparent 1.5px)",
            backgroundSize: "22px 22px",
            maskImage:
              "radial-gradient(ellipse at 80% 20%, black 30%, transparent 70%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at 80% 20%, black 30%, transparent 70%)",
          }}
        />
        <div className="relative z-10 grid lg:grid-cols-[1.3fr_1fr] gap-8 items-center">
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border-2 border-primary/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
                <Sparkles className="h-3 w-3" strokeWidth={2.75} /> coming soon
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <MapPin className="h-3 w-3" strokeWidth={2.75} /> bangalore only
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                invite-only
              </span>
            </div>
            <h2 id="waitlist-title" className="text-3xl sm:text-4xl font-black text-foreground leading-tight mb-3 lowercase">
              find people who match your vibe.
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground font-medium mb-6 lowercase leading-relaxed">
              coree is building a small, curated space for real hangs — coffee, walks, weekend plans, and honest friendships. starting with bangalore.
            </p>
            <button onClick={onJoin} className="btn-duo text-sm px-7 py-4">
              <span>join the waitlist</span>
              <span className="ml-2 opacity-90 normal-case">— it's free</span>
            </button>
          </div>
          <div className="hidden lg:flex flex-col gap-3">
            {[
              { t: "curated matches", d: "we pair people based on vibe, not swipes." },
              { t: "irl-first", d: "designed for real meetups in your city." },
              { t: "private by default", d: "your details stay yours, always." },
            ].map((f) => (
              <div key={f.t} className="card-duo bg-background px-4 py-3 flex items-start gap-3">
                <div className="h-8 w-8 rounded-xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-primary" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-sm font-black text-foreground lowercase">{f.t}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium lowercase">{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
