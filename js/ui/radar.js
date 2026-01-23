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

  // auto-resize під реальний розмір
  const rect = canvas.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    const cw = Math.round(rect.width);
    const ch = Math.round(rect.height);
    if (canvas.width !== cw) canvas.width = cw;
    if (canvas.height !== ch) canvas.height = ch;
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
  const vals = getDayScores(state);

  const points = AXES.map((axis, i) => {
    const key = KEY_BY_AXIS[axis];
    const vRaw = vals[key] ?? 0;
    const v = safeClamp(vRaw, 0, 1); // ✅ захист від NaN/Infinity

    const a = angleFor(i, AXES.length);
    const px = cx + Math.cos(a) * radius * v;
    const py = cy + Math.sin(a) * radius * v;

    return [px, py];
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

  // ✅ фінальний safe (щоб нічого не зламало canvas)
  byCat.muscles = safeClamp(byCat.muscles, 0, 1);
  byCat.brains = safeClamp(byCat.brains, 0, 1);
  byCat.endurance = safeClamp(byCat.endurance, 0, 1);
  byCat.mental = safeClamp(byCat.mental, 0, 1);
  byCat.discipline = safeClamp(byCat.discipline, 0, 1);

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

    const w = Number(t.weight ?? 0);
    const r = Number(t.reps ?? 0);

    // ✅ якщо reps/weight неадекватні — пропускаємо (інакше NaN)
    if (!Number.isFinite(w) || !Number.isFinite(r) || w <= 0 || r <= 0) continue;

    const cur1RM = Number(estimate1RM(w, r));
    if (!Number.isFinite(cur1RM) || cur1RM <= 0) continue;

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

    const gw = Number(goal.weight ?? 0);
    const gr = Number(goal.reps ?? 0);
    if (!Number.isFinite(gw) || !Number.isFinite(gr) || gw <= 0 || gr <= 0) continue;

    const goal1RM = Number(estimate1RM(gw, gr));
    if (!Number.isFinite(goal1RM) || goal1RM <= 0) continue;

    const cur1RM = bestByExercise.get(exKey) ?? 0;
    const ratio = safeClamp(cur1RM / goal1RM, 0, 1);

    sum += ratio;
    cnt++;
  }

  // якщо цілей не задано — графік все одно трохи рухається
  if (cnt === 0) return 0.2;

  return safeClamp(sum / cnt, 0, 1);
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

function safeClamp(v, a, b) {
  const num = Number(v);
  if (!Number.isFinite(num)) return a;
  return Math.max(a, Math.min(b, num));
}

function norm(s) {
  return String(s ?? "").trim().toLowerCase();
}

