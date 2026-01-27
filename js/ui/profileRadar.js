import { calcOverallMusclesProgress } from "../state/state.js";
import { drawRadar } from "./radar.js"; // не обовʼязково, але залишимо порядок
import { estimate1RM } from "../state/state.js"; // (може знадобитись пізніше)

const AXES = ["Progres","Muscles","Brains","Discipline","Endurance","Mental"];
const KEY = {
  Progres: "progres",
  Muscles: "muscles",
  Brains: "brains",
  Discipline: "discipline",
  Endurance: "endurance",
  Mental: "mental",
};

export function drawProfileRadar(state){
  const canvas = document.getElementById("profileRadar");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
  }

  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h);

  const cx = w/2, cy = h/2;
  const radius = Math.min(w,h) * 0.36;

  // grid
  ctx.strokeStyle = "rgba(255,255,255,.10)";
  ctx.lineWidth = 1;
  for (let k=1;k<=4;k++){
    polygon(ctx, cx, cy, radius*(k/4), AXES.length);
  }

  // axes + labels
  AXES.forEach((name,i)=>{
    const a = angleFor(i, AXES.length);
    const x = cx + Math.cos(a)*radius;
    const y = cy + Math.sin(a)*radius;

    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.lineTo(x,y);
    ctx.stroke();

    ctx.fillStyle = "rgba(231,236,255,.85)";
    ctx.font = "12px system-ui";

    const text = name;
    const textW = ctx.measureText(text).width;

    let tx = x, ty = y;
    if (x < cx) tx = x - textW - 8; else tx = x + 8;
    if (y < cy) ty = y - 6; else ty = y + 14;

    tx = Math.max(6, Math.min(tx, w - textW - 6));
    ty = Math.max(12, Math.min(ty, h - 6));

    ctx.fillText(text, tx, ty);
  });

  const vals = getProfileScores(state); // 0..1

  const points = AXES.map((axis,i)=>{
    const key = KEY[axis];
    const v = clamp(vals[key] ?? 0, 0, 1);
    const a = angleFor(i, AXES.length);
    return [cx + Math.cos(a)*radius*v, cy + Math.sin(a)*radius*v];
  });

  ctx.fillStyle = "rgba(255,59,59,.20)";
  ctx.strokeStyle = "rgba(255,59,59,.65)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  points.forEach((p,idx)=> idx===0 ? ctx.moveTo(p[0],p[1]) : ctx.lineTo(p[0],p[1]));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function getProfileScores(state){
  // 1) Progres = muscles progress по цілях
  const progres = calcOverallMusclesProgress(state);

  // 2) average по днях (для 5 осей як на основному радарі)
  // щоб не дублювати логіку, беремо "як є":
  // - brains/endurance/mental = частка днів де хоч 1 done в категорії
  // - muscles = середній muscles score по днях (по цілях)
  // - discipline = середній discipline по днях
  const days = Array.isArray(state.days) ? state.days : [];
  if (days.length === 0) {
    return { progres, muscles:0, brains:0, discipline:0, endurance:0, mental:0 };
  }

  let sum = { muscles:0, brains:0, discipline:0, endurance:0, mental:0 };
  let n = 0;

  for (const d of days){
    const tasks = Array.isArray(d.tasks) ? d.tasks : [];

    let brains = 0, endurance = 0, mental = 0;

    for (const t of tasks){
      if (!t?.done) continue;
      if (t.category === "brains") brains = 1;
      if (t.category === "endurance") endurance = 1;
      if (t.category === "mental") mental = 1;
    }

    const muscles = calcDayMuscles(state, tasks); // 0..1

    const disc =
      (muscles > 0 ? 1 : 0) +
      (brains ? 1 : 0) +
      (endurance ? 1 : 0) +
      (mental ? 1 : 0);

    const discipline = disc / 4;

    sum.muscles += muscles;
    sum.brains += brains;
    sum.endurance += endurance;
    sum.mental += mental;
    sum.discipline += discipline;
    n++;
  }

  return {
    progres,
    muscles: sum.muscles / n,
    brains: sum.brains / n,
    endurance: sum.endurance / n,
    mental: sum.mental / n,
    discipline: sum.discipline / n,
  };
}

function calcDayMuscles(state, tasks){
  const done = tasks.filter(t => t?.done && t.category === "muscles");
  if (done.length === 0) return 0;

  const goals = state?.goals?.muscles ?? {};
  const bestByEx = new Map();

  for (const t of done){
    const exKey = String(t.exercise ?? t.title ?? "").trim().toLowerCase();
    if (!exKey) continue;

    const one = estimate1RM(t.weight, t.reps);
    const prev = bestByEx.get(exKey) ?? 0;
    if (one > prev) bestByEx.set(exKey, one);
  }

  let sum = 0, cnt = 0;

  for (const [exKey, best] of bestByEx.entries()){
    const goal = goals[exKey];
    if (!goal || !goal.weight || !goal.reps) continue;

    const goal1 = estimate1RM(goal.weight, goal.reps);
    if (goal1 <= 0) continue;

    sum += clamp(best / goal1, 0, 1);
    cnt++;
  }

  if (cnt === 0) return 0.2; // щоб не було “0” якщо цілей ще нема
  return sum / cnt;
}

function polygon(ctx, cx, cy, r, n){
  ctx.beginPath();
  for (let i=0;i<n;i++){
    const a = angleFor(i,n);
    const x = cx + Math.cos(a)*r;
    const y = cy + Math.sin(a)*r;
    if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.closePath();
  ctx.stroke();
}
function angleFor(i,n){ return -Math.PI/2 + (Math.PI*2*i)/n; }
function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }
