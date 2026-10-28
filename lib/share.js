import { sql, ensure } from "./db";

export async function loadShare(k) {
  await ensure();
  const rows = await sql`select key, value from kv where key in ('kt_share','kt_lifts','kt_workouts','kt_sess')`;
  const kv = Object.fromEntries(rows.map(r => [r.key, r.value]));
  const share = kv.kt_share;
  if (!share?.token || !k || k.length !== share.token.length) return null;
  let diff = 0;
  for (let i = 0; i < k.length; i++) diff |= k.charCodeAt(i) ^ share.token.charCodeAt(i);
  return diff === 0 ? { share, kv } : null;
}

