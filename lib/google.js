import { sql, ensure } from "./db";

const P = "https://www.googleapis.com/auth/googlehealth.";
export const SCOPES = ["openid", "email", P + "health_metrics_and_measurements.readonly", P + "activity_and_fitness.readonly", P + "sleep.readonly"];
const API = "https://health.googleapis.com/v4/users/me/dataTypes";

export function redirectUri(origin) {
  return `${origin}/api/google/callback`;
}

export async function accessToken() {
  await ensure();
  const [g] = await sql`select * from google where id = 1`;
  if (!g?.refresh_token) throw new Error("not_connected");
  if (g.access_token && Number(g.expires_at) > Date.now() + 60000) return g.access_token;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, refresh_token: g.refresh_token, grant_type: "refresh_token" })
  });
  const j = await r.json();
  if (!r.ok) throw new Error("reconnect_needed: " + (j.error || r.status));
  await sql`update google set access_token = ${j.access_token}, expires_at = ${Date.now() + j.expires_in * 1000} where id = 1`;
  return j.access_token;
}

async function list(tok, type, filter) {
  const out = [];
  let page = "";
  for (let i = 0; i < 10; i++) {
    const q = new URLSearchParams({ page_size: "1000" });
    if (filter) q.set("filter", filter);
    if (page) q.set("page_token", page);
    const r = await fetch(`${API}/${type}/dataPoints?${q}`, { headers: { authorization: `Bearer ${tok}` } });
    if (r.status === 400 && filter) return list(tok, type, null);
    if (!r.ok) throw new Error(`${type}: ${r.status} ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    out.push(...(j.dataPoints || []));
    if (!j.nextPageToken) break;
    page = j.nextPageToken;
  }
  return out;
}

function findDate(o) {
  const s = JSON.stringify(o);
  const m = s.match(/"(?:physicalTime|startTime|civilStartTime|date|sampleTime)"\s*:\s*"(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = s.match(/"year":(\d{4}),"month":(\d{1,2}),"day":(\d{1,2})/);
  return d ? `${d[1]}-${d[2].padStart(2, "0")}-${d[3].padStart(2, "0")}` : null;
}

function findNum(o, keys) {
  let hit = null;
  (function walk(v, k) {
    if (hit !== null || v == null) return;
    if (typeof v === "object") { for (const [kk, vv] of Object.entries(v)) walk(vv, kk); return; }
    if (k && keys.test(k)) { const n = Number(v); if (!Number.isNaN(n)) hit = { k, n }; }
  })(o, "");
  return hit;
}

export async function syncAll(days = 120) {
  const tok = await accessToken();
  const since = new Date(Date.now() - days * 864e5);
  const iso = since.toISOString().slice(0, 19) + "Z";
  const day = iso.slice(0, 10);
  const report = {};

  const weights = await list(tok, "weight", `weight.sample_time.physical_time >= "${iso}"`);
  for (const p of weights) {
    const d = findDate(p), v = findNum(p.weight || p, /gram|kilogram|weight|value/i);
    if (!d || !v) continue;
    const kg = /gram/i.test(v.k) && !/kilo/i.test(v.k) ? v.n / 1000 : v.n;
    await sql`insert into weigh_ins (day, weight, source) values (${d}, ${+kg.toFixed(2)}, 'fitbit') on conflict (day) do update set weight = excluded.weight where weigh_ins.source <> 'manual'`;
  }
  report.weight = weights.length;

  const fat = await list(tok, "body-fat", `body_fat.sample_time.physical_time >= "${iso}"`);
  for (const p of fat) {
    const d = findDate(p), v = findNum(p.bodyFat || p, /percent/i);
    if (d && v) await sql`insert into weigh_ins (day, bf, source) values (${d}, ${v.n}, 'fitbit') on conflict (day) do update set bf = excluded.bf`;
  }
  report.bodyFat = fat.length;

  const rhr = await list(tok, "daily-resting-heart-rate", `daily_resting_heart_rate.date >= "${day}"`);
  for (const p of rhr) {
    const d = findDate(p), v = findNum(p, /beats|bpm|rate|value/i);
    if (d && v) await sql`insert into daily (day, rhr) values (${d}, ${v.n}) on conflict (day) do update set rhr = excluded.rhr`;
  }
  report.rhr = rhr.length;

  const hrv = await list(tok, "daily-heart-rate-variability", `daily_heart_rate_variability.date >= "${day}"`);
  for (const p of hrv) {
    const d = findDate(p), v = findNum(p, /rmssd|milli|variability|value/i);
    if (d && v) await sql`insert into daily (day, hrv) values (${d}, ${v.n}) on conflict (day) do update set hrv = excluded.hrv`;
  }
  report.hrv = hrv.length;

  const sleep = await list(tok, "sleep", `sleep.interval.civil_end_time >= "${day}"`);
  for (const p of sleep) {
    const d = findDate(p?.sleep?.interval ? { civilStartTime: p.sleep.interval.civilEndTime || p.sleep.interval.endTime } : p);
    const m = p?.sleep?.summary?.minutesAsleep;
    if (d && m != null) await sql`insert into daily (day, sleep_min) values (${d}, ${m}) on conflict (day) do update set sleep_min = excluded.sleep_min`;
  }
  report.sleep = sleep.length;

  const r = await fetch(`${API}/steps/dataPoints:dailyRollUp`, {
    method: "POST",
    headers: { authorization: `Bearer ${tok}`, "content-type": "application/json" },
    body: JSON.stringify({
      range: {
        start: { date: { year: since.getUTCFullYear(), month: since.getUTCMonth() + 1, day: since.getUTCDate() }, time: { hours: 0, minutes: 0, seconds: 0, nanos: 0 } },
        end: (() => { const e = new Date(); return { date: { year: e.getUTCFullYear(), month: e.getUTCMonth() + 1, day: e.getUTCDate() }, time: { hours: 23, minutes: 59, seconds: 59, nanos: 0 } }; })()
      },
      windowSizeDays: 1
    })
  });
  if (r.ok) {
    const j = await r.json();
    for (const p of j.rollupDataPoints || []) {
      const d = findDate(p), n = p?.steps?.countSum;
      if (d && n != null) await sql`insert into daily (day, steps) values (${d}, ${Math.round(n)}) on conflict (day) do update set steps = excluded.steps`;
    }
    report.steps = (j.rollupDataPoints || []).length;
  } else report.steps = `error ${r.status}`;

  await sql`update google set last_sync = now(), last_error = null where id = 1`;
  return report;
}
