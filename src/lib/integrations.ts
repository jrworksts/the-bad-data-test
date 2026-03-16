import { appendFile, mkdir } from "fs/promises";
import path from "path";
import type { SubmissionPayload } from "@/lib/types";

async function appendLocally(payload: SubmissionPayload) {
  if (process.env.ENABLE_LOCAL_STORAGE !== "true") return;

  const dir = "/tmp";
  const file = path.join(dir, "bad-data-test-submissions.ndjson");
  await mkdir(dir, { recursive: true });
  await appendFile(file, `${JSON.stringify(payload)}\n`, "utf8");
}

async function postWebhook(url: string, payload: SubmissionPayload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Webhook error: ${response.status}`);
  }
}

async function submitHubSpot(payload: SubmissionPayload) {
  const portalId = process.env.HUBSPOT_PORTAL_ID;
  const formId = process.env.HUBSPOT_FORM_ID;

  if (!portalId || !formId) return;

  const fields = [
    { name: "firstname", value: payload.lead.firstName || "" },
    { name: "email", value: payload.lead.workEmail || "" },
    { name: "company", value: payload.lead.company || "" },
    { name: "website", value: payload.lead.websiteUrl || "" },
    { name: "bad_data_score", value: String(payload.result.score) },
    { name: "qualification_tier", value: payload.result.qualification },
    { name: "quiz_answers", value: JSON.stringify(payload.answers) },
  ];

  const response = await fetch(
    `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields,
        context: {
          pageUri: process.env.NEXT_PUBLIC_SITE_URL,
          pageName: "The Bad Data Test",
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`HubSpot error: ${response.status}`);
  }
}

export async function submitLead(payload: SubmissionPayload) {
  await appendLocally(payload);

  const tasks: Promise<void>[] = [];

  if (process.env.WEBHOOK_URL) {
    tasks.push(postWebhook(process.env.WEBHOOK_URL, payload));
  }

  if (process.env.GHL_WEBHOOK_URL) {
    tasks.push(postWebhook(process.env.GHL_WEBHOOK_URL, payload));
  }

  if (process.env.HUBSPOT_PORTAL_ID && process.env.HUBSPOT_FORM_ID) {
    tasks.push(submitHubSpot(payload));
  }

  await Promise.all(tasks);
}
