// Faz 4: tracker.js — giriş noktası. Tüm mantık modüllere bölündü; bu dosya
// modülleri bağlar, başlangıç yüklemelerini yapar ve genel (global) olayları kurar.
import { state } from "./state.js";
import { checkTmdbKey, applyLang } from "./i18n.js";
import { switchView, loadFollowed, loadUnwatched, views } from "./views.js";
import { closeResultsModal } from "./search.js";
import "./settings.js";

// ---- Başlangıç görünümü (son seçilen sekmeyi geri yükle) ----
let lastView = "followed";
try {
  lastView = localStorage.getItem("activeView") || "followed";
} catch (e) {}
if (!views[lastView]) lastView = "followed";
switchView(lastView);

// Dil değişince aktif görünümü yenile (applyLang, i18n.js'ten olay yayar)
document.addEventListener("app:langchange", () => {
  if (views.followed.classList.contains("active")) loadFollowed();
  if (views.unwatched.classList.contains("active")) loadUnwatched();
});

// ---- İlk veri yüklemeleri ----
(async () => {
  try {
    const res = await fetch("/api/settings");
    const s = await res.json();
    state.tmdbKeySet = !!s.tmdb_api_key;
    if (s.language) {
      state.currentTz = s.timezone || state.currentTz;
      applyLang(s.language.split("-")[0]);
    }
    checkTmdbKey(state.tmdbKeySet);
  } catch (e) {
    /* varsayılan dil */
  }
})();

(async () => {
  try {
    const res = await fetch("/api/fav_genres");
    const s = await res.json();
    if (s.genres) state.favGenres = new Set(s.genres);
  } catch (e) {
    /* yoksay */
  }
})();

(async () => {
  try {
    const res = await fetch("/api/fav_anime_genres");
    const s = await res.json();
    if (s.genres) state.favAnimeGenres = new Set(s.genres);
  } catch (e) {
    /* yoksay */
  }
})();

(async () => {
  try {
    const res = await fetch("/api/fav_actors");
    const s = await res.json();
    if (s.actors) state.favActors = new Map((s.actors || []).map((a) => [a.person_id, a.name]));
  } catch (e) {
    /* yoksay */
  }
})();

(async () => {
  try {
    const res = await fetch("/api/fav_anime_chars");
    const s = await res.json();
    if (s.characters) state.favAnimeChars = new Map((s.characters || []).map((a) => [a.character_id, a.name]));
  } catch (e) {
    /* yoksay */
  }
})();

// ---- Özel tooltip ----
let tipEl = null;
function showTip(text, x, y) {
  if (!tipEl) {
    tipEl = document.createElement("div");
    tipEl.className = "app-tip";
    document.body.appendChild(tipEl);
  }
  tipEl.textContent = text;
  tipEl.classList.add("show");
  const r = tipEl.getBoundingClientRect();
  let left = x + 14;
  let top = y + 14;
  if (left + r.width > window.innerWidth - 8) left = x - r.width - 14;
  if (top + r.height > window.innerHeight - 8) top = y - r.height - 14;
  tipEl.style.left = left + "px";
  tipEl.style.top = top + "px";
}

function hideTip() {
  if (tipEl) tipEl.classList.remove("show");
}

const tmdbClose = document.getElementById("tmdb-key-close");
if (tmdbClose) {
  tmdbClose.addEventListener("click", () => {
    const b = document.getElementById("tmdb-key-banner");
    if (b) b.style.display = "none";
  });
}

document.addEventListener("click", (e) => {
  const sw = e.target.closest(".switch[data-tip]");
  if (sw) {
    const r = sw.getBoundingClientRect();
    showTip(sw.dataset.tip, r.left + r.width / 2, r.top - 6);
    setTimeout(hideTip, 2500);
  }
});

document.addEventListener("mouseover", (e) => {
  const el = e.target.closest("[data-tip]");
  if (el && el.dataset.tip) showTip(el.dataset.tip, e.clientX, e.clientY);
});

document.addEventListener("mousemove", (e) => {
  if (tipEl && tipEl.classList.contains("show")) {
    const r = tipEl.getBoundingClientRect();
    let left = e.clientX + 14;
    let top = e.clientY + 14;
    if (left + r.width > window.innerWidth - 8) left = e.clientX - r.width - 14;
    if (top + r.height > window.innerHeight - 8) top = e.clientY - r.height - 14;
    tipEl.style.left = left + "px";
    tipEl.style.top = top + "px";
  }
});

document.addEventListener("mouseout", (e) => {
  if (e.target.closest("[data-tip]")) hideTip();
});