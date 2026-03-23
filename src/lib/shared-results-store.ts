import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { SharedResultsPayload } from "@/lib/types";

const STORE_DIR = path.join("/tmp", "bad-data-test-shared-results");

function getTokenFile(token: string) {
  return path.join(STORE_DIR, `${token}.json`);
}

export async function createSharedResultsToken(payload: SharedResultsPayload) {
  const token = randomUUID().replace(/-/g, "").slice(0, 12);
  await mkdir(STORE_DIR, { recursive: true });
  await writeFile(getTokenFile(token), JSON.stringify(payload), "utf8");
  return token;
}

export async function getSharedResultsByToken(token: string) {
  try {
    const raw = await readFile(getTokenFile(token), "utf8");
    return JSON.parse(raw) as SharedResultsPayload;
  } catch {
    return null;
  }
}
