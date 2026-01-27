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
import { setProfileField, setAvatar } from "../state/state.js";
import { drawProfileRadar } from "./profileRadar.js";

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

// ✅ NEW: select з вправами з goals + поле "інша вправа"
const exerciseSelect = document.getElementById("exerciseSelect");
const exerciseCustomInput = document.getElementById("exerciseCustomInput");

// старі поля muscles (залишаємо)
const setsInput = document.getElementById("setsInput");
const repsInput = document.getElementById("repsInput");
const weightInput = document.getElementById("weightInput");

// 1) Підтягуємо список вправ з goals у select
function fillExerciseSelect() {
  if (!exerciseSelect) return;

  const goals = getMuscleGoals(state); // { "жим лежачи": {weight,reps}, ... }
  const keys = Object.keys(goals || {}).sort((a, b) => a.localeCompare(b, "uk"));

  // reset
  exerciseSelect.innerHTML = "";

  // placeholder
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = keys.length ? "Обери вправу зі списку" : "Нема цілей — обери “Інша”";
  exerciseSelect.appendChild(opt0);

  // options з goals
  keys.forEach((k) => {
    const opt = document.createElement("option");
    opt.value = k;      // ключ вже нормалізований в state (lowercase)
    opt.textContent = k;
    exerciseSelect.appendChild(opt);
  });

  // "Інша"
  const optOther = document.createElement("option");
  optOther.value = "__custom__";
  optOther.textContent = "Інша (ввести вручну)";
  exerciseSelect.appendChild(optOther);

  // дефолт
  exerciseSelect.value = keys.length ? keys[0] : "__custom__";
  syncExerciseCustomVisibility();
}

function syncExerciseCustomVisibility() {
  if (!exerciseSelect || !exerciseCustomInput) return;
  const isCustom = exerciseSelect.value === "__custom__";
  exerciseCustomInput.classList.toggle("hidden", !isCustom);
  if (isCustom) {
    exerciseCustomInput.focus();
  } else {
    exerciseCustomInput.value = "";
  }
}

function syncMusclesFields() {
  const isMuscles = (taskCategorySelect?.value || "") === "muscles";
  musclesFields?.classList.toggle("hidden", !isMuscles);

  // title required тільки для НЕ-muscles
  if (taskTitleInput) {
    taskTitleInput.required = !isMuscles;
    taskTitleInput.placeholder = isMuscles ? "Назва (опційно)" : "Назва задачі";
  }

  // коли muscles — оновлюємо select вправ (щоб завжди був актуальний)
  if (isMuscles) {
    fillExerciseSelect();
  }
}

