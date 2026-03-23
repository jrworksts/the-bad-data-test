"use client";

import Script from "next/script";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { quizQuestions } from "@/config/quiz";
import { siteConfig } from "@/config/site";
import { trackEvent } from "@/lib/analytics";
import type { OpportunityInputs, QuizResponses, ResultModel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const LOCAL_STORAGE_KEY = "bad-data-test-state";
const GHL_EMBED_ID = "303rv61ZkidkXmcEvLhz_1773702309411";

export function ResultsPage({ sharedToken }: { sharedToken?: string }) {
  const router = useRouter();
  const [result, setResult] = useState<ResultModel | null>(null);
  const [answers, setAnswers] = useState<QuizResponses>({});
  const [opportunityInputs, setOpportunityInputs] = useState<OpportunityInputs>({
    monthlyTraffic: 20000,
    cpa: 2000,
    leadToCloseRate: 0.8,
    averageDealValue: 4000,
    identificationRate: 25,
  });
  const [copied, setCopied] = useState(false);
  const [submissionState, setSubmissionState] = useState<"idle" | "submitting" | "submitted" | "error">("idle");
  const [isPending, startTransition] = useTransition();
  const [shareToken, setShareToken] = useState(sharedToken ?? "");
  const bookingRef = useRef<HTMLElement | null>(null);
  const shareUrl = shareToken ? `${siteConfig.siteUrl}/results/${shareToken}` : `${siteConfig.siteUrl}/results`;
  const shareMessage = result
    ? `We scored ${result.score}/100 on The Bad Data Test (${result.label}). Worth a look if we're serious about attribution, anonymous traffic, and recoverable pipeline.`
    : "We took The Bad Data Test. Worth a look if we're serious about attribution, anonymous traffic, and recoverable pipeline.";

  async function ensureShareUrl() {
    if (!result) return `${siteConfig.siteUrl}/results`;
    if (sharedToken) return `${siteConfig.siteUrl}/results/${sharedToken}`;
    if (shareToken) return `${siteConfig.siteUrl}/results/${shareToken}`;

    try {
      const response = await fetch("/api/shared-results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          result,
          answers,
          opportunityInputs,
        }),
      });

      if (!response.ok) return `${siteConfig.siteUrl}/results`;

      const data = (await response.json()) as { ok: boolean; token?: string };
      if (data.token) {
        setShareToken(data.token);
        return `${siteConfig.siteUrl}/results/${data.token}`;
      }
    } catch {
      // Fall back to the generic results URL if token creation fails.
    }

    return `${siteConfig.siteUrl}/results`;
  }

  useEffect(() => {
    if (sharedToken) {
      void (async () => {
        try {
          const response = await fetch(`/api/shared-results/${sharedToken}`);
          if (!response.ok) return;

          const data = (await response.json()) as {
            ok: boolean;
            payload?: {
              result: ResultModel;
              answers: QuizResponses;
              opportunityInputs?: OpportunityInputs;
            };
          };

          if (!data.payload) return;

          setResult(data.payload.result);
          setAnswers(data.payload.answers);
          if (data.payload.opportunityInputs) setOpportunityInputs(data.payload.opportunityInputs);
          setSubmissionState("submitted");
        } catch {
          // Leave the page in its fallback state.
        }
      })();

      return;
    }

    const saved = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as {
        answers: QuizResponses;
        result?: ResultModel | null;
        opportunityInputs?: OpportunityInputs;
      };

      if (parsed.result) setResult(parsed.result);
      if (parsed.answers) setAnswers(parsed.answers);
      if (parsed.opportunityInputs) setOpportunityInputs(parsed.opportunityInputs);
      setSubmissionState(parsed.result ? "submitted" : "idle");
    } catch {
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (sharedToken || shareToken || !result) return;

    void (async () => {
      try {
        const response = await fetch("/api/shared-results", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            result,
            answers,
            opportunityInputs,
          }),
        });

        if (!response.ok) return;

        const data = (await response.json()) as { ok: boolean; token?: string };
        if (data.token) setShareToken(data.token);
      } catch {
        // Fall back to the non-token page URL if token creation fails.
      }
    })();
  }, [answers, opportunityInputs, result, shareToken, sharedToken]);

  useEffect(() => {
    if (!result) return;
    trackEvent("result_viewed", {
      score: result.score,
      qualification: result.qualification,
      route: result.routeVariant,
      page: "dedicated-results",
    });
  }, [result]);

  async function handleShare() {
    const resolvedShareUrl = await ensureShareUrl();
    await navigator.clipboard.writeText(resolvedShareUrl);
    setCopied(true);
    trackEvent("share_clicked", { type: "copy-link", page: "results" });
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function handleNativeShare() {
    if (!result) return;

    const payload = {
      title: `Bad Data Score: ${result.score}/100`,
      text: shareMessage,
      url: await ensureShareUrl(),
    };

    if (navigator.share) {
      try {
        await navigator.share(payload);
        trackEvent("share_clicked", { type: "native-share", page: "results" });
        return;
      } catch {
        // Fall back to copy for canceled or unsupported flows.
      }
    }

    const resolvedShareUrl = await ensureShareUrl();
    await navigator.clipboard.writeText(`${shareMessage} ${resolvedShareUrl}`);
    setCopied(true);
    trackEvent("share_clicked", { type: "native-share-fallback", page: "results" });
    window.setTimeout(() => setCopied(false), 1600);
  }

  function handleOpportunityChange(field: keyof OpportunityInputs, value: string) {
    startTransition(() => {
      const next = {
        ...opportunityInputs,
        [field]: value ? Number(value) : undefined,
      };
      setOpportunityInputs(next);
      if (!sharedToken) setShareToken("");
      const saved = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, unknown>;
        window.localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify({
            ...parsed,
            opportunityInputs: next,
          }),
        );
      }
      trackEvent("opportunity_estimated", { field, value: value ? Number(value) : 0, page: "results" });
    });
  }

  async function handleEmailShare() {
    trackEvent("share_clicked", { type: "email-team", page: "results" });
    const subject = encodeURIComponent(
      result ? `We scored ${result.score}/100 on The Bad Data Test` : "We should review this Bad Data Test result",
    );
    const resolvedShareUrl = await ensureShareUrl();
    const body = encodeURIComponent(
      `${shareMessage}\n\nSee the diagnostic here: ${resolvedShareUrl}`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  async function handleSocialShare(platform: "linkedin" | "x") {
    const resolvedShareUrl = await ensureShareUrl();
    const encodedUrl = encodeURIComponent(resolvedShareUrl);
    const encodedText = encodeURIComponent(shareMessage);
    const href =
      platform === "linkedin"
        ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
        : `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;

    trackEvent("share_clicked", { type: platform, page: "results" });
    window.open(href, "_blank", "noopener,noreferrer");
  }

  if (!result) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl items-center px-4 py-20 sm:px-6 lg:px-8">
        <Card className="w-full">
          <CardContent className="space-y-6 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">No result found</p>
            <h1 className="font-display text-4xl font-bold text-paper">Take the test first to unlock your completion page</h1>
            <p className="mx-auto max-w-2xl text-base leading-7 text-cloud/72">
              This page is reserved for completed diagnostics. Once the quiz is finished, your score and recommendations will land here automatically.
            </p>
            <div className="flex justify-center">
              <Button onClick={() => router.push("/")}>Go back to the test</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  const visualModel = buildVisualModel(result, opportunityInputs);
  const isAuditCandidate = result.qualification === "High fit" && result.score >= 40;
  const annualizedRecoverableRevenue = visualModel.recoveredRevenue * 12;
  const hasSixFigureUpside = visualModel.recoveryPotentialHigh * 12 >= 100000;

  function openBookingUrl() {
    trackEvent("booking_started", { source: isAuditCandidate ? "results-hero" : "results-soft-cta" });
    window.open("https://api.leadconnectorhq.com/widget/bookings/intro-call-rev-recovery-audit", "_blank", "noopener,noreferrer");
  }

  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30" aria-hidden />
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-24 pt-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Completion page</p>
            <h1 className="mt-2 font-display text-4xl font-bold text-paper md:text-5xl">Your Bad Data Test results</h1>
          </div>
        </div>

        <div className="space-y-10">
          <ResultsHeroVariant
            result={result}
            visualModel={visualModel}
            isAuditCandidate={isAuditCandidate}
            annualizedRecoverableRevenue={annualizedRecoverableRevenue}
            hasSixFigureUpside={hasSixFigureUpside}
            onPrimary={openBookingUrl}
            onShare={handleShare}
            copied={copied}
          />

          <AnswersSummary answers={answers} />

          <Card id="opportunity">
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Opportunity estimate</p>
                  <h3 className="mt-2 font-display text-3xl font-bold text-paper">What Your Pipeline Could Look Like With Better Data</h3>
                </div>
                <p className="max-w-xl text-sm leading-6 text-cloud/65">
                  Enter your company information below to see what sort of results you can expect.
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-5">
                <MetricInput
                  label="Monthly Website Visitors"
                  value={opportunityInputs.monthlyTraffic}
                  onChange={(value) => handleOpportunityChange("monthlyTraffic", value)}
                  helperText="The number of visitors your site receives each month."
                />
                <MetricInput
                  label="Average CAC (Per New Customer)"
                  value={opportunityInputs.cpa}
                  onChange={(value) => handleOpportunityChange("cpa", value)}
                  helperText="Your average acquisition cost per paying customer."
                />
                <MetricInput
                  label="Visitor-to-customer conversion rate (%)"
                  value={opportunityInputs.leadToCloseRate}
                  onChange={(value) => handleOpportunityChange("leadToCloseRate", value)}
                  helperText="The percentage of site visitors who ultimately become customers."
                />
                <MetricInput
                  label="Yearly revenue per customer"
                  value={opportunityInputs.averageDealValue}
                  onChange={(value) => handleOpportunityChange("averageDealValue", value)}
                  helperText="The average revenue generated per customer or sale."
                />
                <MetricInput
                  label="Current identifiable traffic (%)"
                  value={opportunityInputs.identificationRate}
                  onChange={(value) => handleOpportunityChange("identificationRate", value)}
                  placeholder="25"
                  helperText="Estimated percentage of your traffic you can currently identify or activate."
                />
              </div>
              <div className="grid gap-6">
                <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
                  <OpportunityComparisonChart model={visualModel} />
                  <OpportunityBreakdownChart model={visualModel} />
                </div>
                <div className="space-y-4">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                      <CardContent className="space-y-6">
                        <div className="space-y-2">
                          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Funnel leak view</p>
                          <h3 className="font-display text-3xl font-bold text-paper">Where Your System Is Likely Leaking Value</h3>
                          <p className="max-w-3xl text-base leading-7 text-cloud/74">
                            You may not need more traffic. You may need better signal quality.
                          </p>
                        </div>
                <FunnelLeakVisualization model={visualModel} />
                <p className="text-sm leading-7 text-cloud/65">
                  Illustrative model showing how a 15-25% improvement in signal quality (identity, attribution, CRM activation) can translate into roughly $1.0M-$1.5M/year in additional pipeline and revenue from traffic you already have.
                </p>
                        <p className="text-sm leading-7 text-cloud/70">
                          On the Intro Call we&apos;ll replace these directional bars with your actual GA / CRM numbers and confirm which levers are real.
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="flex h-full flex-col space-y-5">
                        <div className="space-y-2">
                          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Signal loss model</p>
                          <h3 className="font-display text-3xl font-bold text-paper">Why CPA Often Rises When Signal Quality Falls</h3>
                        </div>
                        <CPASignalChart />
                        <p className="text-sm leading-7 text-cloud/65">
                          Directional model - illustrates a common pattern when attribution, identity, and targeting signals weaken.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  <RecoverableRevenueModule model={visualModel} />
                  <div className="space-y-2 px-1">
                    <p className="text-sm leading-7 text-cloud/70">
                      This is not new traffic. This is value already inside your existing system.
                    </p>
                    <p className="text-sm leading-7 text-cloud/60">
                      Even modest improvements in identification and re-engagement can create meaningful pipeline without increasing acquisition spend.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <section id="booking" ref={bookingRef}>
            <Card className="border-glow/15 bg-gradient-to-br from-glow/10 via-white/[0.04] to-amber/10">
              <CardContent className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
                <div className="space-y-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Next step</p>
                  {isAuditCandidate ? (
                    <>
                      <h2 className="font-display text-4xl font-bold text-paper md:text-5xl">
                        If these visuals even loosely match your reality and you&apos;re spending $50k+/mo on paid, you&apos;re almost certainly leaving six figures on the table.
                      </h2>
                      <p className="max-w-2xl text-base leading-8 text-cloud/80 md:text-lg">
                        The next step is a 20-minute Intro Call to validate the upside and decide if a full Revenue Recovery Audit makes sense now or later.
                      </p>
                      <p className="max-w-2xl text-base leading-8 text-cloud/72 md:text-lg">
                        Everything above is a modeled view from 8 questions. The Intro Call is where we turn this into a concrete 90-day plan.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Button size="lg" onClick={openBookingUrl}>
                          Book a 20-Minute Revenue Recovery Call
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="font-display text-4xl font-bold text-paper md:text-5xl">
                        Your Bad Data risk looks lower on the surface.
                      </h2>
                      <p className="max-w-2xl text-base leading-8 text-cloud/80 md:text-lg">
                        If you&apos;d like a brief review, you can still book a 20-minute Intro Call, but we typically reserve full Revenue Recovery Audits for teams spending $50k+/mo on paid.
                      </p>
                      <p className="max-w-2xl text-base leading-8 text-cloud/72 md:text-lg">
                        Everything above is a modeled view from 8 questions. The Intro Call is where we turn this into a concrete 90-day plan.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Button size="lg" onClick={openBookingUrl}>
                          Book a 20-Minute Revenue Recovery Call
                        </Button>
                      </div>
                    </>
                  )}
                </div>
                <div className="rounded-[28px] border border-white/10 bg-ink/70 p-6">
                  {isAuditCandidate ? (
                    <>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cloud/60">Book an intro call with our team</p>
                      <p className="mt-3 text-sm leading-6 text-cloud/68">
                        We only run a limited number of Revenue Recovery Audits per month for teams spending $50k-$500k+/mo on paid. If your calendar is full, we&apos;ll prioritize you next month.
                      </p>
                      <div className="mt-6 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.02]">
                        <iframe
                          src={siteConfig.bookingEmbedUrl}
                          id={GHL_EMBED_ID}
                          title="Revenue Recovery Audit intro call booking"
                          className="min-h-[720px] w-full border-0 md:min-h-[820px]"
                          scrolling="no"
                          style={{ width: "100%", border: "none", overflow: "hidden" }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cloud/60">Optional intro call</p>
                      <p className="text-base leading-7 text-cloud/78">
                        This looks lower urgency than the strongest audit candidates, but you can still use the call to pressure-test whether hidden signal loss is likely to become a real issue as spend grows.
                      </p>
                      <div className="mt-6 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.02]">
                        <iframe
                          src={siteConfig.bookingEmbedUrl}
                          id={GHL_EMBED_ID}
                          title="Revenue Recovery Audit intro call booking"
                          className="min-h-[720px] w-full border-0 md:min-h-[820px]"
                          scrolling="no"
                          style={{ width: "100%", border: "none", overflow: "hidden" }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
      <Script src="https://link.msgsndr.com/js/form_embed.js" strategy="afterInteractive" />
    </main>
  );
}

function MetricCard({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
      <p className="text-sm font-medium text-cloud/65">{label}</p>
      <p className={cn("mt-3 font-display font-bold text-paper", compact ? "text-lg leading-7" : "text-2xl")}>{value}</p>
    </div>
  );
}

function MetricInput({
  label,
  value,
  onChange,
  helperText,
  placeholder,
}: {
  label: string;
  value?: number;
  onChange: (value: string) => void;
  helperText?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <label className="mb-2 block min-h-[3.5rem] text-sm font-semibold uppercase tracking-[0.16em] text-paper/88">{label}</label>
      <Input
        type="number"
        step="any"
        inputMode="decimal"
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
      {helperText ? <p className="mt-2 min-h-[3.25rem] text-xs leading-5 text-cloud/55">{helperText}</p> : null}
    </div>
  );
}

function ResultsHeroVariant({
  result,
  visualModel,
  annualizedRecoverableRevenue,
  hasSixFigureUpside,
  isAuditCandidate,
  onPrimary,
  onShare,
  copied,
}: {
  result: ResultModel;
  visualModel: VisualModel;
  annualizedRecoverableRevenue: number;
  hasSixFigureUpside: boolean;
  isAuditCandidate: boolean;
  onPrimary: () => void;
  onShare: () => void;
  copied: boolean;
}) {
  const primaryHeadline = hasSixFigureUpside
    ? "Your Bad Data Test shows likely 6-figure revenue leaks."
    : "Your Bad Data Test shows likely meaningful revenue leaks.";

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-glow/15 bg-[radial-gradient(circle_at_top_left,rgba(121,242,210,0.12),transparent_28%),linear-gradient(160deg,rgba(12,23,40,0.96),rgba(7,14,25,1))]">
        <CardContent className="space-y-6 p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">
                {isAuditCandidate ? "Revenue leak signal" : "Lower urgency result"}
              </p>
              <h2 className="mt-2 font-display text-4xl font-bold text-paper md:text-5xl">
                {isAuditCandidate
                  ? primaryHeadline
                  : "Your Bad Data risk looks lower on the surface."}
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-8 text-cloud/80 md:text-lg">
                {isAuditCandidate
                  ? "This is a directional estimate based on your answers. A 20-minute Revenue Recovery Call is where we validate these numbers against your actual GA / CRM data and confirm if there&apos;s real upside."
                  : `${result.label} score of ${result.score}. The stack may be healthier than average right now, but this report is still useful for pressure-testing attribution confidence, CRM activation, and anonymous traffic before spend scales further.`}
              </p>
              <div className="mt-6">
                <div className="flex flex-wrap gap-3">
                  <Button size="lg" onClick={onPrimary}>
                    Book a 20-Minute Revenue Recovery Call
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button size="lg" variant="outline" onClick={onShare}>
                    {copied ? "Results Link Copied" : "Copy Results Link"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <DataConfidenceGauge model={visualModel} />
            <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(121,242,210,0.10),rgba(255,255,255,0.04))] p-5 md:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Recommended flow</p>
              <h3 className="mt-4 font-display text-3xl font-bold text-paper">
                {isAuditCandidate ? "Validate whether the upside is real." : "Use this result to align the team before escalating."}
              </h3>
              <p className="mt-4 max-w-2xl text-base leading-8 text-cloud/80">
                {isAuditCandidate
                  ? "This is a directional estimate based on a few high-level inputs. The Intro Call is where we validate the model against your actual GA / CRM data and confirm if there&apos;s real upside."
                  : "This result still deserves a quick human review if the numbers feel directionally close to your reality. The Intro Call is the fastest way to pressure-test whether a deeper audit makes sense now or later."}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button size="lg" onClick={onPrimary}>
                  Book a 20-Minute Revenue Recovery Call
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type VisualModel = {
  confidenceScore: number;
  confidenceLabel: string;
  interpretation: string;
  traffic: number;
  conversionRate: number;
  identificationRate: number;
  averageRevenuePerCustomer: number;
  recoveryPotentialLow: number;
  recoveryPotentialHigh: number;
  currentRevenueMonthly: number;
  improvedRevenueMonthlyLow: number;
  improvedRevenueMonthlyMid: number;
  improvedRevenueMonthlyHigh: number;
  currentLeads: number;
  improvedLeads: number;
  currentPipelineAnnual: number;
  improvedPipelineAnnual: number;
  recoverablePipeline: number;
  efficiencyGain: number;
  anonymousTrafficUpside: number;
  wastedSpend: number;
  currentSales: number;
  currentRevenue: number;
  estimatedSpend: number;
  trafficLossValue: number;
  anonymousTraffic: number;
  idResolutionMatchPct: number;
  consumerMatches: number;
  verificationPct: number;
  verifiedMatchedProfiles: number;
  reOptInPct: number;
  recoveredLeads: number;
  reactivationSalesRate: number;
  recoveredSales: number;
  recoveredRevenue: number;
  liftScenarios: { label: string; value: number }[];
  assumptions: string[];
};

function buildVisualModel(result: ResultModel, inputs: OpportunityInputs): VisualModel {
  const traffic = inputs.monthlyTraffic || 20000;
  const cpa = inputs.cpa || 2000;
  const closeRatePercent = inputs.leadToCloseRate || 0.8;
  const closeRate = closeRatePercent / 100;
  const averageDeal = inputs.averageDealValue || 4000;
  const identificationRate = inputs.identificationRate || 25;
  const idResolutionMatchPct = 30;
  const verificationPct = 80;
  const reOptInPct = 15;
  const reactivationSalesRate = 4;

  const confidenceScore = Math.max(0, Math.min(100, 100 - result.score));
  const currentSales = traffic * closeRate;
  const currentRevenue = currentSales * averageDeal;
  const estimatedSpend = currentSales * cpa;
  const anonymousTraffic = traffic * ((100 - identificationRate) / 100);
  const trafficLossValue = (estimatedSpend / traffic) * anonymousTraffic;
  const consumerMatches = anonymousTraffic * (idResolutionMatchPct / 100);
  const verifiedMatchedProfiles = consumerMatches * (verificationPct / 100);
  const recoveredLeads = verifiedMatchedProfiles * (reOptInPct / 100);
  const recoveredSales = recoveredLeads * closeRate;
  const recoveredRevenue = recoveredSales * averageDeal;
  const currentLeads = traffic * 0.08;
  const improvedLeads = traffic * 0.1;
  const currentPipelineAnnual = currentRevenue * 12;
  const improvedPipelineAnnual = currentPipelineAnnual * 1.2;
  const recoverablePipeline = currentRevenue * 0.1640625;
  const recoveryPotentialLow = currentRevenue * 0.125;
  const recoveryPotentialHigh = currentRevenue * 0.203125;
  const improvedRevenueMonthlyLow = currentRevenue + recoveryPotentialLow;
  const improvedRevenueMonthlyMid = 760000 / 640000 * currentRevenue;
  const improvedRevenueMonthlyHigh = currentRevenue * 1.25;
  const efficiencyGain = currentRevenue * 0.06;
  const anonymousTrafficUpside = currentRevenue * 0.28;
  const wastedSpend = estimatedSpend * 0.12;

  const confidenceLabel =
    confidenceScore <= 40 ? "High Risk" : confidenceScore <= 70 ? "Moderate Risk" : "Strong Foundation";

  return {
    confidenceScore,
    confidenceLabel,
    interpretation:
      confidenceScore <= 40
        ? "Your score suggests likely hidden inefficiencies across identity, attribution, or CRM activation."
        : confidenceScore <= 70
          ? "Your score suggests incomplete visibility is creating some hidden drag, even if the stack looks stable on the surface."
          : "Your score suggests a stronger foundation than most, but there may still be underused traffic value or fragmented signals worth validating.",
    traffic,
    conversionRate: closeRatePercent,
    identificationRate,
    averageRevenuePerCustomer: averageDeal,
    recoveryPotentialLow,
    recoveryPotentialHigh,
    currentRevenueMonthly: currentRevenue,
    improvedRevenueMonthlyLow,
    improvedRevenueMonthlyMid,
    improvedRevenueMonthlyHigh,
    currentLeads,
    improvedLeads,
    currentPipelineAnnual,
    improvedPipelineAnnual,
    recoverablePipeline,
    efficiencyGain,
    anonymousTrafficUpside,
    wastedSpend,
    currentSales,
    currentRevenue,
    estimatedSpend,
    trafficLossValue,
    anonymousTraffic,
    idResolutionMatchPct,
    consumerMatches,
    verificationPct,
    verifiedMatchedProfiles,
    reOptInPct,
    recoveredLeads,
    reactivationSalesRate,
    recoveredSales,
    recoveredRevenue,
    liftScenarios: [
      { label: "20% identification lift", value: recoveredRevenue * 0.55 },
      { label: "30% identification lift", value: recoveredRevenue * 0.78 },
      { label: "40% identification lift", value: recoveredRevenue },
    ],
    assumptions: [
      `Using ${formatDetailedNumber(traffic)} monthly visitors`,
      `Using ${formatDetailedCurrency(cpa)} average cost per customer`,
      `Using ${formatPercent(closeRatePercent)} visitor-to-customer conversion rate`,
      `Using ${formatDetailedCurrency(averageDeal)} average revenue per customer`,
      `Using ${formatPercent(identificationRate)} current traffic identification rate`,
      `Using ${formatPercent(idResolutionMatchPct)} ID resolution match rate`,
      `Using ${formatPercent(verificationPct)} verification rate`,
      `Using ${formatPercent(reOptInPct)} re-opt-in rate`,
    ],
  };
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatRoundedCompactCurrency(value: number, roundingBase = 10000) {
  return formatCompactCurrency(Math.round(value / roundingBase) * roundingBase);
}

function formatRangeCurrency(min: number, max: number) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: min >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 0,
  });

  return `${formatter.format(min)}-${formatter.format(max)}`;
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDetailedCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDetailedNumber(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function DataConfidenceGauge({ model }: { model: VisualModel }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
      <p className="text-sm font-medium text-cloud/65">Your Data Confidence Score</p>
      <p className="mt-3 font-display text-6xl font-bold text-paper">{model.confidenceScore}</p>
      <div className="mt-5">
        <div className="relative h-4 overflow-hidden rounded-full bg-white/10">
          <div className="absolute inset-y-0 left-0 w-[40%] bg-rose/80" />
          <div className="absolute inset-y-0 left-[40%] w-[30%] bg-amber/80" />
          <div className="absolute inset-y-0 right-0 w-[30%] bg-glow/80" />
          <div className="absolute inset-y-0 w-1.5 rounded-full bg-paper shadow-[0_0_0_2px_rgba(8,17,31,0.9)]" style={{ left: `calc(${model.confidenceScore}% - 3px)` }} />
        </div>
        <div className="mt-2 flex justify-between text-[11px] uppercase tracking-[0.18em] text-cloud/55">
          <span>High Risk</span>
          <span>Moderate Risk</span>
          <span>Strong Foundation</span>
        </div>
      </div>
      <p className="mt-4 text-sm font-medium text-paper">{model.confidenceLabel}</p>
      <p className="mt-2 text-sm leading-7 text-cloud/72">{model.interpretation}</p>
    </div>
  );
}

function FunnelLeakVisualization({ model }: { model: VisualModel }) {
  const currentLeads = model.traffic * 0.05;
  const improvedLeads = model.traffic * 0.35;
  const currentPipeline = currentLeads * model.averageRevenuePerCustomer;
  const improvedPipeline = improvedLeads * model.averageRevenuePerCustomer;

  const stages = [
    {
      label: "Traffic",
      currentLabel: "Traffic",
      improvedLabel: "Traffic",
      current: model.traffic,
      improved: model.traffic,
      format: formatCompactNumber,
    },
    {
      label: "Leads",
      currentLabel: "Leads (5%)",
      improvedLabel: "Leads (35%)",
      current: currentLeads,
      improved: improvedLeads,
      format: formatCompactNumber,
      currentWidth: "5%",
      improvedWidth: "35%",
    },
    {
      label: "Pipeline",
      currentLabel: "Pipeline",
      improvedLabel: "Pipeline",
      current: currentPipeline,
      improved: improvedPipeline,
      format: formatCompactCurrency,
    },
  ];

  const maxValue = Math.max(...stages.flatMap((stage) => [stage.current, stage.improved]));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[
        { title: "Current state", key: "current" as const, tone: "bg-white/[0.03]" },
        { title: "Improved data", key: "improved" as const, tone: "bg-glow/8" },
      ].map((column) => (
        <div key={column.title} className={cn("rounded-[24px] border border-white/10 p-5", column.tone)}>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cloud/60">{column.title}</p>
          <div className="mt-5 space-y-4">
            {stages.map((stage) => {
              const value = column.key === "current" ? stage.current : stage.improved;
              const width =
                column.key === "current"
                  ? ("currentWidth" in stage && stage.currentWidth) || `${Math.max((value / maxValue) * 100, 14)}%`
                  : ("improvedWidth" in stage && stage.improvedWidth) || `${Math.max((value / maxValue) * 100, 14)}%`;
              return (
                <div key={`${column.title}-${stage.label}`} className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-cloud/72">
                    <span>{column.key === "current" ? stage.currentLabel : stage.improvedLabel}</span>
                    <span className="font-medium text-paper">{stage.format(value)}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/10">
                    <div className={cn("h-full rounded-full", column.key === "current" ? "bg-white/40" : "bg-glow")} style={{ width }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function OpportunityComparisonChart({ model }: { model: VisualModel }) {
  const maxValue = model.improvedRevenueMonthlyHigh;
  const currentWidth = `${Math.max((model.currentRevenueMonthly / maxValue) * 100, 18)}%`;
  const recoverableWidth = `${Math.max((model.recoverablePipeline / maxValue) * 100, 12)}%`;
  const pipelineLiftPercent = model.currentRevenueMonthly > 0 ? (model.recoverablePipeline / model.currentRevenueMonthly) * 100 : 0;
  const annualizedLow = model.recoveryPotentialLow * 12;
  const annualizedMid = model.recoverablePipeline * 12;
  const annualizedHigh = model.recoveryPotentialHigh * 12;

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cloud/60">Main visual</p>
          <h4 className="mt-2 font-display text-2xl font-bold text-paper">You May Be Leaving Pipeline on the Table</h4>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-cloud/72">
            Based on your inputs of {formatCompactNumber(model.traffic)} monthly visitors and a {formatPercent(model.conversionRate)} visitor-to-customer conversion rate.
          </p>
        </div>
        <div className="rounded-[20px] border border-glow/15 bg-glow/10 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-glow">Estimated Recoverable / Protected Revenue</p>
          <p className="mt-2 font-display text-3xl font-bold text-paper">
            {formatRoundedCompactCurrency(model.recoveryPotentialLow)}-{formatRoundedCompactCurrency(model.recoveryPotentialHigh)}
          </p>
          <p className="mt-2 text-sm text-cloud/68">Modeled midpoint {formatRoundedCompactCurrency(model.recoverablePipeline, 5000)}</p>
          <p className="mt-3 text-sm leading-6 text-cloud/72">
            Directional estimate based on your inputs and benchmark assumptions. Represents a 15-25% efficiency improvement from better identity, attribution, and CRM activation, without buying more traffic.
          </p>
        </div>
      </div>
      <div className="mt-6 grid gap-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-cloud/72">
            <span>Current visible value</span>
            <span className="font-medium text-paper">{formatCompactCurrency(model.currentRevenueMonthly)}</span>
          </div>
          <div className="h-12 overflow-hidden rounded-2xl bg-white/8">
            <div
              className="flex h-full items-center rounded-2xl bg-white/25 px-4 text-sm font-medium text-paper"
              style={{ width: currentWidth }}
            >
              {formatCompactCurrency(model.currentRevenueMonthly)}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-cloud/72">
            <span>With improved data visibility</span>
            <span className="font-medium text-paper">
              {formatRoundedCompactCurrency(model.improvedRevenueMonthlyLow)}-{formatRoundedCompactCurrency(model.improvedRevenueMonthlyHigh)}
            </span>
          </div>
          <div className="h-12 overflow-hidden rounded-2xl bg-white/8">
            <div className="flex h-full overflow-hidden rounded-2xl" style={{ width: "100%" }}>
              <div className="flex h-full items-center bg-white/20 px-4 text-sm font-medium text-paper" style={{ width: currentWidth }}>
                {formatCompactCurrency(model.currentRevenueMonthly)}
              </div>
              <div
                className="flex h-full items-center justify-end border-l border-white/20 bg-gradient-to-r from-glow to-[#9df4dd] px-4 text-sm font-semibold text-ink shadow-[0_0_20px_rgba(121,242,210,0.18)]"
                style={{ width: recoverableWidth }}
              >
                +{formatRoundedCompactCurrency(model.recoverablePipeline, 5000)}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cloud/55">Potential Pipeline Lift</p>
          <p className="mt-2 font-display text-3xl font-bold text-glow">
            {formatRoundedCompactCurrency(model.recoveryPotentialLow)}-{formatRoundedCompactCurrency(model.recoveryPotentialHigh)}
          </p>
          <p className="mt-2 text-sm font-medium text-cloud/72">+{pipelineLiftPercent.toFixed(1)}%</p>
          <p className="mt-3 text-sm text-cloud/65">From traffic you are already paying for.</p>
        </div>
        <div className="rounded-[20px] border border-white/10 bg-white/[0.02] p-4">
          <p className="text-sm leading-7 text-cloud/76">
            The difference between these two states is not new traffic — it&apos;s better use of traffic you already paid for.
          </p>
          <p className="mt-3 text-sm leading-7 text-cloud/62">Even small improvements in signal quality can compound across your funnel.</p>
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cloud/55">Annualized Impact</span>
            <span className="font-medium text-paper">
              {formatRangeCurrency(annualizedLow, annualizedHigh)} / year
            </span>
          </div>
          <p className="mt-3 text-sm leading-7 text-cloud/68">
            Modeled midpoint: ~{formatCompactCurrency(annualizedMid)} / year in recoverable / protected revenue
          </p>
        </div>
      </div>
      <p className="mt-5 text-sm leading-7 text-cloud/70">
        This estimate is based on improving how your existing traffic is identified and activated — not increasing traffic.
      </p>
      <p className="mt-3 text-sm leading-7 text-cloud/70">
        This is a directional estimate based on a few high-level inputs. The intro call is where we validate the model against your actual GA / CRM data and confirm if there is real 6-figure upside.
      </p>
      <div className="mt-4 space-y-1 text-xs leading-6 text-cloud/52">
        <p>Directional estimate based on your inputs and benchmark assumptions.</p>
        <p>Actual outcomes depend on traffic quality, conversion performance, and signal match rates.</p>
        <p>This represents one layer of recoverable value. Additional gains often exist in targeting efficiency, attribution, and CRM activation.</p>
      </div>
    </div>
  );
}

function OpportunityBreakdownChart({ model }: { model: VisualModel }) {
  const total = model.efficiencyGain + model.recoverablePipeline + model.estimatedSpend;
  const segments = [
    {
      label: "Conversion Efficiency Lift",
      value: model.efficiencyGain,
      className: "bg-amber",
      description: "Small gains from improved targeting, attribution, and data accuracy",
      confidence: "High confidence",
    },
    {
      label: "Reactivated Lost Pipeline",
      value: model.recoverablePipeline,
      className: "bg-glow",
      description: "Revenue from previously anonymous visitors who can now be identified and re-engaged",
      confidence: "Moderate confidence",
    },
    {
      label: "Uncaptured Traffic Potential (Theoretical)",
      value: model.estimatedSpend,
      className: "bg-white/35",
      description: "Estimated value if more anonymous traffic were converted into leads",
      confidence: "Theoretical / directional",
    },
  ];

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cloud/60">Where The Opportunity Exists</p>
      <div className="mt-5 overflow-hidden rounded-full bg-white/10">
        <div className="flex h-6">
          {segments.map((segment) => (
            <div key={segment.label} className={segment.className} style={{ width: `${(segment.value / total) * 100}%` }} />
          ))}
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {segments.map((segment) => (
          <div key={segment.label} className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 text-cloud/74">
                <span className={cn("mt-1 h-3 w-3 rounded-full", segment.className)} />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-paper">{segment.label}</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] uppercase tracking-[0.14em] text-cloud/55">
                      {segment.confidence}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-cloud/58">{segment.description}</p>
                </div>
              </div>
              <span className="pt-0.5 text-sm font-medium text-paper">{formatCompactCurrency(segment.value)}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm leading-7 text-cloud/66">
        Most companies capture only a fraction of the value already present in their traffic.
      </p>
    </div>
  );
}

function RecoverableRevenueModule({ model }: { model: VisualModel }) {
  const flow = [
    {
      label: "Anonymous visitors",
      value: `${formatCompactNumber(model.anonymousTraffic)} anonymous visitors`,
    },
    {
      label: "Matched profiles",
      value: `${formatCompactNumber(model.consumerMatches)} matched`,
      note: `${formatPercent(model.idResolutionMatchPct)} ID resolution match`,
    },
    {
      label: "Verified contacts",
      value: `${formatCompactNumber(model.verifiedMatchedProfiles)} verified`,
      note: `${formatPercent(model.verificationPct)} verification`,
    },
    {
      label: "Re-engaged leads",
      value: `${formatCompactNumber(model.recoveredLeads)} re-engaged leads`,
      note: `${formatPercent(model.reOptInPct)} re-opt-in`,
    },
    {
      label: "Additional sales",
      value: `${formatDetailedNumber(model.recoveredSales, 0)} additional sales`,
      note: `${formatPercent(model.reactivationSalesRate)} re-activation sales rate`,
    },
    {
      label: "Recovered revenue",
      value: `${formatCompactCurrency(model.recoveredRevenue)} recovered revenue`,
    },
  ];

  return (
    <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,27,42,0.96),rgba(11,18,31,1))] p-5 md:p-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-glow">Your Recoverable Revenue Opportunity</p>
        <h4 className="font-display text-3xl font-bold text-paper">A portion of your existing traffic is currently anonymous and underused.</h4>
        <p className="max-w-4xl text-sm leading-7 text-cloud/75">
          This model estimates how much of that traffic can be identified, re-engaged, and turned into additional revenue without increasing spend.
        </p>
        <p className="text-xs uppercase tracking-[0.18em] text-cloud/50">Directional estimate based on your current inputs and benchmark assumptions.</p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <div className="space-y-3">
            {flow.map((step, index) => (
              <div key={step.label}>
                <div className="flex items-center gap-4 rounded-[20px] border border-white/8 bg-white/[0.02] px-4 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/6 text-sm font-semibold text-paper">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium uppercase tracking-[0.16em] text-cloud/55">{step.label}</p>
                    <p className="mt-1 text-lg font-semibold text-paper">{step.value}</p>
                    {step.note ? <p className="mt-1 text-sm text-cloud/62">{step.note}</p> : null}
                  </div>
                </div>
                {index < flow.length - 1 ? <div className="ml-5 h-5 w-px bg-gradient-to-b from-glow/80 to-white/10" /> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-glow/20 bg-[linear-gradient(135deg,rgba(121,242,210,0.18),rgba(255,209,102,0.10))] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-glow">Estimated Recoverable Revenue</p>
            <p className="mt-4 font-display text-5xl font-bold text-paper">{formatCompactCurrency(model.recoveredRevenue)}</p>
            <p className="mt-3 text-sm leading-7 text-cloud/78">
              From traffic you have already paid for, but are not currently capturing at full value.
            </p>
            <p className="mt-3 text-sm leading-7 text-cloud/70">
              We validate this range live on the call before recommending a Revenue Recovery Audit.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cloud/60">Current Baseline</p>
            <div className="mt-4 grid gap-3">
              {[
                { label: "Sales", value: formatDetailedNumber(model.currentSales) },
                { label: "Revenue", value: formatDetailedCurrency(model.currentRevenue) },
                { label: "Estimated Spend", value: formatDetailedCurrency(model.estimatedSpend) },
              ].map((field) => (
                <div key={field.label} className="flex items-center justify-between gap-4 border-b border-white/8 pb-3 text-sm last:border-b-0 last:pb-0">
                  <span className="text-cloud/70">{field.label}</span>
                  <span className="font-medium text-paper">{field.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cloud/60">Traffic Loss Value</p>
            <p className="mt-3 font-display text-3xl font-bold text-glow">{formatDetailedCurrency(model.trafficLossValue)}</p>
            <p className="mt-3 text-sm leading-7 text-cloud/72">
              This represents the portion of your spend that drove visitors who did not convert or become usable data.
            </p>
            <p className="mt-2 text-sm leading-7 text-cloud/60">
              This traffic is not necessarily lost forever — it is often just unidentified and unactivated.
            </p>
          </div>

          <p className="text-xs leading-6 text-cloud/52">
            Actual outcomes depend on traffic quality, match quality, and conversion performance.
          </p>
        </div>
      </div>
    </div>
  );
}

function AnswersSummary({ answers }: { answers: QuizResponses }) {
  const answeredQuestions = quizQuestions
    .filter((question) => answers[question.id])
    .map((question) => {
      const selectedValue = answers[question.id];
      const selectedOption = question.options.find((option) => option.value === selectedValue);

      return {
        id: question.id,
        title: question.title,
        prompt: question.prompt,
        answer: selectedOption?.label ?? selectedValue,
      };
    });

  if (answeredQuestions.length === 0) return null;

  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Answer summary</p>
          <h3 className="font-display text-3xl font-bold text-paper">What answers generated this result</h3>
          <p className="max-w-3xl text-sm leading-7 text-cloud/72">
            This share view keeps the quiz responses attached to the result so the score can be reviewed later and shared with other stakeholders.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {answeredQuestions.map((item) => (
            <div key={item.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-glow">{item.title}</p>
              <p className="mt-3 text-sm leading-6 text-cloud/74">{item.prompt}</p>
              <p className="mt-4 text-base font-semibold leading-7 text-paper">{item.answer}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CPASignalChart() {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
      <svg viewBox="0 0 320 180" className="w-full" role="img" aria-label="CPA rising while signal quality falls">
        <line x1="24" y1="150" x2="300" y2="150" stroke="rgba(255,255,255,0.16)" />
        <line x1="24" y1="20" x2="24" y2="150" stroke="rgba(255,255,255,0.16)" />
        <path d="M36 128 C86 120 126 104 170 88 C210 70 252 50 292 34" fill="none" stroke="#f7c96d" strokeWidth="4" strokeLinecap="round" />
        <path d="M36 42 C82 56 126 72 170 88 C214 104 252 118 292 132" fill="none" stroke="#79f2d2" strokeWidth="4" strokeLinecap="round" />
        <text x="70" y="112" fill="#f7c96d" fontSize="12">CPA</text>
        <text x="224" y="144" fill="#dbe5f4" fontSize="12">Signal quality</text>
      </svg>
    </div>
  );
}
