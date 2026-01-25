// planner/js/ui/radar.js
import { getActiveDay, getMuscleGoal, estimate1RM } from "../state/state.js";

const AXES = ["Muscles", "Brains", "Discipline", "Endurance", "Mental"];

const KEY_BY_AXIS = {
  Muscles: "muscles",
  Brains: "brains",
  Discipline: "discipline",
  Endurance: "endurance",
  Mental: "mental",
};

// ✅ твої максимуми
const MAX_BY_KEY = {
  muscles: 1,
  brains: 1,
  discipline: 1,
  endurance: 2, // ⬅️ максимум 2
  mental: 3,    // ⬅️ максимум 3
};

export function drawRadar(state) {
  try {
    const canvas = document.getElementById("radar");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // auto-resize + fallback (щоб не було 0x0)
    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width || 280);
    const h = Math.round(rect.height || 280);
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;

    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.36;

    // grid
    ctx.strokeStyle = "rgba(255,255,255,.10)";
    ctx.lineWidth = 1;
    for (let k = 1; k <= 4; k++) {
      polygon(ctx, cx, cy, radius * (k / 4), AXES.length);
    }

    // axes + labels
    AXES.forEach((name, i) => {
      const a = angleFor(i, AXES.length);
      const x = cx + Math.cos(a) * radius;
      const y = cy + Math.sin(a) * radius;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.stroke();

      ctx.fillStyle = "rgba(231,236,255,.85)";
      ctx.font = "12px system-ui";

      const text = name;
      const textW = ctx.measureText(text).width;

      let tx = x;
      let ty = y;

      // горизонталь
      if (x < cx) tx = x - textW - 8;
      else tx = x + 8;

      // вертикаль
      if (y < cy) ty = y - 6;
      else ty = y + 14;

      // захист від виходу за canvas
      tx = Math.max(6, Math.min(tx, w - textW - 6));
      ty = Math.max(12, Math.min(ty, h - 6));

      ctx.fillText(text, tx, ty);
    });

    // values (raw)
    const vals = getDayScores(state);

    // points (0..1)
    const points = AXES.map((axis, i) => {
      const key = KEY_BY_AXIS[axis];
      const raw = toNum(vals?.[key], 0);
      const max = Math.max(1, toNum(MAX_BY_KEY?.[key], 1)); // не даємо 0

      const v = clamp(raw / max, 0, 1);

      const a = angleFor(i, AXES.length);
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
  } catch (err) {
    // щоб графік не зникав “мовчки”
    console.error("Radar error:", err);
  }
}

function getDayScores(state) {
  const day = getActiveDay(state);

  // raw values (не 0..1)
  const byCat = { muscles: 0, brains: 0, endurance: 0, mental: 0, discipline: 0 };
  if (!day) return byCat;

  const tasks = Array.isArray(day.tasks) ? day.tasks : [];

  // ✅ brains = 1 якщо є хоч 1 done
  // ✅ mental рахуємо до 3
  // ✅ endurance рахуємо до 2
  for (const t of tasks) {
    if (!t?.done) continue;
    const cat = (t.category || "").toLowerCase();

    if (cat === "brains") byCat.brains = 1;
    if (cat === "mental") byCat.mental = Math.min(byCat.mental + 1, 3);
    if (cat === "endurance") byCat.endurance = Math.min(byCat.endurance + 1, 2);
  }

  // muscles: score 0..1, але ми зберігаємо як raw 0..1 (бо muscles max=1)
  byCat.muscles = calcMusclesScore(state, tasks);

  // discipline: 0..1 (залишимо як було)
  const d =
    (byCat.muscles > 0 ? 1 : 0) +
    (byCat.brains ? 1 : 0) +
    (byCat.endurance > 0 ? 1 : 0) +
    (byCat.mental > 0 ? 1 : 0);

  byCat.discipline = d / 4;

  return byCat;
}

function calcMusclesScore(state, tasks) {
  const done = tasks.filter((t) => t?.done && (t.category || "").toLowerCase() === "muscles");
  if (done.length === 0) return 0;

  const bestByExercise = new Map(); // exKey -> best1RM

  for (const t of done) {
    const exRaw = t.exercise ?? t.title ?? "";
    const exKey = norm(exRaw);
    if (!exKey) continue;

    const cur1RM = estimate1RM(toNum(t.weight, 0), toNum(t.reps, 0));
    const prev = bestByExercise.get(exKey) ?? 0;
    if (cur1RM > prev) bestByExercise.set(exKey, cur1RM);
  }

  const exercises = [...bestByExercise.keys()];
  if (exercises.length === 0) return 0;

  let sum = 0;
  let cnt = 0;

  for (const exKey of exercises) {
    const goal = getMuscleGoal(state, exKey);
    if (!goal) continue;

    const goalW = toNum(goal.weight, 0);
    const goalR = toNum(goal.reps, 0);
    if (goalW <= 0 || goalR <= 0) continue;

    const goal1RM = estimate1RM(goalW, goalR);
    if (goal1RM <= 0) continue;

    const cur1RM = bestByExercise.get(exKey) ?? 0;
    const ratio = clamp(cur1RM / goal1RM, 0, 1);

    sum += ratio;
    cnt++;
  }

  // якщо цілей нема — все одно трохи рухається
  if (cnt === 0) return 0.2;

  return sum / cnt;
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

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function norm(s) {
  return String(s ?? "").trim().toLowerCase();
}

function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