function openTaskModal() {
  taskModal?.classList.remove("hidden");

  if (taskTitleInput) taskTitleInput.value = "";
  if (taskCategorySelect) taskCategorySelect.value = "brains";

  if (setsInput) setsInput.value = "";
  if (repsInput) repsInput.value = "";
  if (weightInput) weightInput.value = "";

  if (exerciseCustomInput) exerciseCustomInput.value = "";

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
exerciseSelect?.addEventListener("change", syncExerciseCustomVisibility);

// ✅ ДОДАВАННЯ ЗАДАЧІ
taskForm?.addEventListener("submit", (e) => {
  e.preventDefault();

  const category = (taskCategorySelect?.value || "brains").toLowerCase();

  if (category === "muscles") {
    // 1) беремо exercise або з select або з custom input
    let exercise = "";

    const sel = exerciseSelect?.value || "";
    if (sel === "__custom__") {
      exercise = exerciseCustomInput?.value?.trim() || "";
    } else if (sel) {
      exercise = sel.trim();
    }

    // fallback: якщо нічого — спробуємо з title (на всяк випадок)
    if (!exercise) exercise = taskTitleInput?.value?.trim() || "";

    if (!exercise) {
      alert("Введи вправу 🙂");
      (exerciseCustomInput || taskTitleInput)?.focus();
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

/* ----------------- Settings Modal + Goals ----------------- */

const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const closeSettingsBtn = document.getElementById("closeSettings");
const resetAllBtn = document.getElementById("resetAll");

function openSettings() {
  settingsModal?.classList.remove("hidden");
  renderGoalsList();
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

function renderGoalsList() {
  const box = document.getElementById("goalsList");
  if (!box) return;

  const goals = getMuscleGoals(state);
  const entries = Object.entries(goals || {});

  if (entries.length === 0) {
    box.textContent = "Поки немає цілей Muscles.";
    return;
  }

  box.innerHTML = entries
    .map(([ex, g]) => {
      return `
        <div style="display:flex;justify-content:space-between;gap:10px;margin:6px 0;align-items:center;">
          <span>${ex} — ${g.weight}×${g.reps}</span>
          <button data-del-goal="${ex}" class="btn btn--ghost" type="button">✕</button>
        </div>
      `;
    })
    .join("");
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

// reset all
resetAllBtn?.addEventListener("click", () => {
  const ok = confirm("Точно скинути ВСЕ? Це очистить LocalStorage.");
  if (!ok) return;

  localStorage.removeItem("planner_state_v1");
  location.reload();
});

/* ----------------- Init ----------------- */

// щоб після першого завантаження все було синхронно
renderAll(state);
/* ----------------- Profile Modal ----------------- */

const profileBtn = document.getElementById("profileBtn");
const profileModal = document.getElementById("profileModal");
const profileBackdrop = document.getElementById("profileBackdrop");
const closeProfile = document.getElementById("closeProfile");

const avatarImg = document.getElementById("avatarImg");
const avatarInput = document.getElementById("avatarInput");
const removeAvatarBtn = document.getElementById("removeAvatar");

const ageEl = document.getElementById("profileAge");
const heightEl = document.getElementById("profileHeight");
const weightEl = document.getElementById("profileWeight");

function openProfile(){
  profileModal?.classList.remove("hidden");

  // fill values
  const p = state.profile ?? {};
  if (ageEl) ageEl.value = p.age ?? "";
  if (heightEl) heightEl.value = p.height ?? "";
  if (weightEl) weightEl.value = p.weight ?? "";

  if (avatarImg) {
    avatarImg.src = p.avatar ? p.avatar : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' rx='14' fill='%23222222'/%3E%3Ctext x='50%25' y='54%25' text-anchor='middle' font-size='26' fill='%23ffffff'%3E%F0%9F%91%A4%3C/text%3E%3C/svg%3E";
  }

  // draw radar
  requestAnimationFrame(() => drawProfileRadar(state));
}

function closeProfileModal(){
  profileModal?.classList.add("hidden");
}

profileBtn?.addEventListener("click", openProfile);
closeProfile?.addEventListener("click", closeProfileModal);
profileBackdrop?.addEventListener("click", closeProfileModal);

// live save fields
ageEl?.addEventListener("input", () => setProfileField(state, "age", ageEl.value));
heightEl?.addEventListener("input", () => setProfileField(state, "height", heightEl.value));
weightEl?.addEventListener("input", () => setProfileField(state, "weight", weightEl.value));

// avatar upload (iPhone ok)
avatarInput?.addEventListener("change", () => {
  const file = avatarInput.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = String(reader.result || "");
    setAvatar(state, dataUrl);
    if (avatarImg) avatarImg.src = dataUrl;
    drawProfileRadar(state);
  };
  reader.readAsDataURL(file);
});

removeAvatarBtn?.addEventListener("click", () => {
  setAvatar(state, "");
  if (avatarImg) avatarImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' rx='14' fill='%23222222'/%3E%3Ctext x='50%25' y='54%25' text-anchor='middle' font-size='26' fill='%23ffffff'%3E%F0%9F%91%A4%3C/text%3E%3C/svg%3E";
  drawProfileRadar(state);
});




