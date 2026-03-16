"use client";

type EventName =
  | "landing_viewed"
  | "quiz_started"
  | "question_answered"
  | "quiz_abandoned"
  | "lead_gate_viewed"
  | "lead_gate_completed"
  | "result_viewed"
  | "cta_clicked"
  | "booking_started"
  | "booking_completed"
  | "share_clicked"
  | "opportunity_estimated";

type EventPayload = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    lintrk?: (...args: unknown[]) => void;
    analytics?: { track: (event: string, payload?: EventPayload) => void };
  }
}

export function trackEvent(name: EventName, payload: EventPayload = {}) {
  if (typeof window === "undefined") return;

  window.gtag?.("event", name, payload);
  window.fbq?.("trackCustom", name, payload);
  window.lintrk?.("track", { conversion_id: name, ...payload });
  window.analytics?.track(name, payload);

  if (process.env.NODE_ENV !== "production") {
    console.info("[analytics]", name, payload);
  }
}
