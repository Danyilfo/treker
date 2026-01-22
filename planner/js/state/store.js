import { LS_KEY } from "./keys.js";
import { createDefaultState } from "../data/defaults.js";

export function initStore() {
  const saved = localStorage.getItem(LS_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  const state = createDefaultState();
  localStorage.setItem(LS_KEY, JSON.stringify(state));
  return state;
}

export function saveStore(state) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}
