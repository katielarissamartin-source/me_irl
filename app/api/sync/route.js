import { NextResponse } from "next/server";
import { syncAll } from "../../../lib/google";
import { sql, ensure } from "../../../lib/db";

export const maxDuration = 60;

async function run() {
  try {
    return NextResponse.json({ ok: true, report: await syncAll() });
  } catch (e) {
    try { await ensure(); await sql`update google set last_error = ${String(e.message).slice(0, 300)} where id = 1`; } catch {}
    return NextResponse.json({ ok: false, error: String(e.message) }, { status: 200 });
  }
}
export const GET = run;
export const POST = run;
