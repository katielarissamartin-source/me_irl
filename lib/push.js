import webpush from "web-push";
import { sql, ensure } from "./db";

let set = false;
function init() {
  if (set) return;
  webpush.setVapidDetails(`mailto:${process.env.ALLOWED_EMAIL || "me@example.com"}`, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  set = true;
}

export async function getKv(key) {
  await ensure();
  const [r] = await sql`select value from kv where key = ${key}`;
  return r?.value ?? null;
}

export async function setKv(key, v) {
  await ensure();
  await sql`insert into kv (key, value, updated_at) values (${key}, ${JSON.stringify(v)}::jsonb, now()) on conflict (key) do update set value = excluded.value, updated_at = now()`;
}

export async function sendToAll(payload) {
  init();
  const subs = (await getKv("push_subs")) || [];
  const alive = [];
  for (const s of subs) {
    try { await webpush.sendNotification(s, JSON.stringify(payload), { TTL: 120, urgency: "high" }); alive.push(s); }
    catch (e) { if (e.statusCode !== 404 && e.statusCode !== 410) alive.push(s); }
  }
  if (alive.length !== subs.length) await setKv("push_subs", alive);
  return alive.length;
}
