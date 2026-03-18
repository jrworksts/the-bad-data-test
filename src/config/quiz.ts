import type {
  AnswerOption,
  ProfilingField,
  QualificationThresholds,
  QuizQuestion,
  ResultThreshold,
} from "@/lib/types";

const makeOption = (
  value: string,
  label: string,
  risk: number,
  note?: string,
): AnswerOption => ({
  value,
  label,
  risk,
  note,
  isUnsure: value === "not-sure" || label.toLowerCase().includes("not sure"),
});

export const quizQuestions: QuizQuestion[] = [
  {
    id: "traffic-identification",
    title: "Traffic Identification",
    prompt: "What percentage of your website visitors can you actually identify?",
    options: [
      makeOption("under-5", "Under 5%", 18),
      makeOption("5-20", "5–20%", 14),
      makeOption("20-40", "20–40%", 8),
      makeOption("over-40", "Over 40%", 2),
      makeOption("not-sure", "Not sure", 12),
    ],
  },
  {
    id: "attribution-confidence",
    title: "Attribution Confidence",
    prompt: "How confident are you in your marketing attribution?",
    options: [
      makeOption("extremely-confident", "Extremely confident", 1),
      makeOption("mostly-confident", "Mostly confident", 5),
      makeOption("somewhat-confident", "Somewhat confident", 10),
      makeOption("not-confident", "Not confident", 15),
      makeOption("dont-track", "We don’t really track attribution", 18),
    ],
  },
  {
    id: "audience-targeting",
    title: "Audience Targeting",
    prompt: "How are your ad audiences primarily built today?",
    options: [
      makeOption("demographic", "Demographic targeting", 10),
      makeOption("interest", "Interest targeting", 12),
      makeOption("lookalike", "Lookalike audiences", 8),
      makeOption("intent-based", "Intent-based audiences", 4),
      makeOption("custom-models", "Custom behavioral models", 2),
    ],
  },
  {
    id: "crm-utilization",
    title: "CRM Data Utilization",
    prompt: "How much of your CRM data is actively used to improve ad targeting?",
    options: [
      makeOption("almost-none", "Almost none", 16),
      makeOption("some-lists", "Some lists occasionally", 11),
      makeOption("regular-syncing", "Regular audience syncing", 6),
      makeOption("fully-integrated", "Fully integrated marketing system", 2),
      makeOption("not-sure", "Not sure", 10),
    ],
  },
  {
    id: "cpa-trend",
    title: "Cost Per Acquisition Trend",
    prompt: "Over the past 12 months, your CPA has:",
    options: [
      makeOption("decreased", "Decreased", 1),
      makeOption("same", "Stayed the same", 5),
      makeOption("increased-slightly", "Increased slightly", 10),
      makeOption("increased-significantly", "Increased significantly", 18),
      makeOption("not-sure", "Not sure", 9),
    ],
  },
  {
    id: "data-fragmentation",
    title: "Data Fragmentation",
    prompt: "How many platforms currently hold customer or marketing data?",
    options: [
      makeOption("1-2", "1–2 systems", 2),
      makeOption("3-4", "3–4 systems", 8),
      makeOption("5-plus", "5+ systems", 15),
      makeOption("not-sure", "Not sure", 10),
    ],
  },
  {
    id: "decision-confidence",
    title: "Marketing Decision Confidence",
    prompt: "When you make marketing budget decisions, how confident are you the data is accurate?",
    options: [
      makeOption("extremely-confident", "Extremely confident", 1),
      makeOption("mostly-confident", "Mostly confident", 5),
      makeOption("somewhat-confident", "Somewhat confident", 10),
      makeOption("not-confident", "Not confident", 16),
    ],
  },
  {
    id: "anonymous-traffic-value",
    title: "Anonymous Traffic Value",
    prompt: "If you could identify even 20% more of your website visitors, would that impact your revenue?",
    options: [
      makeOption("yes-significantly", "Yes significantly", 16),
      makeOption("possibly", "Possibly", 9),
      makeOption("probably-not", "Probably not", 3),
      makeOption("not-sure", "Not sure", 8),
    ],
  },
];

export const leadGateAfterQuestion = 4;

export const leadGateFields: ProfilingField[] = [
  { id: "firstName", label: "First name", type: "text", required: true, placeholder: "Taylor" },
  { id: "workEmail", label: "Work email", type: "email", required: true, placeholder: "taylor@company.com" },
  { id: "websiteUrl", label: "Website URL", type: "url", required: true, placeholder: "https://company.com" },
];

export const qualificationFields: ProfilingField[] = [
  {
    id: "monthlyAdSpend",
    label: "Monthly paid ad spend",
    type: "select",
    required: false,
    options: ["Under $50k", "$50k-$100k", "$100k-$250k", "$250k-$500k", "$500k+"],
  },
  {
    id: "monthlySessions",
    label: "Monthly website sessions",
    type: "select",
    required: false,
    options: ["Under 5k", "5k-15k", "15k-50k", "50k-100k", "100k+"],
  },
  {
    id: "crmPlatform",
    label: "CRM platform",
    type: "select",
    required: false,
    options: ["HubSpot", "Salesforce", "GoHighLevel", "Pipedrive", "Other / mixed stack"],
  },
  {
    id: "adPlatforms",
    label: "Primary ad platforms",
    type: "text",
    required: false,
    placeholder: "Google, LinkedIn, Meta",
  },
  {
    id: "arrRange",
    label: "ARR range",
    type: "select",
    required: false,
    options: ["Under $5M", "$5M-$10M", "$10M-$25M", "$25M-$100M", "$100M+"],
  },
  {
    id: "biggestChallenge",
    label: "Biggest growth challenge",
    type: "text",
    required: false,
    placeholder: "Rising CPA and weak attribution confidence",
  },
  {
    id: "roleTitle",
    label: "Role / title",
    type: "text",
    required: false,
    placeholder: "VP Growth",
  },
];

export const resultThresholds: ResultThreshold[] = [
  {
    min: 0,
    max: 39,
    label: "Lower urgency",
    summary:
      "Your answers suggest fewer obvious bad-data symptoms, but there may still be isolated blind spots worth pressure-testing.",
  },
  {
    min: 40,
    max: 69,
    label: "Moderate hidden revenue leak likelihood",
    summary:
      "Your stack shows multiple signs of signal loss or underused data that may be suppressing conversion efficiency and pipeline visibility.",
  },
  {
    min: 70,
    max: 100,
    label: "High hidden revenue leak likelihood",
    summary:
      "There is a strong probability that incomplete identification, fragmented systems, or weak attribution are hiding recoverable pipeline and wasted spend.",
  },
];

export const qualificationThresholds: QualificationThresholds = {
  idealAdSpend: ["$50k-$100k", "$100k-$250k", "$250k-$500k", "$500k+"],
  idealSessions: ["5k-15k", "15k-50k", "50k-100k", "100k+"],
  idealArr: ["$5M-$10M", "$10M-$25M", "$25M-$100M", "$100M+"],
  fitTitles: ["vp", "head", "director", "chief", "founder", "growth", "demand gen", "marketing"],
};
