import type { CTAConfig, FAQItem, ProofStat, StackLayer } from "@/lib/types";

function normalizeSiteUrl(value?: string) {
  if (!value) return "http://localhost:3000";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value}`;
}

const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
const ghlBookingUrl =
  process.env.NEXT_PUBLIC_GHL_BOOKING_URL ||
  "https://api.leadconnectorhq.com/widget/bookings/intro-call-rev-recovery-audit";
const ghlBookingEmbedUrl =
  process.env.NEXT_PUBLIC_GHL_BOOKING_EMBED_URL ||
  "https://api.leadconnectorhq.com/widget/booking/303rv61ZkidkXmcEvLhz";

export const primaryCtas: CTAConfig[] = [
  { id: "take-test", label: "Take the Bad Data Test", href: "#quiz" },
  {
    id: "see-how",
    label: "See How It Works",
    href: "#framework",
    variant: "outline",
  },
  { id: "book-call", label: "Book a 20-Minute Intro Call", href: "#booking" },
  {
    id: "audit-info",
    label: "See If You Qualify for a Revenue Recovery Audit",
    href: "#booking",
    variant: "outline",
  },
];

export const proofStats: ProofStat[] = [
  {
    value: "15-30%",
    label: "typical efficiency upside we see in audits",
  },
  { value: "2 min", label: "average time to complete this diagnostic" },
  { value: "20-40%", label: "typical share of anonymous traffic on B2B SaaS sites" },
];

export const stackLayers: StackLayer[] = [
  {
    title: "Traffic Identification",
    eyebrow: "Super Pixels",
    description:
      "Resolve more of the anonymous traffic already hitting your site so paid media and pipeline decisions run on sharper identity.",
  },
  {
    title: "Intent Targeting",
    eyebrow: "Custom Audience Plus",
    description:
      "Turn scattered activity and CRM signals into audiences that reflect actual buying behavior, not blunt platform guesses.",
  },
  {
    title: "Revenue Optimization",
    eyebrow: "Consulting",
    description:
      "Connect attribution, targeting, CRM usage, and growth planning into one operating system that reduces signal loss and recoverable waste.",
  },
];

export const faqItems: FAQItem[] = [
  {
    question: "What is identity resolution?",
    answer:
      "Identity resolution is the process of recognizing more of the people and companies already interacting with your site. The goal is better decision quality, audience building, and revenue attribution rather than vanity match rates.",
  },
  {
    question: "What kind of match rate should I expect?",
    answer:
      "It depends on your traffic quality, consent posture, geography, and existing infrastructure. Stronger inputs usually improve recognition, but the more useful question is whether better identification changes targeting, pipeline visibility, and conversion efficiency.",
  },
  {
    question: "Is this compliant?",
    answer:
      "Compliance depends on your setup, consent framework, jurisdictions, and how data is activated. We design for disciplined data use and recommend legal review wherever needed, but we do not make blanket compliance claims.",
  },
  {
    question: "What if we do not know our numbers?",
    answer:
      "That is exactly why the test exists. Not knowing key answers often signals fragmented systems or weak data confidence, which can be more revealing than a polished dashboard.",
  },
  {
    question: "What data do you need for a forecast?",
    answer:
      "A useful forecast usually starts with traffic volume, spend, conversion rates, CRM usage, attribution maturity, and average deal economics. If some of that is missing, we use benchmark ranges and clearly label the estimate as directional.",
  },
  {
    question: "How long does it take to see results?",
    answer:
      "Simple visibility improvements can surface quickly, while deeper attribution and activation gains take longer. The timeline depends on your stack complexity, traffic volume, and how much implementation is required.",
  },
  {
    question: "Do you manage implementation too?",
    answer:
      "Yes. The audit is the diagnostic layer. If there is a strong fit, the Data Growth Stack can extend into implementation, optimization, and ongoing performance support.",
  },
];

export const siteConfig = {
  name: "The Bad Data Test",
  siteUrl,
  bookingUrl: ghlBookingUrl,
  bookingEmbedUrl: ghlBookingEmbedUrl,
  metadata: {
    title:
      "The Bad Data Test | Diagnostic Funnel for Revenue Leaks and Signal Loss",
    description:
      "A premium diagnostic for B2B SaaS and info product teams to assess whether bad data is hiding wasted ad spend, anonymous traffic, and recoverable pipeline.",
  },
  hero: {
    badge: "",
    headline: "Find 6-Figure Revenue Leaks in 2 Minutes",
    qualifier: "(For B2B SaaS Teams Spending $50k-$500k/mo on Paid Ads)",
    subhead:
      "See how much ad spend and pipeline you’re quietly wasting.",
    kicker:
      "Most teams cannot answer every question with confidence. That is often the signal.",
  },
  trustLogos: [
    {
      name: "HighLevel",
      alt: "HighLevel logo",
      src: "/logos/highlevel.png",
      surfaceClassName: "bg-white/[0.96]",
      imageClassName: "h-8 max-w-[180px]",
    },
    {
      name: "Meta",
      alt: "Meta logo",
      src: "/logos/meta.png",
      surfaceClassName: "bg-white/[0.96]",
      imageClassName: "h-8 max-w-[160px]",
    },
    {
      name: "Google Ads",
      alt: "Google Ads logo",
      src: "/logos/google-ads.png",
      surfaceClassName: "bg-white/[0.96]",
      imageClassName: "h-11 max-w-[155px]",
    },
    {
      name: "HubSpot",
      alt: "HubSpot logo",
      src: "/logos/hubspot.png",
      surfaceClassName: "bg-white/[0.96]",
      imageClassName: "h-8 max-w-[165px]",
    },
    {
      name: "Salesforce",
      alt: "Salesforce logo",
      src: "/logos/salesforce.png",
      surfaceClassName: "bg-white/[0.96]",
      imageClassName: "h-10 max-w-[150px]",
    },
  ],
  audiences: {
    for: [
      "US-based B2B SaaS teams with meaningful paid acquisition and in-house demand generation",
      "Info product businesses with complex funnels, multiple channels, and rising acquisition costs",
      "Operators who suspect attribution, audience quality, or CRM signal loss is distorting growth decisions",
    ],
    notFor: [
      "Early-stage companies with little traffic or no paid acquisition",
      "Teams looking for generic agency media buying without diagnostic rigor",
      "Businesses that do not need attribution clarity, targeting lift, or pipeline recovery insight",
    ],
  },
  whyItWorks: [
    "It focuses on signal quality, not vanity metrics.",
    "It reveals uncertainty as well as hard red flags.",
    "It separates urgency from fit so next steps feel credible.",
  ],
};
