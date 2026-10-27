import { NextResponse } from "next/server";
import { SCOPES, redirectUri } from "../../../../lib/google";

export function GET(req) {
  if (!process.env.GOOGLE_CLIENT_ID) return NextResponse.redirect(new URL("/?google=not_configured", req.url));
  const state = crypto.randomUUID();
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(new URL(req.url).origin),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state
  });
  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${q}`);
  res.cookies.set("g_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
