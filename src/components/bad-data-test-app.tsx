"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Clipboard,
  MoveRight,
  ShieldCheck,
} from "lucide-react";
import { leadGateAfterQuestion, leadGateFields, quizQuestions } from "@/config/quiz";
import { faqItems, primaryCtas, proofStats, siteConfig, stackLayers } from "@/config/site";
import { trackEvent } from "@/lib/analytics";
import { buildResultModel } from "@/lib/scoring";
import type { LeadProfile, OpportunityInputs, QuizResponses, ResultModel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

const LOCAL_STORAGE_KEY = "bad-data-test-state";
const GHL_EMBED_ID = "303rv61ZkidkXmcEvLhz_1773702309411";

type FunnelStage = "landing" | "quiz" | "result";

const initialOpportunityInputs: OpportunityInputs = {
  monthlyTraffic: 15000,
  cpa: 180,
  leadToCloseRate: 2,
  averageDealValue: 1800,
  identificationRate: 5,
};

function TrustLogoCard({
  logo,
}: {
  logo: {
    name: string;
    alt: string;
    src: string;
    surfaceClassName?: string;
    imageClassName?: string;
  };
}) {
  const [hasError, setHasError] = useState(false);

  return (
    <div
      className={cn(
        "flex min-h-24 items-center justify-center rounded-2xl border border-white/8 px-5 py-6 shadow-[0_10px_30px_rgba(3,8,20,0.12)]",
        logo.surfaceClassName ?? "bg-white/[0.03]",
      )}
    >
      {hasError ? (
        <span className="text-center text-base font-medium text-cloud/72">{logo.name}</span>
      ) : (
        <img
          src={logo.src}
          alt={logo.alt}
          className={cn("w-auto object-contain opacity-95", logo.imageClassName ?? "h-10 max-w-[180px]")}
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
}

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function BadDataTestApp() {
  const router = useRouter();
  const [stage, setStage] = useState<FunnelStage>("landing");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizResponses>({});
  const [lead, setLead] = useState<LeadProfile>({});
  const [qualification, setQualification] = useState<LeadProfile>({});
  const [showLeadGate, setShowLeadGate] = useState(false);
  const [leadGateSubmitted, setLeadGateSubmitted] = useState(false);
  const [result, setResult] = useState<ResultModel | null>(null);
  const [opportunityInputs, setOpportunityInputs] = useState<OpportunityInputs>(initialOpportunityInputs);
  const quizRef = useRef<HTMLDivElement | null>(null);
  const leadGateFormRef = useRef<HTMLFormElement | null>(null);

  const currentQuestion = quizQuestions[currentIndex];
  const progress = Math.round(((currentIndex + 1) / quizQuestions.length) * 100);

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
        result?: ResultModel | null;
        opportunityInputs?: OpportunityInputs;
      };

      setStage(parsed.stage === "result" ? "landing" : parsed.stage || "landing");
      setCurrentIndex(parsed.currentIndex || 0);
      setAnswers(parsed.answers || {});
      setLead(parsed.lead || {});
      setQualification(parsed.qualification || {});
      setLeadGateSubmitted(parsed.leadGateSubmitted || false);
      if (parsed.result) setResult(parsed.result);
      if (parsed.opportunityInputs) setOpportunityInputs(parsed.opportunityInputs);
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
        result,
        opportunityInputs,
      }),
    );
  }, [answers, currentIndex, lead, leadGateSubmitted, opportunityInputs, qualification, result, stage]);

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
    const hasLeadDetails = leadGateFields.some((field) => !!lead[field.id]?.trim());
    setResult(built);
    setStage("result");
    setShowLeadGate(false);
    window.localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        stage: "result",
        currentIndex,
        answers: finalAnswers,
        lead,
        qualification,
        leadGateSubmitted,
        result: built,
        opportunityInputs,
      }),
    );
    if (hasLeadDetails) {
      void submitLeadPayload(built, finalAnswers);
    }
    router.push("/results");
  }

  async function submitLeadPayload(finalResult: ResultModel, finalAnswers: QuizResponses) {
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
    } catch {
      // Keep the quiz flow moving even if the lead handoff needs a retry later.
    }
  }

  function handleLeadFieldChange(field: string, value: string) {
    setLead((previous) => ({
      ...previous,
      [field]: field === "phone" ? formatPhoneNumber(value) : value,
    }));
  }

  function submitLeadGate() {
    if (leadGateFormRef.current && !leadGateFormRef.current.reportValidity()) return;

    const hasLeadDetails = leadGateFields.some((field) => !!lead[field.id]?.trim());

    setLeadGateSubmitted(true);
    setShowLeadGate(false);
    if (hasLeadDetails) {
      trackEvent("lead_gate_completed");
    }

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

  function handleCtaClick(label: string, href: string) {
    trackEvent("cta_clicked", { label, href, stage });
    if (href === "#quiz") {
      startQuiz();
      return;
    }

    document.querySelector(href)?.scrollIntoView({ behavior: "smooth", block: "start" });
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
              <Button size="sm" onClick={() => handleCtaClick(primaryCtas[0].label, primaryCtas[0].href)}>
                {primaryCtas[0].label}
              </Button>
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
                <p className="max-w-3xl font-display text-2xl font-semibold leading-tight text-cloud/88 md:text-3xl">
                  {siteConfig.hero.qualifier}
                </p>
                <p className="max-w-2xl text-lg leading-8 text-cloud/80 md:text-xl">
                  {siteConfig.hero.subhead}
                </p>
                <ul className="grid gap-3 text-base leading-7 text-cloud/74">
                  {[
                    "For B2B SaaS / info products doing $5M-$100M ARR",
                    "Takes ~2 minutes, 8 questions, no deck, no demo",
                    "Built for teams spending $50k-$500k/mo on paid ads",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-glow" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex w-fit flex-col items-center space-y-3">
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Button size="lg" onClick={() => handleCtaClick("Start the Bad Data Test", "#quiz")}>
                    Start the Bad Data Test
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex justify-center">
                  <button
                    type="button"
                    className="text-sm font-medium text-cloud/74 underline decoration-white/20 underline-offset-4 transition hover:text-paper"
                    onClick={() => handleCtaClick("See How It Works", "#framework")}
                  >
                    See How It Works
                  </button>
                </div>
              </div>
            </div>

            <Card
              className="cursor-pointer overflow-hidden border-glow/15 bg-slate/80 transition hover:border-glow/35 hover:bg-slate/90"
              role="button"
              tabIndex={0}
              onClick={() => handleCtaClick("Hero quiz preview", "#quiz")}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleCtaClick("Hero quiz preview", "#quiz");
                }
              }}
            >
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Step 1 of 8</p>
                    <h2 className="mt-2 font-display text-3xl font-bold text-paper">2 minutes total · 8 questions</h2>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-cloud/70">
                    Start with one question
                  </div>
                </div>
                <div className="space-y-4 rounded-[24px] border border-white/10 bg-ink/60 p-5">
                  <Progress value={12.5} />
                  <div className="space-y-3">
                    <p className="text-sm leading-6 text-cloud/72">
                      Answer 8 quick questions to get your Bad Data Score and estimated recoverable revenue.
                    </p>
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cloud/60">
                      {quizQuestions[0].title}
                    </p>
                    <h3 className="font-display text-2xl font-bold text-paper">
                      {quizQuestions[0].prompt}
                    </h3>
                  </div>
                  <div className="grid gap-3">
                    {quizQuestions[0].options.slice(0, 3).map((option) => (
                      <div
                        key={option.value}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-cloud/78"
                      >
                        <span>{option.label}</span>
                        <ArrowRight className="h-4 w-4 text-cloud/35" />
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
          <div className="mt-10 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {proofStats.map((stat) => (
                <Card key={stat.value} className="border-white/8 bg-white/[0.03]">
                  <CardContent className="flex h-full flex-col justify-center space-y-2 text-center">
                    <p className="font-display text-3xl font-bold text-paper">{stat.value}</p>
                    <p className="mx-auto max-w-[20ch] text-sm leading-6 text-cloud/70">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cloud/50">Works with</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {siteConfig.trustLogos.map((logo) => (
                  <TrustLogoCard key={logo.name} logo={logo} />
                ))}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-cloud/72">
                Typical upside we see in audits: 15-30% efficiency gain in paid spend
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-cloud/72">
                Most SaaS sites: 20-40% of traffic is anonymous / untracked
              </div>
            </div>
          </div>
        </section>

        <section id="quiz" ref={quizRef} className="pt-20 md:pt-28">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.26em] text-glow">Diagnostic</p>
              <h2 className="font-display text-4xl font-bold tracking-tight text-paper md:text-5xl">Question 1 starts here</h2>
              <p className="max-w-3xl text-base leading-7 text-cloud/75 md:text-lg">
                Start with the first question below. One answer creates the momentum for the rest of the diagnostic.
              </p>
            </div>
            <Button variant="outline" onClick={startQuiz}>
              {stage === "landing" ? "Start Question 1" : "Resume Diagnostic"}
            </Button>
          </div>

          <Card className="overflow-hidden">
            <CardContent className="space-y-8 p-5 md:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-cloud/65">
                    Step {Math.min(currentIndex + 1, quizQuestions.length)} of {quizQuestions.length} - ~2 minutes total
                  </p>
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
                          <h3 className="font-display text-3xl font-bold text-paper">Want your Bad Data Score and estimated recovery upside?</h3>
                          <p className="text-base leading-7 text-cloud/75">
                            Tell us where to send it and a bit about your company.
                          </p>
                        </div>
                        <form
                          ref={leadGateFormRef}
                          className="grid gap-4 sm:grid-cols-2"
                          onSubmit={(event) => {
                            event.preventDefault();
                            submitLeadGate();
                          }}
                        >
                          {leadGateFields.map((field) => (
                            <div key={field.id} className={field.id === "phone" ? "sm:col-span-2" : undefined}>
                              <label className="mb-2 block text-sm font-medium text-cloud/80" htmlFor={field.id}>
                                {field.label}
                                {field.required ? <span className="ml-1 text-rose">*</span> : null}
                              </label>
                              {field.type === "select" ? (
                                <select
                                  id={field.id}
                                  required={field.required}
                                  value={lead[field.id] || ""}
                                  onChange={(event) => handleLeadFieldChange(field.id, event.target.value)}
                                  className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-paper outline-none transition focus:border-glow/50"
                                >
                                  <option value="">Select</option>
                                  {field.options?.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <Input
                                  id={field.id}
                                  type={field.id === "phone" ? "tel" : field.type}
                                  required={field.required}
                                  placeholder={field.placeholder}
                                  value={lead[field.id] || ""}
                                  inputMode={field.id === "phone" ? "tel" : undefined}
                                  onChange={(event) => handleLeadFieldChange(field.id, event.target.value)}
                                />
                              )}
                            </div>
                          ))}
                          <div className="sm:col-span-2 flex flex-wrap gap-3 pt-2">
                            <Button type="submit" className="w-full">
                              Continue
                              <MoveRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </form>
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
                                  "group w-full rounded-[24px] border p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow",
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
                          <Button variant="secondary" className="w-full" onClick={goBack} disabled={currentIndex === 0}>
                            <ChevronLeft className="h-4 w-4" />
                            Back
                          </Button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              ) : null}

            </CardContent>
          </Card>
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
            <CardContent className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-5">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Prefer to skip the test?</p>
                <h2 className="font-display text-4xl font-bold text-paper md:text-5xl">Book a 20-minute Intro Call instead</h2>
                <p className="max-w-2xl text-base leading-8 text-cloud/80 md:text-lg">
                  If you already know your team wants help pressure-testing identity, attribution, and signal loss, you can skip straight to a short intro call.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    size="default"
                    onClick={() => {
                      trackEvent("booking_started");
                      window.open(siteConfig.bookingUrl, "_blank", "noopener,noreferrer");
                    }}
                  >
                    Prefer to skip the test? Book a 20-minute Intro Call.
                  </Button>
                </div>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-ink/70 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cloud/60">Why the test usually converts better</p>
                <p className="mt-3 text-base leading-7 text-cloud/76">
                  The score and modeled revenue range create the tension most teams need before they commit to a deeper audit conversation.
                </p>
                <p className="mt-4 text-sm leading-6 text-cloud/60">
                  If you do want to skip ahead, the intro call is still the right place to decide whether a Revenue Recovery Audit makes sense.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-4 z-40 mx-auto flex max-w-md px-4 md:hidden">
        <Button className="w-full" size="lg" onClick={() => handleCtaClick(stage === "result" ? "Book a 20-Minute Intro Call" : "Take the Test", stage === "result" ? "#booking" : "#quiz")}>
          {stage === "result" ? "Book a 20-Minute Intro Call" : "Take the Test"}
        </Button>
      </div>
    </main>
  );
}
