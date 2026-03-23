export type CTAConfig = {
  id: string;
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "outline";
};

export type AnswerOption = {
  value: string;
  label: string;
  risk: number;
  note?: string;
  isUnsure?: boolean;
};

export type QuizQuestion = {
  id: string;
  title: string;
  prompt: string;
  options: AnswerOption[];
};

export type ProfilingField = {
  id: string;
  label: string;
  type: "text" | "email" | "url" | "select";
  required: boolean;
  placeholder?: string;
  options?: string[];
};

export type ResultThreshold = {
  min: number;
  max: number;
  label: string;
  summary: string;
};

export type QualificationThresholds = {
  idealAdSpend: string[];
  idealSessions: string[];
  idealArr: string[];
  fitTitles: string[];
};

export type ProofStat = {
  value: string;
  label: string;
};

export type StackLayer = {
  eyebrow: string;
  title: string;
  description: string;
};

export type FAQItem = {
  question: string;
  answer: string;
};

export type QuizResponses = Record<string, string>;
export type LeadProfile = Record<string, string>;

export type QualificationTier = "High fit" | "Potential fit" | "Lower fit";

export type ResultModel = {
  score: number;
  label: string;
  summary: string;
  findings: string[];
  implications: string[];
  qualification: QualificationTier;
  opportunityNarrative: string;
  recommendedNextStep: string;
  ctaPrimary: string;
  ctaSecondary: string;
  routeVariant: "high-score-high-fit" | "high-score-lower-fit" | "low-score";
};

export type OpportunityInputs = {
  monthlyTraffic?: number;
  cpa?: number;
  leadToCloseRate?: number;
  averageDealValue?: number;
  identificationRate?: number;
};

export type OpportunityEstimate = {
  wastedSpendRange: string;
  recoverablePipelineRange: string;
  anonymousTrafficUpside: string;
  assumptions: string[];
};

export type SubmissionPayload = {
  lead: LeadProfile;
  qualification: LeadProfile;
  answers: QuizResponses;
  result: ResultModel;
  opportunity?: OpportunityInputs;
  submittedAt: string;
  source: "bad-data-test";
};
