import { NextResponse } from "next/server";
import { makeToken, cookieName, cookieOpts } from "../../../lib/session";

const tries = new Map();

export async function POST(req) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "x";
  const t = tries.get(ip) || { n: 0, at: Date.now() };
  if (Date.now() - t.at > 15 * 60000) { t.n = 0; t.at = Date.now(); }
  if (t.n >= 10) return NextResponse.redirect(new URL("/login?e=slow", req.url), 303);
  const form = await req.formData();
  if (!process.env.APP_PASSWORD || form.get("password") !== process.env.APP_PASSWORD) {
    t.n++; tries.set(ip, t);
    return NextResponse.redirect(new URL("/login?e=1", req.url), 303);
  }
  const res = NextResponse.redirect(new URL("/", req.url), 303);
  res.cookies.set(cookieName, await makeToken(), cookieOpts);
  return res;
}
