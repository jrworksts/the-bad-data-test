import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/admin";

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = String(formData.get("password") || "");
  const origin = new URL(request.url).origin;

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.redirect(new URL("/admin?error=1", origin));
  }

  const response = NextResponse.redirect(new URL("/admin", origin));
  response.cookies.set(ADMIN_COOKIE_NAME, password, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
}

