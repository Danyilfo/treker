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

export function drawRadar(state) {
  const canvas = document.getElementById("radar");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // auto-resize під реальний розмір (щоб не було 0x0 / мило)
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
const metrics = ctx.measureText(text);
const textW = metrics.width;

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

  // values 0..1
  const vals = getDayScores(state);

  const points = AXES.map((axis, i) => {
    const key = KEY_BY_AXIS[axis];
    const v = clamp(vals[key] ?? 0, 0, 1);
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
}

function getDayScores(state) {
  const day = getActiveDay(state);

  const byCat = { muscles: 0, brains: 0, endurance: 0, mental: 0, discipline: 0 };
  if (!day) return byCat;

  const tasks = Array.isArray(day.tasks) ? day.tasks : [];

  // simple categories: 1 якщо є хоч одна done
  for (const t of tasks) {
    if (!t?.done) continue;
    if (!t.category) continue;
    if (t.category !== "muscles") byCat[t.category] = 1;
  }

  // muscles: % до goal (середнє по вправах)
  byCat.muscles = calcMusclesScore(state, tasks);

  // discipline: максимум 4 бали (muscles + brains + endurance + mental)
  const d =
    (byCat.muscles > 0 ? 1 : 0) +
    (byCat.brains ? 1 : 0) +
    (byCat.endurance ? 1 : 0) +
    (byCat.mental ? 1 : 0);

  byCat.discipline = d / 4;

  return byCat;
}

function calcMusclesScore(state, tasks) {
  const done = tasks.filter((t) => t?.done && t.category === "muscles");
  if (done.length === 0) return 0;

  // best 1RM per exercise
  const bestByExercise = new Map(); // exKey -> best1RM

  for (const t of done) {
    const exRaw = t.exercise ?? t.title ?? "";
    const exKey = norm(exRaw);
    if (!exKey) continue;

    const cur1RM = estimate1RM(t.weight, t.reps);
    const prev = bestByExercise.get(exKey) ?? 0;
    if (cur1RM > prev) bestByExercise.set(exKey, cur1RM);
  }

  const exercises = [...bestByExercise.keys()];
  if (exercises.length === 0) return 0;

  let sum = 0;
  let cnt = 0;

  for (const exKey of exercises) {
    const goal = getMuscleGoal(state, exKey); // state.js нормалізує ключ теж
    if (!goal || !goal.weight || !goal.reps) continue;

    const goal1RM = estimate1RM(goal.weight, goal.reps);
    if (goal1RM <= 0) continue;

    const cur1RM = bestByExercise.get(exKey) ?? 0;
    const ratio = clamp(cur1RM / goal1RM, 0, 1);

    sum += ratio;
    cnt++;
  }

  // якщо цілей не задано — графік все одно трохи рухається
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
