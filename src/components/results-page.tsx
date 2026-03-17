"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, BarChart3, FileSpreadsheet, Link2, Mail, Share2, ShieldAlert, Target } from "lucide-react";
import { qualificationFields } from "@/config/quiz";
import { siteConfig } from "@/config/site";
import { trackEvent } from "@/lib/analytics";
import { estimateOpportunity } from "@/lib/opportunity";
import type { LeadProfile, OpportunityInputs, QuizResponses, ResultModel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const LOCAL_STORAGE_KEY = "bad-data-test-state";
const GHL_EMBED_ID = "303rv61ZkidkXmcEvLhz_1773702309411";

export function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<ResultModel | null>(null);
  const [qualification, setQualification] = useState<LeadProfile>({});
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
        qualification: LeadProfile;
        result?: ResultModel | null;
        opportunityInputs?: OpportunityInputs;
      };

      if (parsed.result) setResult(parsed.result);
      setQualification(parsed.qualification || {});
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

  function handleQualificationFieldChange(field: string, value: string) {
    setQualification((previous) => {
      const next = { ...previous, [field]: value };
      const saved = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, unknown>;
        window.localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify({
            ...parsed,
            qualification: next,
          }),
        );
      }
      return next;
    });
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
            onPrimary={() => window.open(siteConfig.bookingUrl, "_blank", "noopener,noreferrer")}
            onSecondary={() => window.open(siteConfig.bookingUrl, "_blank", "noopener,noreferrer")}
            onNativeShare={handleNativeShare}
            onEmailShare={handleEmailShare}
          />

          <Card className="border-glow/15 bg-gradient-to-r from-glow/10 via-white/[0.04] to-amber/10">
            <CardContent className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Recommended flow</p>
                <h2 className="font-display text-3xl font-bold text-paper">Clear next steps, based on the score you just saw</h2>
                <p className="max-w-2xl text-base leading-7 text-cloud/78">
                  If this result feels directionally right, the fastest path is to turn it into a diagnostic conversation. Share it internally first if needed, then book the audit intro call.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => window.open(siteConfig.bookingUrl, "_blank", "noopener,noreferrer")} size="lg">
                    Book the intro call
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" onClick={handleEmailShare} size="lg">
                    Email result to team
                  </Button>
                </div>
              </div>
              <div className="grid gap-3">
                {[
                  "1. Review the score and findings with your growth team",
                  "2. Use the estimate as a directional business case, not fake precision",
                  "3. Book the Revenue Recovery Audit intro call if the gaps feel commercially material",
                ].map((step) => (
                  <div key={step} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-cloud/78">
                    {step}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Opportunity estimate</p>
                  <h3 className="mt-2 font-display text-3xl font-bold text-paper">A conservative view of what hidden signal loss may be costing</h3>
                </div>
                <p className="max-w-xl text-sm leading-6 text-cloud/65">
                  Directional only. If numbers are missing, benchmark estimates are used to avoid false precision.
                </p>
              </div>
              <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <MetricInput label="Monthly traffic" value={opportunityInputs.monthlyTraffic} onChange={(value) => handleOpportunityChange("monthlyTraffic", value)} />
                  <MetricInput label="CPA" value={opportunityInputs.cpa} onChange={(value) => handleOpportunityChange("cpa", value)} />
                  <MetricInput label="Lead-to-close rate %" value={opportunityInputs.leadToCloseRate} onChange={(value) => handleOpportunityChange("leadToCloseRate", value)} />
                  <MetricInput label="Average deal value" value={opportunityInputs.averageDealValue} onChange={(value) => handleOpportunityChange("averageDealValue", value)} />
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-3">
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

          <Card>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Final profiling</p>
                <h3 className="mt-2 font-display text-3xl font-bold text-paper">Make the recommendation more specific</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {qualificationFields.map((field) => (
                  <div key={field.id}>
                    <label className="mb-2 block text-sm font-medium text-cloud/80" htmlFor={field.id}>
                      {field.label}
                    </label>
                    {field.type === "select" ? (
                      <Select id={field.id} value={qualification[field.id] || ""} onChange={(event) => handleQualificationFieldChange(field.id, event.target.value)}>
                        <option value="">Select</option>
                        {field.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        id={field.id}
                        type={field.type}
                        placeholder={field.placeholder}
                        value={qualification[field.id] || ""}
                        onChange={(event) => handleQualificationFieldChange(field.id, event.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => window.open(siteConfig.bookingUrl, "_blank", "noopener,noreferrer")}>Book a 20-Minute Intro Call</Button>
                <Button variant="secondary" onClick={() => window.open(siteConfig.bookingUrl, "_blank", "noopener,noreferrer")}>
                  Request Revenue Recovery Audit Information
                </Button>
                <p className="text-sm text-cloud/60">
                  Submission status: <span className="font-medium text-paper">{submissionState === "submitted" ? "captured" : submissionState}</span>
                </p>
              </div>
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
  onPrimary,
  onSecondary,
  onNativeShare,
  onEmailShare,
}: {
  result: ResultModel;
  onPrimary: () => void;
  onSecondary: () => void;
  onNativeShare: () => void;
  onEmailShare: () => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <Card className="overflow-hidden border-glow/15 bg-[radial-gradient(circle_at_top_left,rgba(121,242,210,0.12),transparent_28%),linear-gradient(160deg,rgba(12,23,40,0.96),rgba(7,14,25,1))]">
        <CardContent className="space-y-6 p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Audit path</p>
              <h2 className="mt-2 font-display text-4xl font-bold text-paper md:text-5xl">This result likely warrants a deeper audit conversation</h2>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-cloud/75">{result.label}</div>
          </div>
          <div className="grid gap-4 md:grid-cols-[0.6fr_1.4fr]">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
              <p className="text-sm font-medium text-cloud/65">Score</p>
              <p className="mt-3 font-display text-6xl font-bold text-paper">{result.score}</p>
              <p className="mt-2 text-sm text-cloud/68">{result.qualification}</p>
            </div>
            <div className="rounded-[24px] border border-amber/12 bg-amber/10 p-5">
              <p className="text-sm font-medium text-cloud/70">Recommended next step</p>
              <p className="mt-3 text-base leading-7 text-cloud/82">{result.recommendedNextStep}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button size="lg" onClick={onPrimary}>
                  Book a 20-Minute Intro Call
                </Button>
                <Button size="lg" variant="secondary" onClick={onSecondary}>
                  Request audit details
                </Button>
              </div>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {result.findings.slice(0, 3).map((finding) => (
              <div key={finding} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <ShieldAlert className="h-5 w-5 text-glow" />
                <p className="mt-3 text-sm leading-6 text-cloud/78">{finding}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="overflow-hidden border-white/10 bg-white/[0.04]">
        <CardContent className="space-y-5 p-6 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Internal sharing</p>
          <h3 className="font-display text-3xl font-bold text-paper">Get alignment before the call, if needed</h3>
          <p className="text-base leading-7 text-cloud/76">
            This version is built around a simple conversion sequence: review the score, share it internally, then decide whether the audit call should happen now.
          </p>
          <div className="grid gap-3">
            <Button variant="secondary" onClick={onNativeShare}>
              <Share2 className="h-4 w-4" />
              Share score
            </Button>
            <Button variant="outline" onClick={onEmailShare}>
              <Mail className="h-4 w-4" />
              Email result
            </Button>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm font-medium text-cloud/65">Why it converts</p>
            <p className="mt-3 text-sm leading-7 text-cloud/76">
              The page frames the score like a business case, gives the team a clear internal-share action, and keeps the booking CTA in the primary decision path.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
