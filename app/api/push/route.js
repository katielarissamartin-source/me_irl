import { NextResponse } from "next/server";
import { getKv, setKv } from "../../../lib/push";

export function GET() {
  return NextResponse.json({ key: process.env.VAPID_PUBLIC_KEY || null });
}

export async function POST(req) {
  const sub = await req.json();
  if (!sub?.endpoint || !/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh) return NextResponse.json({ error: "bad_subscription" }, { status: 400 });
  const subs = ((await getKv("push_subs")) || []).filter(s => s.endpoint !== sub.endpoint);
  subs.push({ endpoint: sub.endpoint, keys: sub.keys });
  await setKv("push_subs", subs.slice(-5));
  return NextResponse.json({ ok: true });
}
