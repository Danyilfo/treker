// planner/js/state/state.js
const LS_KEY = "planner_state_v1";

/* ----------------- state ----------------- */

export const state = loadState() ?? {
  days: [createDay(0)],
  activeDayId: null,
  streak: 0,
  taskFilter: "all",
  goals: { muscles: {} }, // exerciseKey -> {weight,reps}
  profile: {
  age: "",
  height: "",
  weight: "",
  avatar: "", // dataURL
},
};

if (!state.activeDayId) state.activeDayId = state.days[0]?.id ?? null;
state.goals = state.goals ?? { muscles: {} };
state.goals.muscles = state.goals.muscles ?? {};

/* ----------------- days ----------------- */

export function addDay(state) {
  const last = state.days[state.days.length - 1];
  const nextIndex = ((last?.weekdayIndex ?? -1) + 1) % 7;

  const d = createDay(nextIndex);
  state.days.push(d);
  state.activeDayId = d.id;
  saveState(state);
}

export function setActiveDay(state, dayId) {
  state.activeDayId = dayId;
  saveState(state);
}

export function moveActiveDay(state, delta) {
  const idx = state.days.findIndex(d => d.id === state.activeDayId);
  if (idx === -1) return;

  const next = idx + delta;
  if (next < 0 || next >= state.days.length) return;

  state.activeDayId = state.days[next].id;
  saveState(state);
}

export function resetActiveDay(state) {
  const day = getActiveDay(state);
  if (!day) return;
  day.tasks = [];
  saveState(state);
}

export function getActiveDay(state) {
  const days = Array.isArray(state.days) ? state.days : [];
  return days.find(d => d.id === state.activeDayId) ?? days[0] ?? null;
}

export function setTaskFilter(state, filter) {
  state.taskFilter = filter;
  saveState(state);
}

/* ----------------- tasks ----------------- */

export function addTask(state, payload) {
  const day = getActiveDay(state);
  if (!day) return;

  day.tasks = Array.isArray(day.tasks) ? day.tasks : [];

  const t = {
    id: uid(),
    category: payload.category, // muscles/brains/endurance/mental
    done: false,
    createdAt: Date.now(),
  };

  if (payload.category === "muscles") {
    t.type = "muscles";
    t.exercise = String(payload.exercise ?? "").trim() || "Exercise";
    t.sets = Number(payload.sets ?? 0);
    t.reps = Number(payload.reps ?? 0);
    t.weight = Number(payload.weight ?? 0);
    t.title = t.exercise;
  } else {
    t.type = "simple";
    t.title = String(payload.title ?? "").trim() || "Problem";
  }

  day.tasks.push(t);
  saveState(state);
}

export function toggleTask(state, taskId) {
  const day = getActiveDay(state);
  if (!day) return;

  day.tasks = Array.isArray(day.tasks) ? day.tasks : [];
  const t = day.tasks.find(x => x.id === taskId);
  if (!t) return;

  t.done = !t.done;
  saveState(state);
}

export function deleteTask(state, taskId) {
  const day = getActiveDay(state);
  if (!day) return;

  day.tasks = Array.isArray(day.tasks) ? day.tasks : [];
  day.tasks = day.tasks.filter(t => t.id !== taskId);
  saveState(state);
}

/* ----------------- muscles goals ----------------- */

export function setMuscleGoal(state, exercise, goalWeight, goalReps) {
  const key = normalizeExercise(exercise);
  if (!key) return;

  state.goals = state.goals ?? {};
  state.goals.muscles = state.goals.muscles ?? {};

  state.goals.muscles[key] = {
    weight: Number(goalWeight) || 0,
    reps: Number(goalReps) || 0,
  };

  saveState(state);
}

export function removeMuscleGoal(state, exercise) {
  const key = normalizeExercise(exercise);
  if (!key) return;

  if (state.goals?.muscles) delete state.goals.muscles[key];
  saveState(state);
}
// --- normalize (має бути в цьому файлі, вище за getMuscleGoal) ---
function norm(s) {
  return String(s ?? "").trim().toLowerCase();
}

// --- goals getters ---
export function getMuscleGoals(state) {
  return state?.goals?.muscles ?? {};
}

export function getMuscleGoal(state, exercise) {
  const key = norm(exercise);
  if (!key) return null;
  return state?.goals?.muscles?.[key] ?? null;
}



