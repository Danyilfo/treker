// planner/js/ui/render.js
import { drawRadar } from "./radar.js";
import { getLang, t } from "../i18n/i18n.js";

const WEEKDAYS = {
  uk: ["Понеділок", "Вівторок", "Середа", "Четвер", "Пʼятниця", "Субота", "Неділя"],
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
};

export function renderAll(state) {
  renderDays(state);
  renderHeader(state);
  renderTasks(state);
  renderStats(state);
  drawRadar(state);
}

function getActiveDayLocal(state) {
  const days = Array.isArray(state.days) ? state.days : [];
  return days.find((d) => d.id === state.activeDayId) ?? days[0] ?? null;
}

function getLocale() {
  const lang = getLang();
  return lang === "en" ? "en-US" : "uk-UA";
}

function getWeekdayLabel(idx) {
  const lang = getLang();
  const arr = WEEKDAYS[lang] || WEEKDAYS.uk;
  return arr[idx] ?? t("day_fallback");
}

function renderHeader(state) {
  const day = getActiveDayLocal(state);

  const titleEl = document.getElementById("dayTitle");
  const dateEl = document.getElementById("dayDate");
  if (!titleEl || !dateEl) return;

  if (!day) {
    titleEl.textContent = t("day_fallback");
    dateEl.textContent = "";
    return;
  }

  titleEl.textContent = getWeekdayLabel(day.weekdayIndex);
  dateEl.textContent = day.createdAt
    ? new Date(day.createdAt).toLocaleDateString(getLocale())
    : "";
}

function renderDays(state) {
  const track = document.getElementById("dayTrack");
  if (!track) return;

  track.innerHTML = "";

  const days = Array.isArray(state.days) ? state.days : [];
  const tasksWord = t("tasks_word");

  days.forEach((d) => {
    const pill = document.createElement("div");
    pill.className = "dayPill" + (d.id === state.activeDayId ? " is-active" : "");
    pill.dataset.dayId = d.id;

    const title = document.createElement("div");
    title.className = "dayPill__title";
    title.textContent = getWeekdayLabel(d.weekdayIndex);

    const meta = document.createElement("div");
    meta.className = "dayPill__meta";

    const tasks = Array.isArray(d.tasks) ? d.tasks : [];
    const done = tasks.filter((x) => x.done).length;
    meta.textContent = `${done}/${tasks.length} ${tasksWord}`;

    pill.append(title, meta);
    track.appendChild(pill);
  });

  requestAnimationFrame(() => {
    const active = track.querySelector(".dayPill.is-active");
    if (!active) return;
    active.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  });
}

function renderTasks(state) {
  const day = getActiveDayLocal(state);

  const listEl = document.getElementById("taskList");
  const emptyEl = document.getElementById("emptyTasks");
  if (!listEl || !emptyEl) return;

  listEl.innerHTML = "";

  if (!day) {
    emptyEl.classList.remove("hidden");
    return;
  }

  const tasks = Array.isArray(day.tasks) ? day.tasks : [];

  const filter = state.taskFilter ?? "all";
  const visible = filter === "all" ? tasks : tasks.filter((t) => t.category === filter);

  document.querySelectorAll("#taskFilters [data-filter]").forEach((b) => {
    b.classList.toggle("is-active", b.dataset.filter === filter);
  });

  if (visible.length === 0) {
    emptyEl.classList.remove("hidden");
    return;
  }
  emptyEl.classList.add("hidden");

  visible.forEach((task) => {
    const row = document.createElement("div");
    row.className = "task" + (task.done ? " is-done" : "");
    row.dataset.taskId = task.id;

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "task__check";
    cb.checked = !!task.done;

    const body = document.createElement("div");
    body.className = "task__body";

    const title = document.createElement("div");
    title.className = "task__title";
    title.textContent = task.title ?? "Task";

    const meta = document.createElement("div");
    meta.className = "task__meta";

    if (task.category === "muscles") {
      const sets = Number(task.sets || 0);
      const reps = Number(task.reps || 0);
      const weight = Number(task.weight || 0);
      meta.textContent = `${sets}x${reps} • ${weight} kg`;
    } else {
      meta.textContent = (task.category ?? "").toUpperCase();
    }

    body.append(title, meta);

    const del = document.createElement("button");
    del.className = "task__del";
    del.textContent = "✕";
    del.setAttribute("data-action", "delete");
    del.dataset.id = task.id;

    row.append(cb, body, del);
    listEl.appendChild(row);
  });
}

function renderStats(state) {
  const day = getActiveDayLocal(state);

  const taskCountEl = document.getElementById("taskCount");
  const doneCountEl = document.getElementById("doneCount");
  const streakEl = document.getElementById("streak");
  if (!taskCountEl || !doneCountEl || !streakEl) return;

  if (!day) {
    taskCountEl.textContent = "0";
    doneCountEl.textContent = "0";
    streakEl.textContent = String(state?.streak ?? 0);
    return;
  }

  const tasks = Array.isArray(day.tasks) ? day.tasks : [];
  const done = tasks.filter((t) => t?.done).length;

  taskCountEl.textContent = String(tasks.length);
  doneCountEl.textContent = String(done);
  streakEl.textContent = String(state?.streak ?? 0);
}




