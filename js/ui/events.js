// planner/js/ui/events.js
import {
  state,
  addDay,
  setActiveDay,
  moveActiveDay,
  addTask,
  toggleTask,
  deleteTask,
  resetActiveDay,
  setTaskFilter,
  setMuscleGoal,
  getMuscleGoals,
  removeMuscleGoal,
} from "../state/state.js";

import { renderAll } from "./render.js";


/* ----------------- Days ----------------- */

document.getElementById("addDay")?.addEventListener("click", () => {
  addDay(state);
  renderAll(state);
});

document.getElementById("prevDay")?.addEventListener("click", () => {
  moveActiveDay(state, -1);
  renderAll(state);
});

document.getElementById("nextDay")?.addEventListener("click", () => {
  moveActiveDay(state, +1);
  renderAll(state);
});

document.getElementById("dayTrack")?.addEventListener("click", (e) => {
  const pill = e.target.closest(".dayPill");
  if (!pill) return;

  setActiveDay(state, pill.dataset.dayId);
  renderAll(state);
});

/* ----------------- Reset day ----------------- */

document.getElementById("resetDay")?.addEventListener("click", () => {
  const ok = confirm("Скинути всі задачі цього дня?");
  if (!ok) return;

  resetActiveDay(state);
  renderAll(state);
});

/* ----------------- Filters (tabs) ----------------- */

document.getElementById("taskFilters")?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-filter]");
  if (!btn) return;

  setTaskFilter(state, btn.dataset.filter);
  renderAll(state);
});

/* ----------------- Task Modal ----------------- */

const taskModal = document.getElementById("taskModal");
const taskBackdrop = document.getElementById("taskModalBackdrop");
const taskForm = document.getElementById("taskModalForm");

const taskTitleInput = document.getElementById("taskTitleInput");
const taskCategorySelect = document.getElementById("taskCategorySelect");
const taskCancelBtn = document.getElementById("taskCancelBtn");

const musclesFields = document.getElementById("musclesFields");
const exerciseInput = document.getElementById("exerciseInput");
const setsInput = document.getElementById("setsInput");
const repsInput = document.getElementById("repsInput");
const weightInput = document.getElementById("weightInput");

function syncMusclesFields() {
  const isMuscles = (taskCategorySelect?.value || "") === "muscles";
  musclesFields?.classList.toggle("hidden", !isMuscles);

  // title required тільки для НЕ-muscles
  if (taskTitleInput) {
    taskTitleInput.required = !isMuscles;
    taskTitleInput.placeholder = isMuscles ? "Напр.: Тренування (опційно)" : "Назва задачі";
  }
}

function openTaskModal() {
  taskModal?.classList.remove("hidden");

  if (taskTitleInput) taskTitleInput.value = "";
  if (taskCategorySelect) taskCategorySelect.value = "brains";

  if (exerciseInput) exerciseInput.value = "";
  if (setsInput) setsInput.value = "";
  if (repsInput) repsInput.value = "";
  if (weightInput) weightInput.value = "";

  syncMusclesFields();
  (taskCategorySelect || taskTitleInput)?.focus();
}

function closeTaskModal() {
  taskModal?.classList.add("hidden");
}

document.getElementById("addTask")?.addEventListener("click", openTaskModal);
taskCancelBtn?.addEventListener("click", closeTaskModal);
taskBackdrop?.addEventListener("click", closeTaskModal);
taskCategorySelect?.addEventListener("change", syncMusclesFields);

// ✅ ДОДАВАННЯ ЗАДАЧІ (головне!)
taskForm?.addEventListener("submit", (e) => {
  e.preventDefault();

  const category = (taskCategorySelect?.value || "brains").toLowerCase();

  if (category === "muscles") {
    const exercise = exerciseInput?.value?.trim();
    if (!exercise) {
      alert("Введи вправу 🙂");
      exerciseInput?.focus();
      return;
    }

    addTask(state, {
      category: "muscles",
      exercise,
      sets: Number(setsInput?.value || 0),
      reps: Number(repsInput?.value || 0),
      weight: Number(weightInput?.value || 0),
    });
  } else {
    const title = taskTitleInput?.value?.trim();
    if (!title) {
      alert("Введи назву задачі 🙂");
      taskTitleInput?.focus();
      return;
    }

    addTask(state, { category, title });
  }

  closeTaskModal();
  renderAll(state);
});

/* ----------------- Toggle / Delete task ----------------- */

document.getElementById("taskList")?.addEventListener("click", (e) => {
  // delete
  const del = e.target.closest("[data-action='delete']");
  if (del) {
    const id = del.dataset.id;
    if (!id) return;

    deleteTask(state, id);
    renderAll(state);
    return;
  }

  // toggle
  const row = e.target.closest(".task");
  if (!row) return;

  const id = row.dataset.taskId;
  if (!id) return;

  toggleTask(state, id);
  renderAll(state);
});

/* ----------------- Settings Modal ----------------- */

const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const closeSettingsBtn = document.getElementById("closeSettings");
const resetAllBtn = document.getElementById("resetAll");

function renderGoalsList(){
  const box = document.getElementById("goalsList");
  if (!box) return;

  const goals = getMuscleGoals(state);
  const entries = Object.entries(goals);

  if (entries.length === 0) {
    box.textContent = "Поки немає цілей Muscles.";
    return;
  }

  box.innerHTML = entries.map(([ex, g]) => {
    return `
      <div style="display:flex;justify-content:space-between;gap:10px;margin:6px 0;">
        <span>${ex} — ${g.weight}×${g.reps}</span>
        <button data-del-goal="${ex}" class="btn btn--ghost" type="button">✕</button>
      </div>
    `;
  }).join("");
}

document.getElementById("saveGoal")?.addEventListener("click", () => {
  const ex = document.getElementById("goalExercise")?.value ?? "";
  const w = document.getElementById("goalWeight")?.value ?? "";
  const r = document.getElementById("goalReps")?.value ?? "";

  if (!ex.trim()) return alert("Введи назву вправи");
  if (!Number(w) || !Number(r)) return alert("Введи вагу і повтори");

  setMuscleGoal(state, ex, w, r);
  renderGoalsList();
  renderAll(state);
});

document.getElementById("goalsList")?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-del-goal]");
  if (!btn) return;
  removeMuscleGoal(state, btn.dataset.delGoal);
  renderGoalsList();
  renderAll(state);
});

// коли відкриваєш settings — одразу показуй список
document.getElementById("openSettings")?.addEventListener("click", () => {
  document.getElementById("settingsModal")?.classList.remove("hidden");
  renderGoalsList();
});

function openSettings() {
  settingsModal?.classList.remove("hidden");
}

function closeSettings() {
  settingsModal?.classList.add("hidden");
}

settingsBtn?.addEventListener("click", openSettings);
closeSettingsBtn?.addEventListener("click", closeSettings);

// клік по фону модалки (опціонально)
settingsModal?.addEventListener("click", (e) => {
  if (e.target === settingsModal) closeSettings();
});

resetAllBtn?.addEventListener("click", () => {
  const ok = confirm("Точно скинути ВСЕ? Це очистить LocalStorage.");
  if (!ok) return;

  localStorage.removeItem("planner_state_v1");
  location.reload();
});


