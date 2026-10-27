import { NextResponse } from "next/server";
import { redirectUri } from "../../../../lib/google";
import { sql, ensure } from "../../../../lib/db";

export async function GET(req) {
  const u = new URL(req.url);
  const back = s => NextResponse.redirect(new URL(`/?google=${s}`, req.url));
  if (u.searchParams.get("error")) return back(u.searchParams.get("error"));
  if (!u.searchParams.get("state") || u.searchParams.get("state") !== req.cookies.get("g_state")?.value) return back("bad_state");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code: u.searchParams.get("code"), client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: redirectUri(u.origin), grant_type: "authorization_code" })
  });
  const j = await r.json();
  if (!r.ok) return back("token_error");
  if (process.env.ALLOWED_EMAIL && j.id_token) {
    const payload = JSON.parse(Buffer.from(j.id_token.split(".")[1], "base64url").toString());
    if (payload.email?.toLowerCase() !== process.env.ALLOWED_EMAIL.toLowerCase()) return back("wrong_account");
  }
  await ensure();
  await sql`insert into google (id, refresh_token, access_token, expires_at) values (1, ${j.refresh_token || null}, ${j.access_token}, ${Date.now() + j.expires_in * 1000})
    on conflict (id) do update set refresh_token = coalesce(excluded.refresh_token, google.refresh_token), access_token = excluded.access_token, expires_at = excluded.expires_at, last_error = null`;
  return back("connected");
}