export function getMuscleHistory(state, exercise) {
  const key = normalizeExercise(exercise);
  if (!key) return [];

  const days = Array.isArray(state.days) ? state.days : [];
  const items = [];

  for (const d of days) {
    const tasks = Array.isArray(d.tasks) ? d.tasks : [];
    for (const t of tasks) {
      if (t?.category !== "muscles") continue;
      const exKey = normalizeExercise(t.exercise ?? t.title);
      if (exKey !== key) continue;

      items.push({
        date: d.createdAt ?? t.createdAt ?? Date.now(),
        sets: Number(t.sets ?? 0),
        reps: Number(t.reps ?? 0),
        weight: Number(t.weight ?? 0),
        done: !!t.done,
      });
    }
  }

  items.sort((a, b) => a.date - b.date);
  return items;
}

/* ----------------- 1RM ----------------- */

// Epley
export function estimate1RM(weight, reps) {
  const w = Number(weight ?? 0);
  const r = Number(reps ?? 0);
  if (w <= 0 || r <= 0) return 0;
  return w * (1 + r / 30);
}

/* ----------------- helpers ----------------- */

function createDay(weekdayIndex) {
  return { id: uid(), weekdayIndex, createdAt: Date.now(), tasks: [] };
}

function uid() {
  return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
}

function normalizeExercise(s) {
  return String(s ?? "").trim().toLowerCase();
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveState(state) {
  // ✅ автоматично перераховуємо серію перед збереженням
  state.streak = computeStreak(state);
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}
function computeStreak(state) {
  const days = Array.isArray(state.days) ? [...state.days] : [];
  if (days.length === 0) return 0;

  // сортуємо по даті
  days.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

  let streak = 0;
  let prevDayStart = null;

  for (let i = days.length - 1; i >= 0; i--) {
    const d = days[i];
    const start = startOfDay(d.createdAt ?? Date.now());

    // день має бути "закритий"
    if (!isDayCompleted(d)) break;

    // перший (останній по часу) — просто старт
    if (prevDayStart === null) {
      streak++;
      prevDayStart = start;
      continue;
    }

    // перевірка "попередній календарний день"
    const diffDays = Math.round((prevDayStart - start) / 86400000);
    if (diffDays !== 1) break;

    streak++;
    prevDayStart = start;
  }

  return streak;
}

function isDayCompleted(day) {
  const tasks = Array.isArray(day?.tasks) ? day.tasks : [];
  if (tasks.length === 0) return false;
  return tasks.every(t => !!t?.done);
}

function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
export function setProfileField(state, key, value) {
  state.profile = state.profile ?? { age:"", height:"", weight:"", avatar:"" };
  state.profile[key] = value;
  saveState(state);
}

export function setAvatar(state, dataUrl) {
  state.profile = state.profile ?? { age:"", height:"", weight:"", avatar:"" };
  state.profile.avatar = dataUrl || "";
  saveState(state);
}

// ✅ Muscles Progres: середній % до цілей по всіх вправах (best 1RM / goal 1RM)
export function calcOverallMusclesProgress(state) {
  const goals = state?.goals?.muscles ?? {};
  const goalEntries = Object.entries(goals);
  if (goalEntries.length === 0) return 0;

  // зібрати best 1RM по кожній вправі з усіх днів
  const bestByEx = new Map(); // exKey -> best1RM

  const days = Array.isArray(state.days) ? state.days : [];
  for (const d of days) {
    const tasks = Array.isArray(d.tasks) ? d.tasks : [];
    for (const t of tasks) {
      if (!t?.done) continue;
      if (t.category !== "muscles") continue;

      const exKey = String(t.exercise ?? t.title ?? "").trim().toLowerCase();
      if (!exKey) continue;

      const one = estimate1RM(t.weight, t.reps);
      const prev = bestByEx.get(exKey) ?? 0;
      if (one > prev) bestByEx.set(exKey, one);
    }
  }

  let sum = 0;
  let cnt = 0;

  for (const [exKey, goal] of goalEntries) {
    const goal1 = estimate1RM(goal.weight, goal.reps);
    if (goal1 <= 0) continue;

    const cur1 = bestByEx.get(exKey) ?? 0;
    const ratio = Math.max(0, Math.min(1, cur1 / goal1));
    sum += ratio;
    cnt++;
  }

  return cnt ? (sum / cnt) : 0;
}



