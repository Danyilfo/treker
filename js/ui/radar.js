// planner/js/ui/radar.js
import { getActiveDay, getMuscleGoal, estimate1RM } from "../state/state.js";

/**
 * AXES keys in fixed order (no dependency on label text)
 */
const AXIS_KEYS = ["muscles", "brains", "discipline", "endurance", "mental"];

/**
 * Category caps:
 * - brains: max 1 (як було)
 * - endurance: max 2
 * - mental: max 3
 * muscles рахуємо окремо
 */
const CAPS = {
  brains: 1,
  endurance: 2,
  mental: 3,
};

/**
 * Labels in 2 languages
 */
const LABELS = {
  uk: {
    muscles: "Muscles",
    brains: "Brains",
    discipline: "Discipline",
    endurance: "Endurance",
    mental: "Mental",
  },
  en: {
    muscles: "Muscles",
    brains: "Brains",
    discipline: "Discipline",
    endurance: "Endurance",
    mental: "Mental",
  },
};

/**
 * Public API:
 * - drawRadar(state) -> draws #radar
 * - drawProfileRadar(state) -> draws #profileRadar (average scores)
 */
export function drawRadar(state) {
  drawRadarOnCanvas(state, "radar", { mode: "day" });
}

export function drawProfileRadar(state) {
  drawRadarOnCanvas(state, "profileRadar", { mode: "avg" });
}

/* ---------------- core ---------------- */

function drawRadarOnCanvas(state, canvasId, { mode }) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // resize to real CSS size (important on iPhone)
  const rect = canvas.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
  }

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) * 0.36;

  // grid
  ctx.strokeStyle = "rgba(255,255,255,.10)";
  ctx.lineWidth = 1;
  for (let k = 1; k <= 4; k++) {
    polygon(ctx, cx, cy, radius * (k / 4), AXIS_KEYS.length);
  }

  const lang = getLang();
  const labels = LABELS[lang] ?? LABELS.en;

  // axes + labels
  AXIS_KEYS.forEach((key, i) => {
    const a = angleFor(i, AXIS_KEYS.length);
    const x = cx + Math.cos(a) * radius;
    const y = cy + Math.sin(a) * radius;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();

    const text = labels[key] ?? key;

    ctx.fillStyle = "rgba(231,236,255,.85)";
    ctx.font = "12px system-ui";

    // safe placement (no clipping)
    const textW = ctx.measureText(text).width;

    let tx = x;
    let ty = y;

    if (x < cx) tx = x - textW - 8;
    else tx = x + 8;

    if (y < cy) ty = y - 6;
    else ty = y + 14;

    tx = Math.max(6, Math.min(tx, w - textW - 6));
    ty = Math.max(12, Math.min(ty, h - 6));

    ctx.fillText(text, tx, ty);
  });

  // values 0..1
  const vals = mode === "avg" ? getAverageScores(state) : getDayScores(state);

  const points = AXIS_KEYS.map((key, i) => {
    const v = clampNum(vals[key], 0, 1);
    const a = angleFor(i, AXIS_KEYS.length);
    return [cx + Math.cos(a) * radius * v, cy + Math.sin(a) * radius * v];
  });

  // fill
  ctx.fillStyle = "rgba(255,59,59,.20)";
  ctx.strokeStyle = "rgba(255,59,59,.65)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  points.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/* ---------------- scoring ---------------- */

function getDayScores(state) {
  const day = getActiveDay(state);
  const by = { muscles: 0, brains: 0, endurance: 0, mental: 0, discipline: 0 };
  if (!day) return by;

  const tasks = Array.isArray(day.tasks) ? day.tasks : [];

  // count done per category (brains/endurance/mental)
  const doneCount = { brains: 0, endurance: 0, mental: 0 };

  for (const t of tasks) {
    if (!t?.done) continue;
    const cat = String(t.category ?? "").toLowerCase();
    if (cat in doneCount) doneCount[cat] += 1;
  }

  // normalize by caps (0..1)
  by.brains = toCapScore(doneCount.brains, CAPS.brains);
  by.endurance = toCapScore(doneCount.endurance, CAPS.endurance);
  by.mental = toCapScore(doneCount.mental, CAPS.mental);

  // muscles separately (0..1)
  by.muscles = calcMusclesScore(state, tasks);

  // discipline: 4 buckets (muscles + brains + endurance + mental), each gives 1 if >0
  const d =
    (by.muscles > 0 ? 1 : 0) +
    (by.brains > 0 ? 1 : 0) +
    (by.endurance > 0 ? 1 : 0) +
    (by.mental > 0 ? 1 : 0);

  by.discipline = d / 4;

  return by;
}

