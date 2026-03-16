import { qualificationThresholds, quizQuestions, resultThresholds } from "@/config/quiz";
import type { LeadProfile, QualificationTier, QuizResponses, ResultModel } from "@/lib/types";
import { clamp } from "@/lib/utils";

function findLabel(questionId: string, value: string) {
  const question = quizQuestions.find((item) => item.id === questionId);
  return question?.options.find((option) => option.value === value)?.label || "";
}

function countUnsure(answers: QuizResponses) {
  return Object.entries(answers).filter(([questionId, value]) => {
    const question = quizQuestions.find((item) => item.id === questionId);
    const option = question?.options.find((choice) => choice.value === value);
    return option?.isUnsure;
  }).length;
}

export function calculateRiskScore(answers: QuizResponses) {
  const baseScore = Object.entries(answers).reduce((acc, [questionId, value]) => {
    const question = quizQuestions.find((item) => item.id === questionId);
    const option = question?.options.find((choice) => choice.value === value);
    return acc + (option?.risk || 0);
  }, 0);

  let score = baseScore;
  const unsureCount = countUnsure(answers);

  if (unsureCount >= 3) score += 12;
  if (answers["cpa-trend"] === "increased-significantly") score += 8;
  if (answers["traffic-identification"] === "under-5") score += 10;
  if (answers["crm-utilization"] === "almost-none") score += 8;
  if (answers["data-fragmentation"] === "5-plus") score += 6;
  if (answers["attribution-confidence"] === "dont-track") score += 8;
  if (answers["traffic-waste"] === "over-90") score += 8;

  return clamp(Math.round((score / 150) * 100), 0, 100);
}

export function determineQualification(profile: LeadProfile): QualificationTier {
  let fitScore = 0;
  const role = (profile.roleTitle || "").toLowerCase();

  if (qualificationThresholds.idealAdSpend.includes(profile.monthlyAdSpend || "")) fitScore += 2;
  if (qualificationThresholds.idealSessions.includes(profile.monthlySessions || "")) fitScore += 2;
  if (qualificationThresholds.idealArr.includes(profile.arrRange || "")) fitScore += 2;
  if (qualificationThresholds.fitTitles.some((title) => role.includes(title))) fitScore += 2;
  if ((profile.websiteUrl || "").includes(".")) fitScore += 1;

  if (fitScore >= 6) return "High fit";
  if (fitScore >= 3) return "Potential fit";
  return "Lower fit";
}

function buildFindings(answers: QuizResponses) {
  const findings: string[] = [];

  if (answers["attribution-confidence"] === "somewhat-confident" || answers["attribution-confidence"] === "not-confident" || answers["attribution-confidence"] === "dont-track") {
    findings.push("Your team may be making budget decisions with incomplete attribution.");
  }
  if (answers["traffic-identification"] === "under-5" || answers["traffic-identification"] === "5-20") {
    findings.push("A meaningful portion of your traffic is likely going unidentified.");
  }
  if (answers["crm-utilization"] === "almost-none" || answers["crm-utilization"] === "some-lists") {
    findings.push("CRM data appears underutilized in paid media targeting.");
  }
  if (answers["cpa-trend"] === "increased-slightly" || answers["cpa-trend"] === "increased-significantly") {
    findings.push("Rising CPA may reflect signal loss, not just creative fatigue.");
  }
  if (answers["data-fragmentation"] === "5-plus" || answers["data-fragmentation"] === "3-4") {
    findings.push("Fragmented systems may be hiding recoverable pipeline.");
  }
  if (countUnsure(answers) >= 3) {
    findings.push("Several answers were difficult to confirm, which itself points to low data confidence.");
  }

  return findings.slice(0, 5);
}

function buildImplications(score: number, answers: QuizResponses) {
  const implications = [
    "Weak signal quality can quietly distort channel budgets, creative testing, and pipeline forecasts.",
    "Uncaptured or anonymous traffic often reduces the value of spend you are already making.",
    "Fixing identity and attribution usually improves operating confidence before it improves reporting aesthetics.",
  ];

  if (score >= 70 || answers["anonymous-traffic-value"] === "yes-significantly") {
    implications.unshift("If more visitor identity were recovered, your existing traffic could produce more qualified pipeline without needing the same level of spend growth.");
  }

  return implications.slice(0, 4);
}

function buildOpportunityNarrative(score: number, qualification: QualificationTier) {
  if (score >= 70 && qualification === "High fit") {
    return "There appears to be enough signal loss and enough commercial scale here that a Revenue Recovery Audit could likely surface meaningful wasted spend, anonymous traffic upside, and recoverable pipeline.";
  }
  if (score >= 40) {
    return "Your answers suggest hidden inefficiencies that are worth quantifying. Even modest improvements in identity, attribution, and CRM activation could change how confidently your team scales.";
  }
  return "Your stack may be healthier than average, but this result still gives you a benchmark for future pressure-testing as volume, channels, and reporting complexity increase.";
}

function routeVariant(score: number, qualification: QualificationTier): ResultModel["routeVariant"] {
  if (score >= 70 && qualification === "High fit") return "high-score-high-fit";
  if (score >= 40) return "high-score-lower-fit";
  return "low-score";
}

export function buildResultModel(
  answers: QuizResponses,
  lead: LeadProfile,
  qualificationProfile: LeadProfile,
): ResultModel {
  const score = calculateRiskScore(answers);
  const threshold = resultThresholds.find((item) => score >= item.min && score <= item.max) || resultThresholds[1];
  const qualification = determineQualification({ ...lead, ...qualificationProfile });
  const route = routeVariant(score, qualification);

  const recommendedNextStep =
    route === "high-score-high-fit"
      ? "Book a 20-minute intro call to see whether a Revenue Recovery Audit can quantify your hidden data leaks."
      : route === "high-score-lower-fit"
        ? "Review the findings with your growth team and decide whether an audit or strategy call is the right next step."
        : "Use this result as a benchmark and pressure-test weak spots before they become more expensive.";

  return {
    score,
    label: threshold.label,
    summary: threshold.summary,
    findings: buildFindings(answers),
    implications: buildImplications(score, answers),
    qualification,
    opportunityNarrative: buildOpportunityNarrative(score, qualification),
    recommendedNextStep,
    ctaPrimary: route === "low-score" ? "Get a Benchmark Review" : "Book a 20-Minute Intro Call",
    ctaSecondary:
      route === "high-score-high-fit"
        ? "Request Revenue Recovery Audit Details"
        : "Email My Results to My Team",
    routeVariant: route,
  };
}

export function summarizeAnswerContext(answers: QuizResponses) {
  return Object.entries(answers)
    .map(([key, value]) => `${key}: ${findLabel(key, value)}`)
    .join(" | ");
}
