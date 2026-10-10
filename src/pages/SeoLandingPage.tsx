import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { trackPageViewed } from "@/lib/analytics";
import Index from "./Index";

export type SeoVariant =
  | "ai-friend"
  | "ai-therapist"
  | "ai-therapy"
  | "someone-to-talk-to"
  | "vent-online"
  | "feeling-lonely"
  | "ai-companion"
  | "therapy-chat"
  | "mental-health-chat"
  | "anxiety-help"
  | "late-night-chat";

type VariantMeta = {
  path: string;
  title: string;
  description: string;
  keywords: string;
  h1: string;
};

const SITE = "https://trycore.xyz";

export const seoVariants: Record<SeoVariant, VariantMeta> = {
  "ai-friend": {
    path: "/ai-friend",
    title: "ai friend to talk to - free, private, anytime | coree",
    description: "coree is a free ai friend to talk to when you feel lonely. voice or text, judgment-free, anytime. someone to listen when there's no one else around.",
    keywords: "ai friend, ai friend to talk to, someone to talk to, need a friend, ai companion, free ai friend, lonely, alternative to replika",
    h1: "an ai friend to talk to, whenever you need one",
  },
  "ai-therapist": {
    path: "/ai-therapist",
    title: "ai therapist chat - vent anonymously, free | coree",
    description: "coree is a free ai therapist chat for venting anonymously. voice or text, private, judgment-free. talk it out whenever you need to.",
    keywords: "ai therapist, ai therapist chat, vent online, anonymous vent, ai therapy chat, free ai therapist, alternative to wysa",
    h1: "an ai therapist chat, vent freely anytime",
  },
  "ai-therapy": {
    path: "/ai-therapy",
    title: "ai therapy online - free, private conversations | coree",
    description: "ai therapy for short, supportive check-ins. process feelings, unpack thoughts, feel a little lighter. free, private, no diagnoses.",
    keywords: "ai therapy, ai therapy online, free ai therapy, ai for mental health, ai emotional support, alternative to headspace, alternative to calm",
    h1: "ai therapy that actually feels human",
  },
  "someone-to-talk-to": {
    path: "/someone-to-talk-to",
    title: "someone to talk to right now - free & anonymous | coree",
    description: "need someone to talk to right now? coree is a private, anonymous ai friend that listens. voice or text, anytime, no judgment.",
    keywords: "someone to talk to, someone to talk to right now, need someone to talk to, anonymous chat, i need to talk to someone",
    h1: "need someone to talk to? coree is here.",
  },
  "vent-online": {
    path: "/vent-online",
    title: "vent online anonymously - free, private | coree",
    description: "vent online, anonymously, without judgment. coree listens when you just need to get it out. voice or text, free, private.",
    keywords: "vent online, vent anonymously, i need to vent, place to vent, anonymous venting, vent to someone",
    h1: "vent online, free, private, no judgment",
  },
  "feeling-lonely": {
    path: "/feeling-lonely",
    title: "feeling lonely? talk to someone anytime | coree",
    description: "feeling lonely tonight? coree is a warm ai friend to talk to when there's no one else around. free, private, anytime.",
    keywords: "feeling lonely, i feel alone, lonely at night, chat when lonely, friend to talk to at night",
    h1: "feeling lonely? you're not alone here.",
  },
  "ai-companion": {
    path: "/ai-companion",
    title: "ai companion for emotional support - free | coree",
    description: "an ai companion that listens, remembers what matters, and offers warm emotional support. free, private, voice or text.",
    keywords: "ai companion, ai emotional support, ai listener, ai companion app, alternative to replika",
    h1: "an ai companion that actually listens",
  },
  "therapy-chat": {
    path: "/therapy-chat",
    title: "therapy chat online - free, anonymous | coree",
    description: "a free, anonymous therapy-style chat. talk it out, feel heard, and pick up where you left off. voice or text, anytime.",
    keywords: "therapy chat, online therapy chat, anonymous therapy chat, free therapy chat, chat therapy",
    h1: "therapy chat that meets you where you are",
  },
  "mental-health-chat": {
    path: "/mental-health-chat",
    title: "mental health chat - free ai support 24/7 | coree",
    description: "a private mental health chat with a warm ai companion. gentle check-ins for stress, anxiety, loneliness, and hard days. free, 24/7.",
    keywords: "mental health chat, mental health support, ai mental health, mental wellness chat, 24/7 mental health",
    h1: "a mental health chat, whenever you need it",
  },
  "anxiety-help": {
    path: "/anxiety-help",
    title: "anxiety help - talk it out, feel lighter | coree",
    description: "anxious thoughts spiraling? coree helps you slow down, name what you're feeling, and unpack it, one message at a time.",
    keywords: "anxiety help, help with anxiety, anxiety chat, calm anxiety, overthinking help",
    h1: "anxiety help, one thought at a time",
  },
  "late-night-chat": {
    path: "/late-night-chat",
    title: "late-night chat - someone to talk to at 3am | coree",
    description: "can't sleep? coree is here for late-night conversations when no one else is up. voice or text, private, judgment-free.",
    keywords: "late night chat, someone to talk to at night, 3am thoughts, can't sleep chat, late night ai friend",
    h1: "late-night chat when the world is asleep",
  },
};

interface SeoLandingPageProps {
  variant: SeoVariant;
}

export default function SeoLandingPage({ variant }: SeoLandingPageProps) {
  const meta = seoVariants[variant];
  const url = `${SITE}${meta.path}`;

  useEffect(() => {
    trackPageViewed("seo_landing", variant);
  }, [variant]);

  return (
    <>
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <meta name="keywords" content={meta.keywords} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: meta.title,
          description: meta.description,
          url,
          inLanguage: "en",
          isPartOf: { "@type": "WebSite", name: "coree", url: SITE },
          about: { "@type": "Thing", name: meta.h1 },
        })}</script>
      </Helmet>
      {/* Hidden semantic H1 so crawlers see the targeted keyword on this URL. */}
      <h1 className="sr-only">{meta.h1}</h1>
      <Index />
    </>
  );
}