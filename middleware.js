import { NextResponse } from "next/server";
import { validToken, cookieName } from "./lib/session";

const OPEN = ["/login", "/api/login", "/manifest.webmanifest", "/icon.svg", "/sw.js"];

export async function middleware(req) {
  const p = req.nextUrl.pathname;
  if (OPEN.includes(p)) return NextResponse.next();
  if (p === "/api/sync" && req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`) return NextResponse.next();
  if (await validToken(req.cookies.get(cookieName)?.value)) return NextResponse.next();
  if (p.startsWith("/api/")) return NextResponse.json({ error: "signed_out" }, { status: 401 });
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = { matcher: ["/((?!_next/).*)"] };
