import { NextResponse } from "next/server";
import { cookieName } from "../../../lib/session";

export function POST(req) {
  const res = NextResponse.redirect(new URL("/login", req.url), 303);
  res.cookies.delete(cookieName);
  return res;
}
