
import { state } from "./state/state.js";
import { renderAll } from "./ui/render.js";
import "./ui/events.js"; // важливо, щоб підключилися кліки

renderAll(state);

