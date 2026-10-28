export const WEEKS = [
  { d: "27 Oct", t: "Re-entry" }, { d: "3 Nov", t: "New stimulus" }, { d: "10 Nov", t: "Find your rhythm" }, { d: "17 Nov", t: "Travel week (Sydney)" },
  { d: "24 Nov", t: "Deload" }, { d: "1 Dec", t: "Build" }, { d: "8 Dec", t: "Test week" }, { d: "15 Dec", t: "Bank it" }
];

export const MODS = [
  { k: "str", n: "Strength", target: 2 },
  { k: "c25k", n: "Couch to 5K", target: 2, steps: ["1 run · C25K wk3 intervals, re-entry pace", "2 runs · C25K wk4 (5 min runs)", "2 runs · C25K wk5 days 1–2", "1 run · 20 min continuous", "2 easy runs · 20–25 min (deload)", "2 runs · C25K wk7, 25 min continuous", "5K time trial · new baseline", "2 runs · C25K wk9, 30 min continuous"] },
  { k: "yoga", n: "Hot yoga", target: 1, steps: ["Rest week", "First class", "1 class", "Optional · stretch session", "1–2 classes · recovery", "1 class · deeper low lunge for kicks", "1 class · after test-week lifts", "Optional"] },
  { k: "box", n: "Boxing", target: 1, steps: ["Jab-cross-hook clean both stances", "3 × 3 min bag rounds, pace held", "Add slip + roll after the cross", "3 rounds shadowboxing", "Technique only · slow, perfect reps", "4 × 3 min rounds, guard up", "One full-pace pad round", "5 rounds, last one hardest"] },
  { k: "mt", n: "Muay Thai / MMA", target: 2, steps: ["Book into fundamentals timetable", "First fundamentals class", "2 classes · teep + roundhouse both sides", "1 drop-in class", "Technique only · no hard sparring", "2 classes · start clinch drills", "Full-pace pad round · kicks, knees, elbows", "2 classes"] }
];

const MULT = [1, 1, 1, 1, 0.9, 1, 1, 1];
export function target(l, i) {
  const r = l.t === "l" ? 0.04 : 0.02, inc = l.t === "l" ? 5 : 2.5;
  const prog = i < 4 ? i : i === 4 ? 3 : i - 1;
  const raw = l.kg * Math.pow(1 + r, prog) * MULT[i];
  return Math.max(l.kg * MULT[i] >= l.kg ? l.kg : 0, Math.round(raw / inc) * inc);
}

export function melbToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(new Date());
}

export function curWeek() {
  const now = new Date(melbToday() + "T12:00:00");
  let c = 0;
  WEEKS.forEach((w, i) => { if (now >= new Date(w.d + " 2026 00:00")) c = i; });
  return c;
}

export const e1rm = s => s.kg * (1 + s.reps / 30);
export const DEFAULT_LIFTS = [{ n: "Lat pulldown", kg: 55, t: "u" }, { n: "Leg press", kg: 120, t: "l" }];
