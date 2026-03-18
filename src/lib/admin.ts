import { readFile } from "fs/promises";
import path from "path";
import type { SubmissionPayload } from "@/lib/types";

export const ADMIN_COOKIE_NAME = "bad_data_admin";

export function hasAdminPassword() {
  return !!process.env.ADMIN_PASSWORD;
}

export function isAuthorizedAdmin(cookieValue?: string) {
  if (!process.env.ADMIN_PASSWORD) return false;
  return cookieValue === process.env.ADMIN_PASSWORD;
}

export async function readLocalSubmissions(): Promise<SubmissionPayload[]> {
  if (process.env.ENABLE_LOCAL_STORAGE !== "true") return [];

  const file = path.join("/tmp", "bad-data-test-submissions.ndjson");

  try {
    const raw = await readFile(file, "utf8");
    return raw
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as SubmissionPayload)
      .reverse();
  } catch {
    return [];
  }
}

