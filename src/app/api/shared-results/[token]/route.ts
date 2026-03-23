import { NextResponse } from "next/server";
import { getSharedResultsByToken } from "@/lib/shared-results-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const payload = await getSharedResultsByToken(token);

  if (!payload) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, payload });
}
