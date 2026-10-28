import { sql } from "../../lib/db";
import { loadShare } from "../../lib/share";
import { WEEKS, MODS, target, curWeek, e1rm, DEFAULT_LIFTS } from "../../lib/plan";

export const dynamic = "force-dynamic";

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = d => new Date(d + "T12:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });

function spark(points) {
  if (points.length < 2) return "";
  const W = 600, H = 140, P = { l: 36, r: 12, t: 12, b: 22 };
  const t0 = +new Date(points[0].d), t1 = +new Date(points.at(-1).d);
  const vs = points.map(p => p.w), lo = Math.floor(Math.min(...vs) - 1), hi = Math.ceil(Math.max(...vs) + 1);
  const x = d => P.l + (+new Date(d) - t0) / Math.max(1, t1 - t0) * (W - P.l - P.r);
  const y = v => P.t + (hi - v) / (hi - lo) * (H - P.t - P.b);
  const pts = points.map(p => `${x(p.d).toFixed(1)},${y(p.w).toFixed(1)}`).join(" ");
  const last = points.at(-1);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Body weight trend">
    <line x1="${P.l}" x2="${W - P.r}" y1="${y(hi)}" y2="${y(hi)}" stroke="var(--line)"/><line x1="${P.l}" x2="${W - P.r}" y1="${y(lo)}" y2="${y(lo)}" stroke="var(--line)"/>
    <text x="${P.l - 6}" y="${y(hi) + 4}" text-anchor="end" font-size="11" fill="var(--muted)">${hi}</text><text x="${P.l - 6}" y="${y(lo) + 4}" text-anchor="end" font-size="11" fill="var(--muted)">${lo}</text>
    <polyline points="${pts}" fill="none" stroke="var(--plate)" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="${x(last.d)}" cy="${y(last.w)}" r="5" fill="var(--plate)"/>
    <text x="${P.l}" y="${H - 6}" font-size="11" fill="var(--muted)">${fmt(points[0].d)}</text><text x="${W - P.r}" y="${H - 6}" text-anchor="end" font-size="11" fill="var(--muted)">${fmt(last.d)}</text>
  </svg>`;
}

export async function GET(req) {
  const k = new URL(req.url).searchParams.get("k");
  const ok = await loadShare(k).catch(() => null);
  if (!ok) return new Response("<!doctype html><meta name=viewport content='width=device-width'><body style='font:16px system-ui;padding:24px;background:#0d0f12;color:#f2efe8'>This link isn't active. Ask KT for a new one.", { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
  const { share, kv } = ok;
  const lifts = kv.kt_lifts || DEFAULT_LIFTS, workouts = kv.kt_workouts || [], sess = kv.kt_sess || {};
  const cw = curWeek();

  const names = [...lifts.map(l => l.n)];
  workouts.forEach(w => { if (!names.includes(w.lift)) names.push(w.lift); });
  const pbs = names.map(n => {
    let b = null;
    workouts.filter(w => w.lift === n).forEach(w => w.sets.forEach(s => { if (!b || e1rm(s) > e1rm(b.s)) b = { s, d: w.d }; }));
    return b && { n, b };
  }).filter(Boolean);

  let weigh = [];
  if (share.weight || share.bodycomp) weigh = await sql`select to_char(day,'YYYY-MM-DD') d, weight w, bf, ffm from weigh_ins where day >= '2026-10-01' order by day`;
  const wpts = weigh.filter(r => r.w);
  const lastW = wpts.at(-1), firstW = wpts[0];
  const lastBc = [...weigh].reverse().find(r => r.bf || r.ffm);

  let photos = [];
  if (share.photos) photos = await sql`select id, to_char(taken_on,'YYYY-MM-DD') d from photos order by taken_on, created_at`;

  const modRows = MODS.map(m => {
    const n = sess[m.k + "_" + cw] || 0;
    const step = m.k === "str" ? lifts.map(l => `${l.n} ${target(l, cw)}kg`).join(" · ") : m.steps[cw];
    return `<tr><td><strong>${m.n}</strong></td><td class="num">${n} / ${m.target}</td><td>${esc(step)}</td></tr>`;
  }).join("");

  const ladder = `<thead><tr><th>Week</th>${lifts.map(l => `<th>${esc(l.n)}</th>`).join("")}<th>Prescription</th></tr></thead><tbody>${WEEKS.map((w, i) => `<tr class="${i === cw ? "now" : ""}"><td>W${i + 1} · ${w.d}${i === 4 ? " · deload" : i === 6 ? " · test" : ""}</td>${lifts.map(l => `<td class="num">${target(l, i)}kg</td>`).join("")}<td>${i === 4 ? "2×8 easy" : i === 6 ? "Work up to 1×5" : "3×8, last set to failure"}</td></tr>`).join("")}</tbody>`;

  const hist = [...workouts].reverse().slice(0, 15).map(w => `<li><span><strong>${esc(w.lift)}</strong> · ${w.sets.map(s => `${s.kg}×${s.reps}`).join(", ")}</span><span class="muted">${fmt(w.d)}${w.pr ? " · <b class='pr'>PR</b>" : ""}</span></li>`).join("") || `<li class="muted">No sessions logged yet.</li>`;
  const pbl = pbs.map(x => `<li><span><strong>${esc(x.n)}</strong> · ${x.b.s.kg}kg × ${x.b.s.reps}</span><span class="muted">est. 1RM ${Math.round(e1rm(x.b.s))}kg · ${fmt(x.b.d)}</span></li>`).join("") || `<li class="muted">PBs appear after the first logged lift.</li>`;

  const goals = [["Lat pulldown", "55kg", "60kg (stretch 65kg)"], ["Leg press top set", "~120kg", "150kg"], ["Pull-up", "Assisted", "1 unassisted"], ["5K", "Can complete", "Sub-35 min"], ["Sessions / week", "~4", "4+ average"]];
  if (share.weight) goals.unshift(["Body weight", lastW ? `${lastW.w}kg` : "–", "~62.5kg (≈0.65kg/week)"]);

  const body = (share.weight && wpts.length) || (share.bodycomp && lastBc) ? `<section><h2>Body</h2><div class="card">
    ${share.weight && lastW ? `<div class="stats"><div><span class="muted">Latest weight</span><b>${lastW.w}kg</b></div>${firstW && firstW !== lastW ? `<div><span class="muted">Change since ${fmt(firstW.d)}</span><b>${(lastW.w - firstW.w > 0 ? "+" : "") + (lastW.w - firstW.w).toFixed(1)}kg</b></div>` : ""}${share.bodycomp && lastBc?.bf ? `<div><span class="muted">Body fat (scale)</span><b>${lastBc.bf}%</b></div>` : ""}${share.bodycomp && lastBc?.ffm ? `<div><span class="muted">Fat-free mass</span><b>${lastBc.ffm}kg</b></div>` : ""}</div>${spark(wpts)}` : ""}
    ${!share.weight && share.bodycomp && lastBc ? `<div class="stats">${lastBc.bf ? `<div><span class="muted">Body fat (scale)</span><b>${lastBc.bf}%</b></div>` : ""}${lastBc.ffm ? `<div><span class="muted">Fat-free mass</span><b>${lastBc.ffm}kg</b></div>` : ""}</div>` : ""}
  </div></section>` : "";

  const pics = share.photos && photos.length ? `<section><h2>Progress photos</h2><div class="photos">${photos.map(p => `<figure><img src="/trainer/photo?k=${encodeURIComponent(k)}&id=${encodeURIComponent(p.id)}" alt="Progress photo ${fmt(p.d)}" loading="lazy"><figcaption>${fmt(p.d)}</figcaption></figure>`).join("")}</div></section>` : "";

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>KT · Training block</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800;900&family=IBM+Plex+Sans:wght@400;600&display=swap">
<style>
:root{--bg:#0d0f12;--panel:#161a1f;--panel2:#1d2229;--line:#2c333c;--fg:#f2efe8;--muted:#a9b0b9;--plate:#f2b33d;--good:#5fd38d;color-scheme:dark}
@media (prefers-color-scheme: light){:root{--bg:#f4f2ee;--panel:#fff;--panel2:#ece9e2;--line:#d6d1c6;--fg:#15171a;--muted:#545b64;--plate:#a66c00;--good:#1f8a4c;color-scheme:light}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 "IBM Plex Sans",system-ui,sans-serif}
.wrap{max-width:960px;margin:0 auto;padding:28px max(16px,env(safe-area-inset-left)) 56px;display:grid;gap:32px}
h1,h2{font-family:"Big Shoulders Display",Impact,sans-serif;text-transform:uppercase;line-height:.95;margin:0}h1{font-size:clamp(40px,9vw,72px);font-weight:900}h1 span{color:var(--plate)}h2{font-size:30px;margin-bottom:12px}
.eyebrow{font:600 12px ui-monospace,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--plate)}
.muted{color:var(--muted)}section{display:grid}.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px;display:grid;gap:12px;min-width:0}
.scroll{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:14px;min-width:520px}th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}th{font:600 11px ui-monospace,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.num{font-variant-numeric:tabular-nums;white-space:nowrap}tr.now td{background:color-mix(in srgb,var(--plate) 14%,transparent)}
.two{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}li{background:var(--panel2);border-radius:8px;padding:9px 12px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}
.pr{color:var(--plate)}.stats{display:flex;flex-wrap:wrap;gap:24px}.stats div{display:grid}.stats b{font:900 30px/1.1 "Big Shoulders Display",Impact,sans-serif}
svg{width:100%;height:auto;display:block}.photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}figure{margin:0;display:grid;gap:4px}figure img{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:8px;background:var(--panel2)}figcaption{font-size:12px;color:var(--muted)}
.notes{display:grid;gap:6px;margin:0;padding-left:18px}
</style></head><body><div class="wrap">
<header style="display:grid;gap:10px"><div class="eyebrow">Shared by KT · read-only · updates live</div><h1>8-week block<br><span>Week ${cw + 1} · ${WEEKS[cw].t}</span></h1><p class="muted" style="margin:0">27 Oct → 22 Dec 2026. Target is 2 strength sessions plus combat and conditioning each week.</p></header>
<section><h2>This week</h2><div class="card scroll"><table><thead><tr><th>Modality</th><th>Done / target</th><th>Focus this week</th></tr></thead><tbody>${modRows}</tbody></table></div></section>
<section><h2>Load ladder</h2><div class="card"><div class="scroll"><table>${ladder}</table></div>
<ul class="notes muted" style="display:block"><li style="background:none;padding:0;display:list-item">Top working set. Upper body progresses ~2%/week, lower body ~4%, rounded to machine increments.</li><li style="background:none;padding:0;display:list-item">Progression rule: hit 3×8 at target → go up next week. Miss two weeks running → repeat the week.</li><li style="background:none;padding:0;display:list-item">Lifting goes before any combat class on the same day.</li></ul></div></section>
<section><div class="two"><div class="card"><h2 style="margin:0">Recent sessions</h2><ul>${hist}</ul></div><div class="card"><h2 style="margin:0">Personal bests</h2><ul>${pbl}</ul><p class="muted" style="margin:0;font-size:13px">Ranked by estimated 1RM (Epley).</p></div></div></section>
<section><h2>Goals by 22 Dec</h2><div class="card scroll"><table><thead><tr><th>Marker</th><th>Now</th><th>Target</th></tr></thead><tbody>${goals.map(g => `<tr><td>${g[0]}</td><td class="num">${g[1]}</td><td class="num" style="color:var(--plate);font-weight:600">${g[2]}</td></tr>`).join("")}</tbody></table></div></section>
${body}${pics}
</div></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
}
