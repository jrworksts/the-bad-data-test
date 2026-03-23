import { NextResponse } from "next/server";
import { z } from "zod";
import { createSharedResultsToken } from "@/lib/shared-results-store";

const sharedResultsSchema = z.object({
  result: z.object({
    score: z.number(),
    label: z.string(),
    summary: z.string(),
    findings: z.array(z.string()),
    implications: z.array(z.string()),
    qualification: z.enum(["High fit", "Potential fit", "Lower fit"]),
    opportunityNarrative: z.string(),
    recommendedNextStep: z.string(),
    ctaPrimary: z.string(),
    ctaSecondary: z.string(),
    routeVariant: z.enum(["high-score-high-fit", "high-score-lower-fit", "low-score"]),
  }),
  answers: z.record(z.string()),
  opportunityInputs: z
    .object({
      monthlyTraffic: z.number().optional(),
      cpa: z.number().optional(),
      leadToCloseRate: z.number().optional(),
      averageDealValue: z.number().optional(),
      identificationRate: z.number().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = sharedResultsSchema.parse(body);
    const token = await createSharedResultsToken(payload);

    return NextResponse.json({ ok: true, token });
  } catch (error) {
    console.error("Shared results token creation failed", error);
    return NextResponse.json({ ok: false, error: "Unable to create share link" }, { status: 400 });
  }
}