function getAverageScores(state) {
  const days = Array.isArray(state?.days) ? state.days : [];
  if (days.length === 0) {
    return { muscles: 0, brains: 0, endurance: 0, mental: 0, discipline: 0 };
  }

  let sum = { muscles: 0, brains: 0, endurance: 0, mental: 0, discipline: 0 };
  let n = 0;

  for (const d of days) {
    // тимчасово підставляємо activeDayId, щоб reuse getDayScores
    const tmp = state.activeDayId;
    state.activeDayId = d.id;

    const s = getDayScores(state);

    state.activeDayId = tmp;

    sum.muscles += safeNum(s.muscles);
    sum.brains += safeNum(s.brains);
    sum.endurance += safeNum(s.endurance);
    sum.mental += safeNum(s.mental);
    sum.discipline += safeNum(s.discipline);
    n += 1;
  }

  return {
    muscles: clampNum(sum.muscles / n, 0, 1),
    brains: clampNum(sum.brains / n, 0, 1),
    endurance: clampNum(sum.endurance / n, 0, 1),
    mental: clampNum(sum.mental / n, 0, 1),
    discipline: clampNum(sum.discipline / n, 0, 1),
  };
}

function calcMusclesScore(state, tasks) {
  const done = tasks.filter((t) => t?.done && String(t.category ?? "").toLowerCase() === "muscles");
  if (done.length === 0) return 0;

  // best 1RM per exercise
  const bestByExercise = new Map(); // exKey -> best1RM

  for (const t of done) {
    const exRaw = t.exercise ?? t.title ?? "";
    const exKey = norm(exRaw);
    if (!exKey) continue;

    const cur1rm = safeNum(estimate1RM(t.weight, t.reps));
    const prev = safeNum(bestByExercise.get(exKey));
    if (cur1rm > prev) bestByExercise.set(exKey, cur1rm);
  }

  const keys = [...bestByExercise.keys()];
  if (keys.length === 0) return 0;

  let sum = 0;
  let cnt = 0;

  for (const exKey of keys) {
    const goal = getMuscleGoal(state, exKey);
    if (!goal || !goal.weight || !goal.reps) continue;

    const goal1rm = safeNum(estimate1RM(goal.weight, goal.reps));
    if (goal1rm <= 0) continue;

    const cur1rm = safeNum(bestByExercise.get(exKey));
    const ratio = clampNum(cur1rm / goal1rm, 0, 1);

    sum += ratio;
    cnt += 1;
  }

  // якщо цілей нема — трошки рухаємо графік
  if (cnt === 0) return 0.2;

  return clampNum(sum / cnt, 0, 1);
}

/* ---------------- helpers ---------------- */

function toCapScore(doneCount, cap) {
  const d = safeNum(doneCount);
  const c = Math.max(1, safeNum(cap));
  return clampNum(d / c, 0, 1);
}

function polygon(ctx, cx, cy, r, n) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = angleFor(i, n);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}

function angleFor(i, n) {
  return -Math.PI / 2 + (Math.PI * 2 * i) / n;
}

function clampNum(v, a, b) {
  const x = safeNum(v);
  return Math.max(a, Math.min(b, x));
}

function safeNum(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function norm(s) {
  return String(s ?? "").trim().toLowerCase();
}

// language source (works even before app.js is ready)
function getLang() {
  const ls = (localStorage.getItem("planner_lang") || "").toLowerCase();
  if (ls === "uk" || ls === "en") return ls;

  const htmlLang = (document.documentElement.lang || "").toLowerCase();
  if (htmlLang.startsWith("uk")) return "uk";
  if (htmlLang.startsWith("en")) return "en";

  return "uk";
}
