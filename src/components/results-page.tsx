"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, BarChart3, FileSpreadsheet, Link2, Mail, Share2, ShieldAlert, Target } from "lucide-react";
import { siteConfig } from "@/config/site";
import { trackEvent } from "@/lib/analytics";
import { estimateOpportunity } from "@/lib/opportunity";
import type { OpportunityInputs, QuizResponses, ResultModel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const LOCAL_STORAGE_KEY = "bad-data-test-state";
const GHL_EMBED_ID = "303rv61ZkidkXmcEvLhz_1773702309411";

export function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<ResultModel | null>(null);
  const [opportunityInputs, setOpportunityInputs] = useState<OpportunityInputs>({
    monthlyTraffic: 15000,
    cpa: 180,
    leadToCloseRate: 12,
    averageDealValue: 18000,
  });
  const [copied, setCopied] = useState(false);
  const [submissionState, setSubmissionState] = useState<"idle" | "submitting" | "submitted" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  const estimate = useMemo(() => estimateOpportunity(opportunityInputs), [opportunityInputs]);
  const shareUrl = `${siteConfig.siteUrl}/results`;
  const shareMessage = result
    ? `We scored ${result.score}/100 on The Bad Data Test (${result.label}). Worth a look if we're serious about attribution, anonymous traffic, and recoverable pipeline.`
    : "We took The Bad Data Test. Worth a look if we're serious about attribution, anonymous traffic, and recoverable pipeline.";

  useEffect(() => {
    const saved = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as {
        answers: QuizResponses;
        result?: ResultModel | null;
        opportunityInputs?: OpportunityInputs;
      };

      if (parsed.result) setResult(parsed.result);
      if (parsed.opportunityInputs) setOpportunityInputs(parsed.opportunityInputs);
      setSubmissionState(parsed.result ? "submitted" : "idle");
    } catch {
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!result) return;
    trackEvent("result_viewed", {
      score: result.score,
      qualification: result.qualification,
      route: result.routeVariant,
      page: "dedicated-results",
    });
  }, [result]);

  function handleShare() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    trackEvent("share_clicked", { type: "copy-link", page: "results" });
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function handleNativeShare() {
    if (!result) return;

    const payload = {
      title: `Bad Data Score: ${result.score}/100`,
      text: shareMessage,
      url: shareUrl,
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

    await navigator.clipboard.writeText(`${shareMessage} ${shareUrl}`);
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

  function handleEmailShare() {
    trackEvent("share_clicked", { type: "email-team", page: "results" });
    const subject = encodeURIComponent(
      result ? `We scored ${result.score}/100 on The Bad Data Test` : "We should review this Bad Data Test result",
    );
    const body = encodeURIComponent(
      `${shareMessage}\n\nSee the diagnostic here: ${shareUrl}`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  function handleSocialShare(platform: "linkedin" | "x") {
    const encodedUrl = encodeURIComponent(shareUrl);
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

  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30" aria-hidden />
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-24 pt-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Completion page</p>
            <h1 className="mt-2 font-display text-4xl font-bold text-paper md:text-5xl">Your Bad Data Test results</h1>
          </div>
          <Link href="/" className="text-sm font-medium text-cloud/68 underline decoration-white/20 underline-offset-4">
            Back to the landing page
          </Link>
        </div>

        <div className="space-y-10">
          <ResultsHeroVariant
            result={result}
            visualModel={visualModel}
            onPrimary={() => window.open(siteConfig.bookingUrl, "_blank", "noopener,noreferrer")}
            onSecondary={() => window.open(siteConfig.bookingUrl, "_blank", "noopener,noreferrer")}
            onNativeShare={handleNativeShare}
            onEmailShare={handleEmailShare}
          />

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Funnel leak view</p>
                  <h3 className="font-display text-3xl font-bold text-paper">Where Your Funnel Is Likely Leaking Value</h3>
                  <p className="max-w-3xl text-base leading-7 text-cloud/74">
                    You may not need more traffic. You may need better signal quality.
                  </p>
                </div>
                <FunnelLeakVisualization model={visualModel} />
                <p className="text-sm leading-7 text-cloud/65">
                  This is not about getting more traffic. It is about capturing more value from the traffic you already have.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Fragmentation</p>
                  <h3 className="font-display text-3xl font-bold text-paper">How Fragmentation Hides Revenue Opportunity</h3>
                  <p className="text-base leading-7 text-cloud/74">
                    When key signals are split across disconnected systems, budget decisions become less reliable.
                  </p>
                </div>
                <FragmentationMap />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardContent className="space-y-5">
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

            <Card>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Key findings</p>
                  <h3 className="font-display text-3xl font-bold text-paper">What is creating the hidden revenue inefficiency</h3>
                </div>
                <div className="grid gap-3">
                  {result.findings.map((finding) => (
                    <div key={finding} className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <ShieldAlert className="mt-0.5 h-5 w-5 text-glow" />
                      <p className="text-sm leading-6 text-cloud/80">{finding}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card id="opportunity">
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Opportunity estimate</p>
                  <h3 className="mt-2 font-display text-3xl font-bold text-paper">What Your Pipeline Could Look Like With Better Data</h3>
                </div>
                <p className="max-w-xl text-sm leading-6 text-cloud/65">
                  This estimate is directional, but it highlights why incomplete data can create meaningful financial drag.
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-4">
                <MetricInput label="Monthly traffic" value={opportunityInputs.monthlyTraffic} onChange={(value) => handleOpportunityChange("monthlyTraffic", value)} />
                <MetricInput label="CPA" value={opportunityInputs.cpa} onChange={(value) => handleOpportunityChange("cpa", value)} />
                <MetricInput label="Lead-to-close rate %" value={opportunityInputs.leadToCloseRate} onChange={(value) => handleOpportunityChange("leadToCloseRate", value)} />
                <MetricInput label="Average deal value" value={opportunityInputs.averageDealValue} onChange={(value) => handleOpportunityChange("averageDealValue", value)} />
              </div>
              <div className="grid gap-6">
                <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
                  <OpportunityComparisonChart model={visualModel} />
                  <OpportunityBreakdownChart model={visualModel} />
                </div>
                <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                  <IdentificationLiftChart model={visualModel} />
                  <div className="grid gap-4">
                    <div className="grid gap-4">
                      <MetricCard label="Estimated wasted ad spend" value={estimate.wastedSpendRange} />
                      <MetricCard label="Potential recoverable pipeline" value={estimate.recoverablePipelineRange} />
                      <MetricCard label="Anonymous traffic upside" value={estimate.anonymousTrafficUpside} compact />
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-5">
                      <p className="text-sm font-medium text-cloud/70">Assumptions</p>
                      {isPending ? <p className="mt-2 text-sm text-glow">Updating estimate...</p> : null}
                      <div className="mt-3 grid gap-2">
                        {estimate.assumptions.map((assumption) => (
                          <p key={assumption} className="text-sm text-cloud/65">
                            {assumption}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-glow/15 bg-gradient-to-r from-glow/10 via-white/[0.04] to-amber/10">
            <CardContent className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Next step</p>
                <h3 className="font-display text-3xl font-bold text-paper">Find the Revenue You’re Already Paying For</h3>
                <p className="max-w-2xl text-base leading-7 text-cloud/78">
                  If these visuals directionally match your reality, the next step is a Revenue Recovery Audit to validate where signal is being lost and how much upside may be recoverable.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                <Button size="lg" onClick={() => window.open(siteConfig.bookingUrl, "_blank", "noopener,noreferrer")}>
                  See If You Qualify for a Revenue Recovery Audit
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => document.getElementById("opportunity")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                >
                  Review Your Revenue Leak Opportunity
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Team-ready sharing</p>
                  <h3 className="mt-2 font-display text-3xl font-bold text-paper">Send this to your growth team</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={handleShare}>
                    <Link2 className="h-4 w-4" />
                    {copied ? "Link copied" : "Copy share link"}
                  </Button>
                  <Button variant="outline" onClick={handleEmailShare}>
                    <Mail className="h-4 w-4" />
                    Email to colleague
                  </Button>
                  <Button variant="outline" onClick={() => handleSocialShare("linkedin")}>
                    Share on LinkedIn
                  </Button>
                  <Button variant="outline" onClick={() => handleSocialShare("x")}>
                    Share on X
                  </Button>
                </div>
              </div>
              <p className="text-base leading-7 text-cloud/75">
                If your demand gen lead, growth lead, and RevOps owner all answer this differently, that is useful signal. Share it and compare assumptions.
              </p>
            </CardContent>
          </Card>

          <section id="booking">
            <Card className="border-glow/15 bg-gradient-to-br from-glow/10 via-white/[0.04] to-amber/10">
              <CardContent className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
                <div className="space-y-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Book your next step</p>
                  <h2 className="font-display text-4xl font-bold text-paper md:text-5xl">Move from suspicion to diagnosis</h2>
                  <p className="max-w-2xl text-base leading-8 text-cloud/80 md:text-lg">
                    If the score feels directionally right, use this call to pressure-test whether a Revenue Recovery Audit is the right next step.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button size="lg" onClick={() => window.open(siteConfig.bookingUrl, "_blank", "noopener,noreferrer")}>
                      Book a 20-Minute Intro Call
                    </Button>
                    <Button variant="secondary" size="lg" onClick={handleEmailShare}>
                      Share the Test With Your Team
                    </Button>
                  </div>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-ink/70 p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cloud/60">Book an intro call with our team</p>
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
}: {
  label: string;
  value?: number;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-cloud/80">{label}</label>
      <Input inputMode="numeric" value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function ResultsHeroVariant({
  result,
  visualModel,
  onPrimary,
  onSecondary,
  onNativeShare,
  onEmailShare,
}: {
  result: ResultModel;
  visualModel: VisualModel;
  onPrimary: () => void;
  onSecondary: () => void;
  onNativeShare: () => void;
  onEmailShare: () => void;
}) {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-glow/15 bg-[radial-gradient(circle_at_top_left,rgba(121,242,210,0.12),transparent_28%),linear-gradient(160deg,rgba(12,23,40,0.96),rgba(7,14,25,1))]">
        <CardContent className="space-y-6 p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Audit path</p>
              <h2 className="mt-2 font-display text-4xl font-bold text-paper md:text-5xl">This result likely warrants a deeper audit conversation</h2>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-cloud/75">{result.label}</div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <DataConfidenceGauge model={visualModel} />
            <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(121,242,210,0.10),rgba(255,255,255,0.04))] p-5 md:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Recommended flow</p>
              <h3 className="mt-4 font-display text-3xl font-bold text-paper">Clear next steps, based on the score you just saw</h3>
              <p className="mt-4 max-w-2xl text-base leading-8 text-cloud/80">
                If this result feels directionally right, the fastest path is to turn it into a diagnostic conversation. Share it internally first if needed, then book the audit intro call.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button size="lg" onClick={onPrimary}>
                  Book the intro call
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="secondary" onClick={onEmailShare}>
                  Email result to team
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {result.findings.map((finding) => (
              <div key={finding} className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose" />
                <p className="text-sm leading-6 text-cloud/78">{finding}</p>
              </div>
            ))}
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
  currentLeads: number;
  improvedLeads: number;
  currentPipeline: number;
  improvedPipeline: number;
  recoverablePipeline: number;
  efficiencyGain: number;
  anonymousTrafficUpside: number;
  wastedSpend: number;
  liftScenarios: { label: string; value: number }[];
};

function buildVisualModel(result: ResultModel, inputs: OpportunityInputs): VisualModel {
  const traffic = inputs.monthlyTraffic || 15000;
  const cpa = inputs.cpa || 180;
  const closeRate = (inputs.leadToCloseRate || 12) / 100;
  const averageDeal = inputs.averageDealValue || 18000;

  const leakFactor = 0.18 + (result.score / 100) * 0.22;
  const confidenceScore = Math.max(0, Math.min(100, 100 - result.score));
  const currentLeadRate = 0.012;
  const improvedLeadRate = currentLeadRate * (1 + leakFactor);
  const currentLeads = Math.round(traffic * currentLeadRate);
  const improvedLeads = Math.round(traffic * improvedLeadRate);
  const currentPipeline = currentLeads * closeRate * averageDeal;
  const improvedPipeline = improvedLeads * closeRate * averageDeal;
  const recoverablePipeline = Math.max(improvedPipeline - currentPipeline, averageDeal * 0.8);
  const efficiencyGain = recoverablePipeline * 0.28;
  const anonymousTrafficUpside = recoverablePipeline * 0.24;
  const wastedSpend = cpa * Math.max(improvedLeads - currentLeads, 1);

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
    currentLeads,
    improvedLeads,
    currentPipeline,
    improvedPipeline,
    recoverablePipeline,
    efficiencyGain,
    anonymousTrafficUpside,
    wastedSpend,
    liftScenarios: [
      { label: "20% identification lift", value: recoverablePipeline * 0.55 },
      { label: "30% identification lift", value: recoverablePipeline * 0.78 },
      { label: "40% identification lift", value: recoverablePipeline },
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

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
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
  const stages = [
    { label: "Traffic", current: model.traffic, improved: model.traffic, format: formatCompactNumber },
    { label: "Leads", current: model.currentLeads, improved: model.improvedLeads, format: formatCompactNumber },
    { label: "Pipeline", current: model.currentPipeline, improved: model.improvedPipeline, format: formatCompactCurrency },
  ];

  const maxValue = Math.max(...stages.flatMap((stage) => [stage.current, stage.improved]));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[
        { title: "Current state", key: "current" as const, tone: "bg-white/[0.03]" },
        { title: "With stronger data visibility", key: "improved" as const, tone: "bg-glow/8" },
      ].map((column) => (
        <div key={column.title} className={cn("rounded-[24px] border border-white/10 p-5", column.tone)}>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cloud/60">{column.title}</p>
          <div className="mt-5 space-y-4">
            {stages.map((stage) => {
              const value = column.key === "current" ? stage.current : stage.improved;
              const width = `${Math.max((value / maxValue) * 100, 14)}%`;
              return (
                <div key={`${column.title}-${stage.label}`} className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-cloud/72">
                    <span>{stage.label}</span>
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
  const maxValue = Math.max(model.currentPipeline, model.improvedPipeline);
  const bars = [
    { label: "Current visible value", value: model.currentPipeline, color: "bg-white/35" },
    { label: "Estimated recoverable value", value: model.recoverablePipeline, color: "bg-glow" },
  ];

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cloud/60">Main visual</p>
      <h4 className="mt-2 font-display text-2xl font-bold text-paper">What Your Pipeline Could Look Like With Better Data</h4>
      <div className="mt-6 grid gap-4">
        {bars.map((bar) => (
          <div key={bar.label} className="space-y-2">
            <div className="flex items-center justify-between text-sm text-cloud/72">
              <span>{bar.label}</span>
              <span className="font-medium text-paper">{formatCompactCurrency(bar.value)}</span>
            </div>
            <div className="h-12 overflow-hidden rounded-2xl bg-white/8">
              <div className={cn("flex h-full items-center rounded-2xl px-4 text-sm font-medium text-ink", bar.color)} style={{ width: `${Math.max((bar.value / maxValue) * 100, 18)}%` }}>
                {formatCompactCurrency(bar.value)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OpportunityBreakdownChart({ model }: { model: VisualModel }) {
  const total = model.efficiencyGain + model.recoverablePipeline + model.anonymousTrafficUpside;
  const segments = [
    { label: "Efficiency gain", value: model.efficiencyGain, className: "bg-amber" },
    { label: "Recoverable pipeline", value: model.recoverablePipeline, className: "bg-glow" },
    { label: "Anonymous traffic upside", value: model.anonymousTrafficUpside, className: "bg-white/55" },
  ];

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cloud/60">Where the Opportunity Likely Exists</p>
      <div className="mt-5 overflow-hidden rounded-full bg-white/10">
        <div className="flex h-6">
          {segments.map((segment) => (
            <div key={segment.label} className={segment.className} style={{ width: `${(segment.value / total) * 100}%` }} />
          ))}
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3 text-cloud/74">
              <span className={cn("h-3 w-3 rounded-full", segment.className)} />
              <span>{segment.label}</span>
            </div>
            <span className="font-medium text-paper">{formatCompactCurrency(segment.value)}</span>
          </div>
        ))}
      </div>
    </div>
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
        <text x="36" y="28" fill="#f5f7fb" fontSize="12">CPA</text>
        <text x="228" y="126" fill="#dbe5f4" fontSize="12">Signal quality</text>
      </svg>
    </div>
  );
}

function FragmentationMap() {
  const nodes = [
    { label: "CRM", x: 24, y: 24 },
    { label: "Ad Platforms", x: 210, y: 24 },
    { label: "Analytics", x: 24, y: 120 },
    { label: "Site / Visitor Data", x: 180, y: 120 },
  ];

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
      <svg viewBox="0 0 340 220" className="w-full" role="img" aria-label="Fragmented systems with weak connections">
        <line x1="94" y1="54" x2="210" y2="54" stroke="rgba(255,255,255,0.22)" strokeDasharray="6 8" />
        <line x1="74" y1="84" x2="74" y2="120" stroke="rgba(255,255,255,0.16)" strokeDasharray="6 8" />
        <line x1="260" y1="84" x2="250" y2="120" stroke="rgba(255,255,255,0.16)" strokeDasharray="6 8" />
        <line x1="100" y1="150" x2="180" y2="150" stroke="rgba(255,255,255,0.22)" strokeDasharray="6 8" />
        {nodes.map((node) => (
          <g key={node.label}>
            <rect x={node.x} y={node.y} width="110" height="58" rx="18" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.16)" />
            <text x={node.x + 55} y={node.y + 33} textAnchor="middle" fill="#f5f7fb" fontSize="13">
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function IdentificationLiftChart({ model }: { model: VisualModel }) {
  const maxValue = Math.max(...model.liftScenarios.map((item) => item.value));

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cloud/60">Even Small Gains in Identification Can Have Outsized Impact</p>
      <div className="mt-5 space-y-4">
        {model.liftScenarios.map((scenario) => (
          <div key={scenario.label} className="space-y-2">
            <div className="flex items-center justify-between text-sm text-cloud/74">
              <span>{scenario.label}</span>
              <span className="font-medium text-paper">{formatCompactCurrency(scenario.value)}</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-glow to-amber" style={{ width: `${(scenario.value / maxValue) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm leading-7 text-cloud/65">
        The upside often comes from incremental gains that compound across targeting, attribution, and conversion.
      </p>
    </div>
  );
}
