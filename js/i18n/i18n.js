// js/i18n/i18n.js

const DICT = {
  uk: {
    brand_title: "Планер",

    // sections/buttons
    days: "Дні",
    add_day: "+ День",
    today: "Сьогодні",
    reset_day: "Скинути день",
    tasks_day: "Задачі дня",
    add_task: "+ Задача",
    empty_tasks: "Нема задач. Додай першу 🙂",

    // generic
    day_fallback: "День",
    tasks_word: "задач",
  },

  en: {
    brand_title: "Planner",

    // sections/buttons
    days: "Days",
    add_day: "+ Day",
    today: "Today",
    reset_day: "Reset day",
    tasks_day: "Daily tasks",
    add_task: "+ Task",
    empty_tasks: "No tasks yet. Add the first one 🙂",

    // generic
    day_fallback: "Day",
    tasks_word: "tasks",
  },
};

export function getLang() {
  const saved = (localStorage.getItem("planner_lang") || "").toLowerCase();
  if (saved === "uk" || saved === "en") return saved;

  const htmlLang = (document.documentElement.lang || "").toLowerCase();
  if (htmlLang.startsWith("en")) return "en";
  return "uk";
}

export function setLang(lang) {
  const v = (lang || "uk").toLowerCase();
  localStorage.setItem("planner_lang", v);
  document.documentElement.lang = v;
}

export function t(key, lang) {
  const l = (lang || getLang()).toLowerCase();
  const dict = DICT[l] || DICT.uk;
  return dict[key] ?? DICT.uk[key] ?? key;
}

export function applyTranslations(lang) {
  const l = (lang || getLang()).toLowerCase();
  const dict = DICT[l] || DICT.uk;

  // text nodes
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (!key) return;
    if (dict[key] == null) return;
    el.textContent = dict[key];
  });

  // placeholders
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (!key) return;
    if (dict[key] == null) return;
    el.setAttribute("placeholder", dict[key]);
  });
}

