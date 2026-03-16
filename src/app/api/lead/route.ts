import { NextResponse } from "next/server";
import { z } from "zod";
import { submitLead } from "@/lib/integrations";
import type { SubmissionPayload } from "@/lib/types";

const submissionSchema = z.object({
  lead: z.record(z.string()),
  qualification: z.record(z.string()),
  answers: z.record(z.string()),
  result: z.object({
    score: z.number(),
    label: z.string(),
    summary: z.string(),
    findings: z.array(z.string()),
    implications: z.array(z.string()),
    qualification: z.string(),
    opportunityNarrative: z.string(),
    recommendedNextStep: z.string(),
    ctaPrimary: z.string(),
    ctaSecondary: z.string(),
    routeVariant: z.string(),
  }),
  opportunity: z
    .object({
      monthlyTraffic: z.number().optional(),
      cpa: z.number().optional(),
      leadToCloseRate: z.number().optional(),
      averageDealValue: z.number().optional(),
    })
    .optional(),
  submittedAt: z.string(),
  source: z.literal("bad-data-test"),
});

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SubmissionPayload;
    const parsed = submissionSchema.parse(body);

    await submitLead(parsed);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Lead submission failed", error);
    return NextResponse.json({ ok: false, error: "Submission failed" }, { status: 400 });
  }
}
