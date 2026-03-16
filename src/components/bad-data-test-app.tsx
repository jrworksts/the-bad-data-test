"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  Clipboard,
  Link2,
  Mail,
  MoveRight,
  ShieldCheck,
  Target,
} from "lucide-react";
import { leadGateAfterQuestion, leadGateFields, qualificationFields, quizQuestions } from "@/config/quiz";
import { faqItems, primaryCtas, proofStats, siteConfig, stackLayers } from "@/config/site";
import { trackEvent } from "@/lib/analytics";
import { estimateOpportunity } from "@/lib/opportunity";
import { buildResultModel } from "@/lib/scoring";
import type { LeadProfile, OpportunityInputs, QuizResponses, ResultModel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";

const LOCAL_STORAGE_KEY = "bad-data-test-state";
const GHL_EMBED_ID = "303rv61ZkidkXmcEvLhz_1773702309411";

type FunnelStage = "landing" | "quiz" | "result";

const initialOpportunityInputs: OpportunityInputs = {
  monthlyTraffic: 15000,
  cpa: 180,
  leadToCloseRate: 12,
  averageDealValue: 18000,
};

export function BadDataTestApp() {
  const [stage, setStage] = useState<FunnelStage>("landing");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizResponses>({});
  const [lead, setLead] = useState<LeadProfile>({});
  const [qualification, setQualification] = useState<LeadProfile>({});
  const [showLeadGate, setShowLeadGate] = useState(false);
  const [leadGateSubmitted, setLeadGateSubmitted] = useState(false);
  const [result, setResult] = useState<ResultModel | null>(null);
  const [copied, setCopied] = useState(false);
  const [opportunityInputs, setOpportunityInputs] = useState<OpportunityInputs>(initialOpportunityInputs);
  const [submissionState, setSubmissionState] = useState<"idle" | "submitting" | "submitted" | "error">("idle");
  const [isPending, startTransition] = useTransition();
  const quizRef = useRef<HTMLDivElement | null>(null);

  const currentQuestion = quizQuestions[currentIndex];
  const progress = Math.round(((currentIndex + 1) / quizQuestions.length) * 100);
  const estimate = useMemo(() => estimateOpportunity(opportunityInputs), [opportunityInputs]);

  useEffect(() => {
    trackEvent("landing_viewed");

    const saved = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as {
        stage: FunnelStage;
        currentIndex: number;
        answers: QuizResponses;
        lead: LeadProfile;
        qualification: LeadProfile;
        leadGateSubmitted: boolean;
      };

      setStage(parsed.stage || "landing");
      setCurrentIndex(parsed.currentIndex || 0);
      setAnswers(parsed.answers || {});
      setLead(parsed.lead || {});
      setQualification(parsed.qualification || {});
      setLeadGateSubmitted(parsed.leadGateSubmitted || false);
    } catch {
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        stage,
        currentIndex,
        answers,
        lead,
        qualification,
        leadGateSubmitted,
      }),
    );
  }, [answers, currentIndex, lead, leadGateSubmitted, qualification, stage]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (stage === "quiz" && Object.keys(answers).length > 0 && !result) {
        trackEvent("quiz_abandoned", { answered: Object.keys(answers).length });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [answers, result, stage]);

  useEffect(() => {
    if (result) {
      trackEvent("result_viewed", {
        score: result.score,
        qualification: result.qualification,
        route: result.routeVariant,
      });
    }
  }, [result]);

  useEffect(() => {
    if (!result) return;

    const refreshed = buildResultModel(answers, lead, qualification);
    if (
      refreshed.score !== result.score ||
      refreshed.qualification !== result.qualification ||
      refreshed.routeVariant !== result.routeVariant
    ) {
      setResult(refreshed);
    }
  }, [answers, lead, qualification, result]);

  function startQuiz() {
    setStage("quiz");
    quizRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    trackEvent("quiz_started");
  }

  function handleAnswer(questionId: string, value: string) {
    const nextAnswers = { ...answers, [questionId]: value };
    setAnswers(nextAnswers);
    trackEvent("question_answered", { questionId, value, index: currentIndex + 1 });

    const shouldGate = currentIndex + 1 === leadGateAfterQuestion && !leadGateSubmitted;
    if (shouldGate) {
      setShowLeadGate(true);
      trackEvent("lead_gate_viewed");
      return;
    }

    if (currentIndex < quizQuestions.length - 1) {
      setCurrentIndex((value) => value + 1);
      return;
    }

    finishQuiz(nextAnswers);
  }

  function finishQuiz(finalAnswers: QuizResponses) {
    const built = buildResultModel(finalAnswers, lead, qualification);
    setResult(built);
    setStage("result");
    setShowLeadGate(false);
    void submitLeadPayload(built, finalAnswers);
  }

  async function submitLeadPayload(finalResult: ResultModel, finalAnswers: QuizResponses) {
    setSubmissionState("submitting");

    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lead,
          qualification,
          answers: finalAnswers,
          result: finalResult,
          opportunity: opportunityInputs,
          submittedAt: new Date().toISOString(),
          source: "bad-data-test",
        }),
      });

      if (!response.ok) throw new Error("Submission failed");
      setSubmissionState("submitted");
    } catch {
      setSubmissionState("error");
    }
  }

  function handleLeadFieldChange(field: string, value: string) {
    setLead((previous) => ({ ...previous, [field]: value }));
  }

  function handleQualificationFieldChange(field: string, value: string) {
    setQualification((previous) => ({ ...previous, [field]: value }));
  }

  function submitLeadGate() {
    const missing = leadGateFields.some((field) => field.required && !lead[field.id]?.trim());
    if (missing) return;

    setLeadGateSubmitted(true);
    setShowLeadGate(false);
    trackEvent("lead_gate_completed");

    if (currentIndex < quizQuestions.length - 1) {
      setCurrentIndex((value) => value + 1);
      return;
    }

    finishQuiz(answers);
  }

  function goBack() {
    if (showLeadGate) {
      setShowLeadGate(false);
      return;
    }

    setCurrentIndex((value) => Math.max(value - 1, 0));
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    trackEvent("share_clicked", { type: "copy-link" });
    window.setTimeout(() => setCopied(false), 1600);
  }

  function handleCtaClick(label: string, href: string) {
    trackEvent("cta_clicked", { label, href, stage });
    if (href === "#quiz") {
      startQuiz();
      return;
    }

    document.querySelector(href)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleOpportunityChange(field: keyof OpportunityInputs, value: string) {
    startTransition(() => {
      setOpportunityInputs((previous) => ({
        ...previous,
        [field]: value ? Number(value) : undefined,
      }));
      trackEvent("opportunity_estimated", { field, value: value ? Number(value) : 0 });
    });
  }

  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30" aria-hidden />
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-24 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-40 -mx-4 border-b border-white/8 bg-ink/70 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <a href="#" className="font-display text-lg font-bold tracking-tight text-paper">
              The Bad Data Test
            </a>
            <div className="hidden items-center gap-3 md:flex">
              {primaryCtas.slice(0, 2).map((cta) => (
                <Button
                  key={cta.id}
                  variant={cta.variant || "primary"}
                  size="sm"
                  onClick={() => handleCtaClick(cta.label, cta.href)}
                >
                  {cta.label}
                </Button>
              ))}
            </div>
          </div>
        </header>

        <section className="relative pt-12 md:pt-20">
          <div className="grid items-start gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-8">
              <div className="inline-flex items-center rounded-full border border-glow/20 bg-glow/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-glow">
                {siteConfig.hero.badge}
              </div>
              <div className="space-y-5">
                <h1 className="max-w-4xl font-display text-5xl font-bold leading-[0.96] tracking-tight text-balance text-paper md:text-7xl">
                  {siteConfig.hero.headline}
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-cloud/80 md:text-xl">
                  {siteConfig.hero.subhead}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Button size="lg" onClick={() => handleCtaClick("Take the Test", "#quiz")}>
                  Take the Test
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="lg" onClick={() => handleCtaClick("See How It Works", "#framework")}>
                  See How It Works
                </Button>
                <p className="text-sm text-cloud/70">2-minute diagnostic. Most teams cannot answer every question confidently.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {proofStats.map((stat) => (
                  <Card key={stat.value} className="border-white/8 bg-white/[0.03]">
                    <CardContent className="space-y-2">
                      <p className="font-display text-3xl font-bold text-paper">{stat.value}</p>
                      <p className="text-sm leading-6 text-cloud/70">{stat.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cloud/50">Trusted signal placeholders</p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {siteConfig.trustLogos.map((logo) => (
                    <div
                      key={logo}
                      className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-5 text-center text-sm text-cloud/60"
                    >
                      {logo}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Card className="overflow-hidden border-glow/15 bg-slate/80">
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Diagnostic preview</p>
                    <h2 className="mt-2 font-display text-3xl font-bold text-paper">The Bad Data Test</h2>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-cloud/70">
                    Sharp by design
                  </div>
                </div>
                <div className="space-y-4 rounded-[24px] border border-white/10 bg-ink/60 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cloud/60">What it surfaces</p>
                  <div className="space-y-3">
                    {[
                      "How much traffic is staying anonymous",
                      "Whether attribution confidence is misleading you",
                      "Where CRM signal is being wasted in paid media",
                      "How fragmented systems may be hiding pipeline",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-glow" />
                        <p className="text-sm leading-6 text-cloud/78">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[24px] border border-amber/15 bg-amber/10 p-5">
                  <p className="text-sm leading-6 text-cloud/80">{siteConfig.hero.kicker}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="quiz" ref={quizRef} className="pt-20 md:pt-28">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.26em] text-glow">Diagnostic</p>
              <h2 className="font-display text-4xl font-bold tracking-tight text-paper md:text-5xl">The Bad Data Test</h2>
              <p className="max-w-3xl text-base leading-7 text-cloud/75 md:text-lg">
                Most marketing systems look healthy on the surface, but hidden gaps in data infrastructure often cause companies to lose 20-40% of potential revenue. Answer the questions below to see if there may be hidden leaks in your marketing data.
              </p>
            </div>
            <Button variant="outline" onClick={startQuiz}>
              {stage === "landing" ? "Start Diagnostic" : "Resume Diagnostic"}
            </Button>
          </div>

          <Card className="overflow-hidden">
            <CardContent className="space-y-8 p-5 md:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-cloud/65">
                    Step {Math.min(currentIndex + 1, quizQuestions.length)} of {quizQuestions.length}
                  </p>
                  <p className="mt-1 text-sm text-cloud/55">Fast, keyboard-friendly, and built for your growth team.</p>
                </div>
                <div className="md:max-w-sm md:flex-1">
                  <Progress value={stage === "result" ? 100 : progress} />
                </div>
              </div>

              {stage !== "result" ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={showLeadGate ? "lead-gate" : currentQuestion.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -18 }}
                    transition={{ duration: 0.22 }}
                    className="space-y-6"
                  >
                    {showLeadGate ? (
                      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
                        <div className="space-y-4">
                          <div className="inline-flex rounded-full border border-glow/20 bg-glow/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-glow">
                            Earned gate
                          </div>
                          <h3 className="font-display text-3xl font-bold text-paper">Want your score and recovery potential?</h3>
                          <p className="text-base leading-7 text-cloud/75">
                            Share a little context and we will make your result more useful. This helps us translate the diagnostic into something commercially relevant, not generic.
                          </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          {leadGateFields.map((field) => (
                            <div key={field.id} className={cn(field.id === "websiteUrl" && "sm:col-span-2")}>
                              <label className="mb-2 block text-sm font-medium text-cloud/80" htmlFor={field.id}>
                                {field.label}
                              </label>
                              <Input
                                id={field.id}
                                type={field.type}
                                placeholder={field.placeholder}
                                value={lead[field.id] || ""}
                                onChange={(event) => handleLeadFieldChange(field.id, event.target.value)}
                              />
                            </div>
                          ))}
                          <div className="sm:col-span-2 flex flex-wrap gap-3 pt-2">
                            <Button onClick={submitLeadGate}>
                              Get My Score
                              <MoveRight className="h-4 w-4" />
                            </Button>
                            <Button variant="secondary" onClick={() => setShowLeadGate(false)}>
                              Continue without leaving
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        <div className="space-y-3">
                          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-glow">{currentQuestion.title}</p>
                          <h3 className="max-w-3xl font-display text-3xl font-bold tracking-tight text-paper md:text-4xl">
                            {currentQuestion.prompt}
                          </h3>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          {currentQuestion.options.map((option, index) => {
                            const active = answers[currentQuestion.id] === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                className={cn(
                                  "group rounded-[24px] border p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow",
                                  active
                                    ? "border-glow bg-glow/10 shadow-[0_0_0_1px_rgba(121,242,210,0.15)]"
                                    : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
                                )}
                                onClick={() => handleAnswer(currentQuestion.id, option.value)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    handleAnswer(currentQuestion.id, option.value);
                                  }
                                  if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                                    const nextButton = document.getElementById(`${currentQuestion.id}-${index + 1}`);
                                    nextButton?.focus();
                                  }
                                  if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                                    const prevButton = document.getElementById(`${currentQuestion.id}-${index - 1}`);
                                    prevButton?.focus();
                                  }
                                }}
                                id={`${currentQuestion.id}-${index}`}
                              >
                                <div className="flex items-center justify-between gap-4">
                                  <p className="text-lg font-semibold text-paper">{option.label}</p>
                                  <ArrowRight className="h-5 w-5 text-cloud/30 transition group-hover:text-glow" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center justify-between">
                          <Button variant="secondary" onClick={goBack} disabled={currentIndex === 0}>
                            <ChevronLeft className="h-4 w-4" />
                            Back
                          </Button>
                          <p className="text-sm text-cloud/60">One answer per screen keeps the diagnostic fast and focused.</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              ) : null}

              {result ? (
                <div className="space-y-10">
                  <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                      <Card className="border-glow/15 bg-glow/8">
                      <CardContent className="space-y-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Your results</p>
                            <h3 className="mt-2 font-display text-4xl font-bold text-paper">{result.score}/100</h3>
                          </div>
                          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-cloud/75">
                            {result.label}
                          </div>
                        </div>
                        <p className="text-base leading-7 text-cloud/80">{result.summary}</p>
                        <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-5">
                          <p className="text-sm font-medium text-cloud/65">Recommended next step</p>
                          <p className="mt-2 text-sm leading-7 text-cloud/82">{result.recommendedNextStep}</p>
                        </div>
                        <div className="rounded-[22px] border border-white/10 bg-ink/60 p-5">
                          <p className="text-sm font-medium text-cloud/65">Qualification tier</p>
                          <p className="mt-2 text-2xl font-semibold text-paper">{result.qualification}</p>
                        </div>
                        <div className="space-y-3">
                          <Button onClick={() => handleCtaClick(result.ctaPrimary, "#booking")} size="lg">
                            {result.ctaPrimary}
                          </Button>
                          <Button variant="secondary" onClick={() => handleCtaClick(result.ctaSecondary, "#booking")} size="lg">
                            {result.ctaSecondary}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="space-y-6">
                      <Card>
                        <CardContent className="space-y-4">
                          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">What stood out</p>
                          <div className="grid gap-3">
                            {result.findings.map((finding) => (
                              <div key={finding} className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                                <BarChart3 className="mt-0.5 h-5 w-5 text-amber" />
                                <p className="text-sm leading-6 text-cloud/80">{finding}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="space-y-4">
                          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Business implications</p>
                          <div className="grid gap-3">
                            {result.implications.map((implication) => (
                              <div key={implication} className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                                <Target className="mt-0.5 h-5 w-5 text-glow" />
                                <p className="text-sm leading-6 text-cloud/80">{implication}</p>
                              </div>
                            ))}
                          </div>
                          <div className="rounded-[22px] border border-amber/12 bg-amber/10 p-5">
                            <p className="text-sm leading-7 text-cloud/82">{result.opportunityNarrative}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

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
                          <MetricInput
                            label="Monthly traffic"
                            value={opportunityInputs.monthlyTraffic}
                            onChange={(value) => handleOpportunityChange("monthlyTraffic", value)}
                          />
                          <MetricInput label="CPA" value={opportunityInputs.cpa} onChange={(value) => handleOpportunityChange("cpa", value)} />
                          <MetricInput
                            label="Lead-to-close rate %"
                            value={opportunityInputs.leadToCloseRate}
                            onChange={(value) => handleOpportunityChange("leadToCloseRate", value)}
                          />
                          <MetricInput
                            label="Average deal value"
                            value={opportunityInputs.averageDealValue}
                            onChange={(value) => handleOpportunityChange("averageDealValue", value)}
                          />
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
                          <Button
                            variant="outline"
                            onClick={() => {
                              trackEvent("share_clicked", { type: "email-results" });
                              window.location.href = `mailto:?subject=The Bad Data Test result&body=Take a look at this diagnostic: ${window.location.href}`;
                            }}
                          >
                            <Mail className="h-4 w-4" />
                            Email to colleague
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
                              <Select
                                id={field.id}
                                value={qualification[field.id] || ""}
                                onChange={(event) => handleQualificationFieldChange(field.id, event.target.value)}
                              >
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
                        <Button onClick={() => handleCtaClick("Book a 20-Minute Intro Call", "#booking")}>
                          Book a 20-Minute Intro Call
                        </Button>
                        <Button variant="secondary" onClick={() => handleCtaClick("Request Revenue Recovery Audit Information", "#booking")}>
                          Request Revenue Recovery Audit Information
                        </Button>
                        <p className="text-sm text-cloud/60">
                          Submission status:{" "}
                          <span className="font-medium text-paper">
                            {submissionState === "submitted"
                              ? "captured"
                              : submissionState === "error"
                                ? "needs retry"
                                : submissionState}
                          </span>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <section className="pt-20 md:pt-28">
          <div className="grid gap-6 lg:grid-cols-3">
            {siteConfig.whyItWorks.map((point, index) => (
              <Card key={point}>
                <CardContent className="space-y-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Why this test works {index + 1}</p>
                  <p className="text-base leading-7 text-cloud/78">{point}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="framework" className="pt-20 md:pt-28">
          <div className="mb-8 max-w-3xl space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Framework</p>
            <h2 className="font-display text-4xl font-bold text-paper md:text-5xl">The 3 layers of the Data Growth Stack</h2>
            <p className="text-base leading-7 text-cloud/75 md:text-lg">
              Diagnosis is the front door. The stack is how weak signal, underused CRM data, and incomplete attribution become an operating advantage.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {stackLayers.map((layer) => (
              <Card key={layer.title}>
                <CardContent className="space-y-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">{layer.eyebrow}</p>
                  <h3 className="font-display text-3xl font-bold text-paper">{layer.title}</h3>
                  <p className="text-base leading-7 text-cloud/75">{layer.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="pt-20 md:pt-28">
          <div className="grid gap-8 lg:grid-cols-2">
            <Card>
              <CardContent className="space-y-5">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Who this is for</p>
                <div className="grid gap-3">
                  {siteConfig.audiences.for.map((item) => (
                    <div key={item} className="flex gap-3">
                      <ShieldCheck className="mt-0.5 h-5 w-5 text-glow" />
                      <p className="text-sm leading-6 text-cloud/78">{item}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-5">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber">Who this is not for</p>
                <div className="grid gap-3">
                  {siteConfig.audiences.notFor.map((item) => (
                    <div key={item} className="flex gap-3">
                      <Clipboard className="mt-0.5 h-5 w-5 text-amber" />
                      <p className="text-sm leading-6 text-cloud/78">{item}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="pt-20 md:pt-28">
          <div className="mb-8 max-w-2xl space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">FAQ</p>
            <h2 className="font-display text-4xl font-bold text-paper md:text-5xl">Questions growth leaders usually ask</h2>
          </div>
          <div className="grid gap-4">
            {faqItems.map((item) => (
              <Card key={item.question}>
                <CardContent className="space-y-3">
                  <h3 className="text-lg font-semibold text-paper">{item.question}</h3>
                  <p className="text-sm leading-7 text-cloud/75">{item.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="booking" className="pb-12 pt-20 md:pb-20 md:pt-28">
          <Card className="border-glow/15 bg-gradient-to-br from-glow/10 via-white/[0.04] to-amber/10">
            <CardContent className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
              <div className="space-y-5">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Next step</p>
                <h2 className="font-display text-4xl font-bold text-paper md:text-5xl">Move from suspicion to diagnosis</h2>
                <p className="max-w-2xl text-base leading-8 text-cloud/80 md:text-lg">
                  The Revenue Recovery Audit is designed to quantify where your team is losing signal, where attribution is distorting decisions, and where recoverable pipeline may already exist inside your current traffic.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    size="lg"
                    onClick={() => {
                      trackEvent("booking_started");
                      window.open(siteConfig.bookingUrl, "_blank", "noopener,noreferrer");
                    }}
                  >
                    Book a 20-Minute Intro Call
                  </Button>
                  <Button variant="secondary" size="lg" onClick={() => handleShare()}>
                    Share the Test With Your Team
                  </Button>
                </div>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-ink/70 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cloud/60">GoHighLevel booking</p>
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
                <p className="mt-4 text-sm leading-6 text-cloud/60">
                  If the embedded calendar feels cramped on your device,{" "}
                  <a
                    href={siteConfig.bookingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-glow underline decoration-glow/40 underline-offset-4"
                    onClick={() => trackEvent("booking_started", { source: "fallback-link" })}
                  >
                    open the full booking page
                  </a>
                  .
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      <Script src="https://link.msgsndr.com/js/form_embed.js" strategy="afterInteractive" />

      <div className="fixed inset-x-0 bottom-4 z-40 mx-auto flex max-w-md px-4 md:hidden">
        <Button className="w-full" size="lg" onClick={() => handleCtaClick(stage === "result" ? "Book a 20-Minute Intro Call" : "Take the Test", stage === "result" ? "#booking" : "#quiz")}>
          {stage === "result" ? "Book a 20-Minute Intro Call" : "Take the Test"}
        </Button>
      </div>
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
