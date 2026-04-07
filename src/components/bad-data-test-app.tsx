"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  MoveRight,
} from "lucide-react";
import { leadGateAfterQuestion, leadGateFields, quizQuestions } from "@/config/quiz";
import { trackEvent } from "@/lib/analytics";
import { buildResultModel } from "@/lib/scoring";
import type { LeadProfile, OpportunityInputs, QuizResponses, ResultModel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

const LOCAL_STORAGE_KEY = "bad-data-test-state";
type FunnelStage = "landing" | "quiz" | "result";

const initialOpportunityInputs: OpportunityInputs = {
  monthlyTraffic: 20000,
  cpa: 2000,
  leadToCloseRate: 0.8,
  averageDealValue: 4000,
  identificationRate: 25,
};

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

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

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

  function startQuiz() {
    setStage("quiz");
    trackEvent("quiz_started");
  }

  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30" aria-hidden />
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-6 sm:px-6 lg:px-8">
        <section id="quiz" className="flex min-h-[calc(100vh-3rem)] items-center">
          <div className="w-full">
            {stage === "landing" ? (
              <Card className="overflow-hidden">
                <CardContent className="space-y-8 px-5 py-10 text-center md:px-10 md:py-14">
                  <div className="space-y-4">
                    <h1
                      id="quiz-heading"
                      className="mx-auto max-w-4xl font-display text-4xl font-bold tracking-tight text-paper md:text-6xl"
                    >
                      You&apos;re Wasting 20-40% of Your Paid Ad Budget.
                      <br />
                      Find Out Where in 2 Minutes.
                    </h1>
                    <p className="mx-auto max-w-3xl text-base leading-8 text-cloud/78 md:text-lg">
                      We show you how much ad spend and pipeline you&apos;re losing and the 6-figure upside hiding in your existing traffic.
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <Button size="lg" className="w-full max-w-sm" onClick={startQuiz}>
                      Find My Lost Revenue
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <CardContent className="space-y-6 p-4 md:space-y-8 md:p-8">
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
                            <div key={field.id}>
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
                                  className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-base text-paper outline-none transition focus:border-glow/50 md:text-sm"
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
                        {currentIndex > 0 ? (
                          <div className="flex items-center justify-between">
                            <Button variant="secondary" className="w-full" onClick={goBack}>
                              <ChevronLeft className="h-4 w-4" />
                              Back
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              ) : null}

                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
