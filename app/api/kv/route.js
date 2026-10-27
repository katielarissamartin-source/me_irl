import { NextResponse } from "next/server";
import { sql, ensure } from "../../../lib/db";

export async function GET() {
  await ensure();
  const rows = await sql`select key, value from kv`;
  return NextResponse.json(Object.fromEntries(rows.map(r => [r.key, r.value])));
}

export async function POST(req) {
  await ensure();
  const body = await req.json();
  for (const [k, v] of Object.entries(body)) {
    if (!/^kt_[a-z_]+$/.test(k)) continue;
    if (v === null) await sql`delete from kv where key = ${k}`;
    else await sql`insert into kv (key, value, updated_at) values (${k}, ${JSON.stringify(v)}::jsonb, now()) on conflict (key) do update set value = excluded.value, updated_at = now()`;
  }
  return NextResponse.json({ ok: true });
}
