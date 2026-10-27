import { NextResponse } from "next/server";
import { sql, ensure } from "../../../lib/db";

export async function GET() {
  await ensure();
  const w = await sql`select to_char(day,'YYYY-MM-DD') d, weight w, bf, ffm, visceral v, source from weigh_ins order by day`;
  const d = await sql`select to_char(day,'YYYY-MM-DD') d, rhr, hrv, steps, sleep_min from daily where day > now() - interval '120 days' order by day`;
  return NextResponse.json({ weighins: w, daily: d });
}

export async function POST(req) {
  await ensure();
  const { rows, replace, source } = await req.json();
  const src = source === "checkin" ? "checkin" : "renpho_csv";
  if (replace) await sql`delete from weigh_ins where source = 'renpho_csv'`;
  for (const r of (rows || []).slice(0, 5000)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.d) || !(r.w > 0)) continue;
    await sql`insert into weigh_ins (day, weight, bf, ffm, visceral, source) values (${r.d}, ${r.w}, ${r.bf ?? null}, ${r.ffm ?? null}, ${r.v ?? null}, ${src})
      on conflict (day) do update set weight = excluded.weight, bf = coalesce(excluded.bf, weigh_ins.bf), ffm = coalesce(excluded.ffm, weigh_ins.ffm), visceral = coalesce(excluded.visceral, weigh_ins.visceral), source = excluded.source`;
  }
  return NextResponse.json({ ok: true });
}
