import { NextResponse } from "next/server";
import { sql, ensure } from "../../../lib/db";

export async function GET() {
  let db = false, google = null;
  try {
    await ensure(); db = true;
    const [g] = await sql`select refresh_token is not null connected, last_sync, last_error from google where id = 1`;
    google = g || { connected: false };
  } catch {}
  return NextResponse.json({ db, google, googleConfigured: !!process.env.GOOGLE_CLIENT_ID, fridge: !!process.env.ANTHROPIC_API_KEY });
}
