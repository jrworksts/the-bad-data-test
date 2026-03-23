import type { SharedResultsPayload } from "@/lib/types";

const SHARE_PARAM = "share";

function toBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (normalized.length % 4)) % 4;
  const base64 = `${normalized}${"=".repeat(padding)}`;
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

export function encodeSharedResults(payload: SharedResultsPayload) {
  return toBase64Url(JSON.stringify({ v: 1, ...payload }));
}

export function decodeSharedResults(value: string): SharedResultsPayload | null {
  try {
    const parsed = JSON.parse(fromBase64Url(value)) as { v?: number } & SharedResultsPayload;

    if (!parsed || parsed.v !== 1 || !parsed.result || !parsed.answers) {
      return null;
    }

    return {
      result: parsed.result,
      answers: parsed.answers,
      opportunityInputs: parsed.opportunityInputs,
    };
  } catch {
    return null;
  }
}

export function buildSharedResultsUrl(siteUrl: string, payload: SharedResultsPayload) {
  const url = new URL("/results", siteUrl);
  url.searchParams.set(SHARE_PARAM, encodeSharedResults(payload));
  return url.toString();
}

export function getSharedResultsParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get(SHARE_PARAM);
}
