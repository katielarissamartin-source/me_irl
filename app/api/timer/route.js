import { NextResponse, after } from "next/server";
import { getKv, setKv, sendToAll } from "../../../lib/push";

export const maxDuration = 300;

export async function POST(req) {
  const { seconds, cancel } = await req.json();
  if (cancel) { await setKv("timer", null); return NextResponse.json({ ok: true }); }
  const sec = Math.min(270, Math.max(5, Math.round(Number(seconds) || 120)));
  const id = crypto.randomUUID();
  const end = Date.now() + sec * 1000;
  await setKv("timer", { id, end });
  after(async () => {
    await new Promise(r => setTimeout(r, Math.max(0, end - Date.now())));
    const cur = await getKv("timer");
    if (cur?.id !== id) return;
    await sendToAll({ title: "Rest's up", body: "Next set. Go.", tag: "rest-timer" });
    await setKv("timer", null);
  });
  return NextResponse.json({ ok: true, end });
}
