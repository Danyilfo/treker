// js/app.js
import "./ui/events.js";
import { renderAll } from "./ui/render.js";
import { state } from "./state/state.js";
import { applyTranslations, getLang, setLang } from "./i18n/i18n.js";

const langSelect = document.getElementById("langSelect");

function syncLang(nextLang) {
  setLang(nextLang);
  applyTranslations(nextLang);
  renderAll(state);
}

function initLang() {
  const lang = getLang();

  if (langSelect) {
    langSelect.value = lang;

    // ✅ iPhone/Safari: change інколи капризний → додаємо pointerup
    const handler = () => syncLang(langSelect.value);

    langSelect.addEventListener("change", handler);
    langSelect.addEventListener("pointerup", handler);
  }

  syncLang(lang);
}

initLang();
