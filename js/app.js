import "./ui/events.js";
import { renderAll } from "./ui/render.js";
import { state } from "./state/state.js";
import { applyTranslations, getLang, setLang } from "./i18n/i18n.js";

function bootLang() {
  const langSelect = document.getElementById("langSelect");
  const lang = getLang();

  // застосувати мову одразу
  setLang(lang);
  applyTranslations(lang);

  if (!langSelect) return;

  // поставити селекту правильне значення
  langSelect.value = lang;

  const onLangChange = () => {
    const next = (langSelect.value || "uk").toLowerCase();
    setLang(next);
    applyTranslations(next);
    renderAll(state); // якщо треба перемальовка після перекладу
  };

  // desktop + android
  langSelect.addEventListener("change", onLangChange);
  langSelect.addEventListener("input", onLangChange);

  // iPhone Safari (часто саме це рятує)
  langSelect.addEventListener("touchend", () => {
    // трішки відкладемо щоб Safari встиг оновити value
    setTimeout(onLangChange, 0);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  bootLang();
  renderAll(state);
});
