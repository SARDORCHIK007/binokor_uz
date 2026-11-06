import { NextResponse } from "next/server";

const LOCALES = new Set(["uz-Latn", "uz-Cyrl", "ru", "en"]);

export function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") ?? "uz-Latn";
  const next = url.searchParams.get("next") ?? "/";
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:8090";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const response = NextResponse.redirect(`${proto}://${host}${safe}`);
  if (LOCALES.has(locale)) {
    response.cookies.set("ub_locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  return response;
}
