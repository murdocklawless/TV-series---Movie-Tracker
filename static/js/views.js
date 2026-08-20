// Faz 4: views — görünüm (tab) yönetimi, sıralama ve ana liste yükleyicileri (takip edilenler / anime / izlenmemiş).
import { state } from "./state.js";
import { t } from "./i18n.js";
import {
  posterHTML, scoreTag, platformTag, typeLabel, applyTitleHint,
  formatDate, shortDate, shortDateShort, isMobile, daysUntil, daysHint,
  isToday, dateState, utcDayStr, utcTodayStr, FILM_SVG, CALENDAR_SVG, CHECK_SVG, toast, tzLocale,
} from "./utils.js";
import { openDetails, openReleases, openAnimeDetails, openAnimeSchedule, showConfirm, openUnwatchedModal } from "./components.js";
import { renderChips, closeResultsModal } from "./search.js";
import { closeSettingsMenu } from "./settings.js";

const views = {
  dizi: document.getElementById("view-dizi"),
  film: document.getElementById("view-film"),
  anime: document.getElementById("view-anime"),
  unwatched: document.getElementById("view-unwatched"),
  watched: document.getElementById("view-watched"),
  search: document.getElementById("view-search"),
};

const tabs = {
  dizi: document.getElementById("tab-dizi"),
  film: document.getElementById("tab-film"),
  anime: document.getElementById("tab-anime"),
  unwatched: document.getElementById("tab-unwatched"),
  watched: document.getElementById("tab-watched"),
  search: document.getElementById("tab-search"),
  sort: document.getElementById("tab-sort"),
  settings: document.getElementById("tab-settings"),
};

function switchView(name) {
  if (name !== "search" && views.search.classList.contains("active")) {
    state.chips.length = 0;
    renderChips();
    closeResultsModal();
  }
  Object.keys(views).forEach((k) => views[k].classList.remove("active"));
  Object.keys(tabs).forEach((k) => tabs[k].classList.remove("active"));
  views[name].classList.add("active");
  tabs[name].classList.add("active");
  try {
    localStorage.setItem("activeView", name);
  } catch (e) {}
  if (name === "dizi") loadFollowed("dizi");
  if (name === "film") loadFollowed("film");
  if (name === "anime") loadAnime();
  if (name === "unwatched") loadUnwatched();
  if (name === "watched") loadWatched();
  if (SORT_VIEWS.includes(name)) {
    state.sortKey = loadViewSort(name);
    updateSortMenu();
  }
}

tabs.dizi.onclick = () => switchView("dizi");
tabs.film.onclick = () => switchView("film");
tabs.anime.onclick = () => switchView("anime");
tabs.unwatched.onclick = () => switchView("unwatched");
tabs.watched.onclick = () => switchView("watched");
tabs.search.onclick = () => switchView("search");
document.getElementById("search-close").onclick = () => switchView("dizi");

const SORT_VIEWS = ["dizi", "film", "anime", "unwatched", "watched"];

function activeView() {
  if (views.film.classList.contains("active")) return "film";
  if (views.anime.classList.contains("active")) return "anime";
  if (views.unwatched.classList.contains("active")) return "unwatched";
  if (views.watched.classList.contains("active")) return "watched";
  return "dizi";
}

function loadViewSort(view) {
  let v = "added";
  try {
    v = localStorage.getItem("sortKey_" + view) || "added";
  } catch (e) {}
  return v;
}

function saveViewSort(view, key) {
  try {
    localStorage.setItem("sortKey_" + view, key);
  } catch (e) {}
}

try {
  state.sortKey = loadViewSort(activeView());
} catch (e) {}

function sortValue(item) {
  if (state.sortKey === "alpha") return (item.title || "").toLocaleLowerCase();
  if (state.sortKey === "score") return item.score != null ? item.score : item.vote_average || 0;
  if (state.sortKey === "date") {
    if (item.isAnime) {
      const at = item.items && item.items[0] ? item.items[0].air_at : null;
      return at ? new Date(at * 1000).toISOString() : "";
    }
    if (item.media_type) {
      if (item.media_type === "tv") return item.next_episode ? item.next_episode.air_date || "" : "";
      return item.release_date || "";
    }
    const ad = item.items && item.items[0] ? item.items[0].air_date || "" : "";
    return ad || item.release_date || "";
  }
  if (state.sortKey === "type") return item.isAnime ? "anime" : item.media_type || item.format || "";
  return item.id;
}

function compareItems(a, b) {
  let av = sortValue(a);
  let bv = sortValue(b);
  if (state.sortKey === "added") return bv - av;
  if (state.sortKey === "score") return (bv || 0) - (av || 0);
  if (state.sortKey === "date") {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const aPast = !av || av < today;
    const bPast = !bv || bv < today;
    if (aPast && !bPast) return 1;
    if (!aPast && bPast) return -1;
    if (av === bv) return 0;
    if (!av) return 1;
    if (!bv) return -1;
    return av < bv ? -1 : 1;
  }
  av = String(av).toLocaleLowerCase();
  bv = String(bv).toLocaleLowerCase();
  return av < bv ? -1 : av > bv ? 1 : 0;
}

function applySort(items) {
  const arr = items.slice();
  arr.sort(compareItems);
  return arr;
}

function updateSortMenu() {
  document.querySelectorAll(".sort-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.sort === state.sortKey);
  });
}

const sortMenu = document.getElementById("sort-menu");
function activateUtilityTab(btn) {
  Object.keys(tabs).forEach((k) => tabs[k].classList.remove("active"));
  btn.classList.add("active");
}
document.getElementById("tab-sort").onclick = (e) => {
  e.stopPropagation();
  closeSettingsMenu();
  activateUtilityTab(tabs.sort);
  const open = sortMenu.classList.contains("open");
  sortMenu.classList.toggle("open", !open);
  updateSortMenu();
};
document.querySelectorAll(".sort-item").forEach((btn) => {
  btn.onclick = (e) => {
    e.stopPropagation();
    state.sortKey = btn.dataset.sort;
    const av = activeView();
    saveViewSort(av, state.sortKey);
    sortMenu.classList.remove("open");
    if (views.dizi.classList.contains("active")) loadFollowed("dizi");
    if (views.film.classList.contains("active")) loadFollowed("film");
    if (views.anime.classList.contains("active")) loadAnime();
    if (views.unwatched.classList.contains("active")) loadUnwatched();
    if (views.watched.classList.contains("active")) loadWatched();
  };
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".sort-wrap")) sortMenu.classList.remove("open");
});

function tvStatusText(item) {
  const status = (item.status || "").trim();
  if (status === "Ended") return `<div class="next-ep muted">${t("tv_status_ended")}</div>`;
  if (status === "Canceled") return `<div class="next-ep muted">${t("tv_status_canceled")}</div>`;
  let season = null;
  try {
    const sl = JSON.parse(item.season_list || "[]");
    const now = new Date().toISOString().slice(0, 10);
    season = sl
      .filter((s) => s.season_number && s.air_date && s.air_date >= now)
      .sort((a, b) => (a.air_date || "").localeCompare(b.air_date || ""))[0];
  } catch (e) {
    season = null;
  }
  if (season) return `<div class="next-ep muted">${t("tv_next_season", { date: shortDate(season.air_date) })}</div>`;
  if (status === "In Production") return `<div class="next-ep muted">${t("tv_status_production")}</div>`;
  if (status === "Planned") return `<div class="next-ep muted">${t("tv_status_planned")}</div>`;
  if (status === "Pilot") return `<div class="next-ep muted">${t("tv_status_pilot")}</div>`;
  if (status === "Returning Series") return `<div class="next-ep muted">${t("tv_status_returning")}</div>`;
  return `<div class="next-ep muted">${t("new_season")}</div>`;
}

async function loadFollowed(view) {
  const res = await fetch("/api/followed");
  let items = await res.json();
  const isTv = view === "dizi";
  items = items.filter((i) => (isTv ? i.media_type === "tv" : i.media_type === "movie"));
  items = applySort(items);
  const grid = document.getElementById(isTv ? "poster-grid-shows" : "poster-grid-movies");
  const empty = document.getElementById(isTv ? "empty-dizi" : "empty-film");
  grid.innerHTML = "";
  empty.style.display = items.length ? "none" : "block";

  items.forEach((item) => {
    const div = document.createElement("div");
    const todayNow =
      (item.media_type === "tv" && item.next_episode && isToday(item.next_episode.air_date)) ||
      (item.media_type === "movie" && dateState(item.release_date) === "date-today");
    div.className = todayNow ? "card today-release-card" : "card";
    const isMovieWatched = item.media_type === "movie" && item.watched == 1;
    const isTvCompleted = item.media_type === "tv" && item.completed;
    const showBadge = isMovieWatched || isTvCompleted;
    div.innerHTML = `
      ${posterHTML(item.poster_path, item.title, showBadge)}
      <div class="info">
        <div class="title">${item.title}</div>
        <div class="meta">
          <span class="badge badge-${item.media_type}">${typeLabel(item.media_type)}</span>
          ${scoreTag(item.vote_average)}
          ${platformTag(item.networks)}
          ${
            item.media_type === "tv"
              ? item.next_episode
                ? isToday(item.next_episode.air_date)
                  ? `<div class="next-ep today">S${String(item.next_episode.season).padStart(2, "0")}E${String(item.next_episode.episode).padStart(2, "0")} ${t("today_airing")}</div>`
                  : `<div class="next-ep">S${String(item.next_episode.season).padStart(2, "0")}E${String(item.next_episode.episode).padStart(2, "0")} · ${isMobile() ? shortDateShort(item.next_episode.air_date) : shortDate(item.next_episode.air_date)}${isMobile() ? "" : " · "}<span class="next-ep-days" data-tip="${daysHint(item.next_episode.air_date)}">${daysUntil(item.next_episode.air_date)}</span></div>`
                : tvStatusText(item)
              : item.release_date
                ? dateState(item.release_date) === "date-past"
                  ? `<div class="next-ep muted">${formatDate(item.release_date).text}</div>`
                  : dateState(item.release_date) === "date-today"
                    ? `<div class="next-ep today">${formatDate(item.release_date).text} ${t("today_theaters")}</div>`
                    : `<div class="next-ep">${formatDate(item.release_date).text} · <span class="next-ep-days" data-tip="${daysHint(item.release_date)}">${daysUntil(item.release_date)}</span></div>`
                : `<div>${t("date_unknown")}</div>`
          }
          ${item.notified ? `<div style="color:#6ee7a0">${t("notified")}</div>` : ""}
        </div>
      </div>
      <button class="calendar-btn" data-tip="${t("calendar_title")}">${CALENDAR_SVG}</button>
      ${showBadge ? `<button class="move-btn" data-tip="${t("move_to_watched")}"><i class="fa-solid fa-right-to-bracket"></i></button>` : ""}
      <button class="remove" data-tip="${t("unfollow_title")}">&times;</button>
    `;
    div.querySelector(".remove").onclick = (e) => {
      e.stopPropagation();
      showConfirm(
        t("unfollow_confirm", { title: item.title }),
        async () => {
          await fetch(`/api/unfollow/${item.id}`, { method: "DELETE" });
          loadFollowed(view);
          toast(t("unfollowed"));
        }
      );
    };
    div.querySelector(".calendar-btn").onclick = (e) => {
      e.stopPropagation();
      openReleases(item.media_type, item.tmdb_id, item.title);
    };
    const moveBtn = div.querySelector(".move-btn");
    if (moveBtn) {
      moveBtn.onclick = async (e) => {
        e.stopPropagation();
        const r = await fetch("/api/followed/move-watched", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmdb_id: item.tmdb_id,
            media_type: item.media_type,
            watched: 1,
          }),
        });
        const j = await r.json();
        if (r.ok) {
          toast(t("moved_to_watched"));
        } else {
          toast(j.error || t("error"));
        }
      };
    }
    div.onclick = () => {
      openDetails(item.media_type, item.tmdb_id, item.title);
    };
    grid.appendChild(div);
    applyTitleHint(div);
  });
}

function animeNextText(next, status) {
  if (!next) {
    if (status === "FINISHED") return `<div class="next-ep muted">${t("anime_status_finished")}</div>`;
    if (status === "CANCELLED") return `<div class="next-ep muted">${t("anime_status_cancelled")}</div>`;
    if (status === "HIATUS") return `<div class="next-ep muted">${t("anime_status_hiatus")}</div>`;
    if (status === "NOT_YET_RELEASED") return `<div class="next-ep muted">${t("anime_status_upcoming")}</div>`;
    if (status === "RELEASING") return `<div class="next-ep muted">${t("anime_status_releasing")}</div>`;
    return "";
  }
  const d = new Date(next.airing_at * 1000);
  const now = Date.now();
  const diffDays = Math.floor((d.getTime() - now) / 86400000);
  if (diffDays <= 0) return `<div class="next-ep today">EP ${next.episode} ${t("today_airing")}</div>`;
  const loc = tzLocale();
  let txt;
  try {
    txt = new Intl.DateTimeFormat(loc, { day: "numeric", month: isMobile() ? "short" : "long" }).format(d);
  } catch (e) {
    txt = d.toLocaleDateString();
  }
  return `<div class="next-ep anime-ep"><span>EP ${next.episode} · ${txt}</span><span class="next-ep-sep">·</span><span class="next-ep-days">${diffDays}</span></div>`;
}

function animeStatusLabel(status) {
  const s = (status || "").toUpperCase();
  if (s === "RELEASING") return t("anime_status_releasing");
  if (s === "FINISHED") return t("anime_status_finished");
  if (s === "NOT_YET_RELEASED") return t("anime_status_upcoming");
  return s;
}

async function loadAnime() {
  const res = await fetch("/api/anime/followed");
  let items = await res.json();
  items = applySort(items);
  const grid = document.getElementById("anime-grid");
  const empty = document.getElementById("empty-anime");
  grid.innerHTML = "";
  empty.style.display = items.length ? "none" : "block";

  items.forEach((item) => {
    const div = document.createElement("div");
    const animeToday = !!item.next_episode && utcDayStr(item.next_episode.airing_at) === utcTodayStr();
    const animeCompleted = !!item.completed;
    div.className = animeToday ? "card today-release-card" : "card";
    div.innerHTML = `
      ${item.cover_url ? `<img src="${item.cover_url}" alt="${item.title}" onerror="this.outerHTML=noPosterFallback()" />` : `<div class="no-poster">${FILM_SVG}</div>`}
      ${animeCompleted ? `<span class="badge-watched">${CHECK_SVG}</span>` : ""}
      <div class="info">
        <div class="title">${item.title}</div>
        <div class="meta">
          <span class="badge badge-anime">${t("tab_anime")}</span>
          ${item.score ? scoreTag(item.score / 10) : ""}
          ${platformTag(item.studios)}
          ${animeNextText(item.next_episode, item.status)}
        </div>
      </div>
      <button class="calendar-btn" data-tip="${t("calendar_title")}">${CALENDAR_SVG}</button>
      ${animeCompleted ? `<button class="move-btn" data-tip="${t("move_to_watched")}"><i class="fa-solid fa-right-to-bracket"></i></button>` : ""}
      <button class="remove" data-tip="${t("unfollow_title")}">&times;</button>
    `;
    div.querySelector(".remove").onclick = (e) => {
      e.stopPropagation();
      showConfirm(
        t("unfollow_confirm", { title: item.title }),
        async () => {
          await fetch(`/api/anime/unfollow/${item.id}`, { method: "DELETE" });
          loadAnime();
          toast(t("unfollowed"));
        }
      );
    };
    div.querySelector(".calendar-btn").onclick = (e) => {
      e.stopPropagation();
      openAnimeSchedule(item.id, item.title);
    };
    const animeMoveBtn = div.querySelector(".move-btn");
    if (animeMoveBtn) {
      animeMoveBtn.onclick = async (e) => {
        e.stopPropagation();
        const r = await fetch("/api/anime/move-watched", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ anime_id: item.id, watched: 1 }),
        });
        const j = await r.json();
        if (r.ok) {
          toast(t("moved_to_watched"));
        } else {
          toast(j.error || t("error"));
        }
      };
    }
    div.onclick = () => openAnimeDetails(item.id, item.anilist_id, item.title);
    grid.appendChild(div);
    applyTitleHint(div);
  });
}

function unwatchedFirstLabel(item) {
  if (!item.items || !item.items.length) return "";
  const it = item.items[0];
  if (item.isAnime) return `EP ${it.episode}`;
  return `S${String(it.season).padStart(2, "0")}E${String(it.episode).padStart(2, "0")}`;
}

async function loadUnwatched() {
  let data = { shows: [], anime: [], movies: [] };
  try {
    const res = await fetch("/api/unwatched");
    data = await res.json();
  } catch (e) {
    data = { shows: [], anime: [], movies: [] };
  }
  const unwatchedView = document.getElementById("view-unwatched");
  const empty = document.getElementById("empty-unwatched");
  const showsGrid = document.getElementById("unwatched-shows");
  const moviesGrid = document.getElementById("unwatched-movies");
  const animeGrid = document.getElementById("unwatched-anime");
  showsGrid.innerHTML = "";
  moviesGrid.innerHTML = "";
  animeGrid.innerHTML = "";

  const shows = applySort((data.shows || []).map((s) => ({ ...s, isAnime: false })));
  const movies = applySort((data.movies || []).map((m) => ({ ...m, isAnime: false })));
  const animes = applySort((data.anime || []).map((a) => ({ ...a, isAnime: true })));

  const hasContent = { shows: shows.length, movies: movies.length, anime: animes.length };

  document.getElementById("unwatched-shows-wrap").style.display = shows.length ? "" : "none";
  document.getElementById("unwatched-movies-wrap").style.display = movies.length ? "" : "none";
  const animeWrap = document.getElementById("unwatched-anime-wrap");
  animeWrap.style.display = animes.length ? "" : "none";
  animeWrap.classList.toggle("has-shows", shows.length > 0);
  empty.style.display = shows.length || movies.length || animes.length ? "none" : "block";

  // Kayıtlı bölüm sırasını uygula ve boş bölümleri çıkar
  const order = loadSectionOrder("unwatched").filter((s) => hasContent[s]);
  // Dolu olup da sırada olmayanları sona ekle
  ["shows", "movies", "anime"].forEach((s) => {
    if (hasContent[s] && !order.includes(s)) order.push(s);
  });
  order.forEach((s) => {
    const wrap = document.getElementById(`unwatched-${s}-wrap`);
    if (wrap) unwatchedView.insertBefore(wrap, empty);
  });
  updateMoveButtons("view-unwatched");

  shows.forEach((item) => {
    const div = document.createElement("div");
    const singleToday = item.unwatched === 1 && isToday((item.items[0] || {}).air_date);
    div.className = singleToday ? "card today-release-card" : "card unwatched-card";
    let bottom;
    if (item.unwatched === 1) {
      const lbl = unwatchedFirstLabel(item);
      bottom = singleToday
        ? `<div class="next-ep today">${lbl} ${t("today_airing")}</div>`
        : `<div class="next-ep today">${lbl}</div>`;
    } else {
      bottom = `<div class="next-ep unwatched-count">${t("unwatched_count", { n: item.unwatched })}</div>`;
    }
    div.innerHTML = `
      ${posterHTML(item.poster_path, item.title)}
      <div class="info">
        <div class="title">${item.title}</div>
        <div class="meta">
          <span class="badge badge-tv">${typeLabel("tv")}</span>
          ${scoreTag(item.vote_average)}
          ${platformTag(item.networks)}
          ${bottom}
        </div>
      </div>
      <button class="calendar-btn" data-tip="${t("calendar_title")}">${CALENDAR_SVG}</button>
      <button class="move-back-btn" data-tip="${t("move_back_to", { view: t("tab_film") })}"><i class="fa-solid fa-right-to-bracket"></i></button>
    `;
    div.querySelector(".calendar-btn").onclick = (e) => {
      e.stopPropagation();
      openReleases("movie", item.tmdb_id, item.title);
    };
    div.querySelector(".move-back-btn").onclick = async (e) => {
      e.stopPropagation();
      await moveBackFromWatched(item, "film");
    };
    div.onclick = () => openDetails("movie", item.tmdb_id, item.title);
    moviesGrid.appendChild(div);
    applyTitleHint(div);
  });

  movies.forEach((item) => {
    const div = document.createElement("div");
    div.className = "card unwatched-card";
    let dateLine = item.release_date
      ? dateState(item.release_date) === "date-past"
        ? `<div class="next-ep muted">${formatDate(item.release_date).text}</div>`
        : `<div class="next-ep">${formatDate(item.release_date).text}</div>`
      : `<div>${t("date_unknown")}</div>`;
    div.innerHTML = `
      ${posterHTML(item.poster_path, item.title)}
      <div class="info">
        <div class="title">${item.title}</div>
        <div class="meta">
          <span class="badge badge-movie">${typeLabel("movie")}</span>
          ${scoreTag(item.vote_average)}
          ${platformTag(item.networks)}
          ${dateLine}
        </div>
      </div>
      <button class="calendar-btn" data-tip="${t("calendar_title")}">${CALENDAR_SVG}</button>
    `;
    div.querySelector(".calendar-btn").onclick = (e) => {
      e.stopPropagation();
      openReleases("movie", item.tmdb_id, item.title);
    };
    div.onclick = () => openDetails("movie", item.tmdb_id, item.title);
    moviesGrid.appendChild(div);
    applyTitleHint(div);
  });

  animes.forEach((item) => {
    const div = document.createElement("div");
    const singleToday = item.unwatched === 1 && !!item.items[0] && utcDayStr(item.items[0].air_at) === utcTodayStr();
    div.className = singleToday ? "card today-release-card" : "card unwatched-card";
    let bottom;
    if (item.unwatched === 1) {
      const lbl = unwatchedFirstLabel(item);
      bottom = singleToday
        ? `<div class="next-ep today">${lbl} ${t("today_airing")}</div>`
        : `<div class="next-ep today">${lbl}</div>`;
    } else {
      bottom = `<div class="next-ep unwatched-count">${t("unwatched_count", { n: item.unwatched })}</div>`;
    }
    div.innerHTML = `
      ${item.cover_url ? `<img src="${item.cover_url}" alt="${item.title}" onerror="this.outerHTML=noPosterFallback()" />` : `<div class="no-poster">${FILM_SVG}</div>`}
      <div class="info">
        <div class="title">${item.title}</div>
        <div class="meta">
          <span class="badge badge-anime">${t("tab_anime")}</span>
          ${item.score ? scoreTag(item.score / 10) : ""}
          ${platformTag(item.studios)}
          ${bottom}
        </div>
      </div>
      <button class="calendar-btn" data-tip="${t("calendar_title")}">${CALENDAR_SVG}</button>
    `;
    div.querySelector(".calendar-btn").onclick = (e) => {
      e.stopPropagation();
      openUnwatchedModal(item, true);
    };
    div.onclick = () => openAnimeDetails(item.id, item.anilist_id, item.title);
    animeGrid.appendChild(div);
    applyTitleHint(div);
  });
}

const DEFAULT_ORDER = ["shows", "movies", "anime"];

async function loadWatched() {
  let data = { shows: [], anime: [], movies: [] };
  try {
    const res = await fetch("/api/watched");
    data = await res.json();
  } catch (e) {
    data = { shows: [], anime: [], movies: [] };
  }
  const watchedView = document.getElementById("view-watched");
  const empty = document.getElementById("empty-watched");
  const showsGrid = document.getElementById("watched-shows");
  const moviesGrid = document.getElementById("watched-movies");
  const animeGrid = document.getElementById("watched-anime");
  showsGrid.innerHTML = "";
  moviesGrid.innerHTML = "";
  animeGrid.innerHTML = "";

  const shows = applySort((data.shows || []).map((s) => ({ ...s, isAnime: false })));
  const movies = applySort((data.movies || []).map((m) => ({ ...m, isAnime: false })));
  const animes = applySort((data.anime || []).map((a) => ({ ...a, isAnime: true })));

  const hasContent = { shows: shows.length, movies: movies.length, anime: animes.length };

  document.getElementById("watched-shows-wrap").style.display = shows.length ? "" : "none";
  document.getElementById("watched-movies-wrap").style.display = movies.length ? "" : "none";
  const animeWrap = document.getElementById("watched-anime-wrap");
  animeWrap.style.display = animes.length ? "" : "none";
  animeWrap.classList.toggle("has-shows", shows.length > 0);
  empty.style.display = shows.length || movies.length || animes.length ? "none" : "block";

  const order = loadSectionOrder("watched").filter((s) => hasContent[s]);
  ["shows", "movies", "anime"].forEach((s) => {
    if (hasContent[s] && !order.includes(s)) order.push(s);
  });
  order.forEach((s) => {
    const wrap = document.getElementById(`watched-${s}-wrap`);
    if (wrap) watchedView.insertBefore(wrap, empty);
  });
  updateMoveButtons("view-watched");

  shows.forEach((item) => {
    const div = document.createElement("div");
    div.className = "card unwatched-card";
    div.innerHTML = `
      ${posterHTML(item.poster_path, item.title, true)}
      <div class="info">
        <div class="title">${item.title}</div>
        <div class="meta">
          <span class="badge badge-tv">${typeLabel("tv")}</span>
          ${scoreTag(item.vote_average)}
          ${platformTag(item.networks)}
          <div class="next-ep unwatched-count">${t("watched_count", { n: item.watched })}</div>
        </div>
      </div>
      <button class="calendar-btn" data-tip="${t("calendar_title")}">${CALENDAR_SVG}</button>
      <button class="move-back-btn" data-tip="${t("move_back_to", { view: t("tab_dizi") })}"><i class="fa-solid fa-right-to-bracket"></i></button>
    `;
    div.querySelector(".calendar-btn").onclick = (e) => {
      e.stopPropagation();
      openReleases("tv", item.tmdb_id, item.title);
    };
    div.querySelector(".move-back-btn").onclick = async (e) => {
      e.stopPropagation();
      await moveBackFromWatched(item, "dizi");
    };
    div.onclick = () => openDetails("tv", item.tmdb_id, item.title);
    showsGrid.appendChild(div);
    applyTitleHint(div);
  });

  movies.forEach((item) => {
    const div = document.createElement("div");
    div.className = "card unwatched-card";
    let dateLine = item.release_date
      ? dateState(item.release_date) === "date-past"
        ? `<div class="next-ep muted">${formatDate(item.release_date).text}</div>`
        : `<div class="next-ep">${formatDate(item.release_date).text}</div>`
      : `<div>${t("date_unknown")}</div>`;
    div.innerHTML = `
      ${posterHTML(item.poster_path, item.title, true)}
      <div class="info">
        <div class="title">${item.title}</div>
        <div class="meta">
          <span class="badge badge-movie">${typeLabel("movie")}</span>
          ${scoreTag(item.vote_average)}
          ${platformTag(item.networks)}
          ${dateLine}
        </div>
      </div>
      <button class="calendar-btn" data-tip="${t("calendar_title")}">${CALENDAR_SVG}</button>
    `;
    div.querySelector(".calendar-btn").onclick = (e) => {
      e.stopPropagation();
      openReleases("movie", item.tmdb_id, item.title);
    };
    div.onclick = () => openDetails("movie", item.tmdb_id, item.title);
    moviesGrid.appendChild(div);
    applyTitleHint(div);
  });

  animes.forEach((item) => {
    const div = document.createElement("div");
    div.className = "card unwatched-card";
    div.innerHTML = `
      ${item.cover_url ? `<img src="${item.cover_url}" alt="${item.title}" onerror="this.outerHTML=noPosterFallback()" />` : `<div class="no-poster">${FILM_SVG}</div>`}
      <div class="info">
        <div class="title">${item.title}</div>
        <div class="meta">
          <span class="badge badge-anime">${t("tab_anime")}</span>
          ${item.score ? scoreTag(item.score / 10) : ""}
          ${platformTag(item.studios)}
          <div class="next-ep unwatched-count">${t("watched_count", { n: item.watched })}</div>
        </div>
      </div>
      <button class="calendar-btn" data-tip="${t("calendar_title")}">${CALENDAR_SVG}</button>
      <button class="move-back-btn" data-tip="${t("move_back_to", { view: t("tab_anime") })}"><i class="fa-solid fa-right-to-bracket"></i></button>
    `;
    div.querySelector(".calendar-btn").onclick = (e) => {
      e.stopPropagation();
      openAnimeSchedule(item.id, item.title);
    };
    div.querySelector(".move-back-btn").onclick = async (e) => {
      e.stopPropagation();
      await moveBackFromWatched(item, "anime");
    };
    div.onclick = () => openAnimeDetails(item.id, item.anilist_id, item.title);
    animeGrid.appendChild(div);
    applyTitleHint(div);
  });
}

async function moveBackFromWatched(item, targetView) {
  const isAnime = !!item.isAnime;
  let r;
  if (isAnime) {
    r = await fetch("/api/anime/move-watched", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anime_id: item.id, watched: 0 }),
    });
  } else {
    r = await fetch("/api/followed/move-watched", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdb_id: item.tmdb_id, media_type: item.media_type || (targetView === "film" ? "movie" : "tv"), watched: 0 }),
    });
  }
  const j = await r.json();
  if (!r.ok) {
    toast(j.error || t("error"));
    return;
  }
  toast(t("moved_back"));
  await loadWatched();
  const empty = document.getElementById("empty-watched");
  const stillHasCards = !empty || empty.style.display === "none";
  if (!stillHasCards) {
    switchView(targetView);
  }
}

function loadSectionOrder(prefix) {
  const key = prefix + "SectionOrder";
  try {
    const v = JSON.parse(localStorage.getItem(key) || "null");
    if (Array.isArray(v) && v.length) return v;
  } catch (e) {}
  return [...DEFAULT_ORDER];
}

function saveSectionOrder(prefix, order) {
  const key = prefix + "SectionOrder";
  try {
    localStorage.setItem(key, JSON.stringify(order));
  } catch (e) {}
}

function updateMoveButtons(viewId) {
  const view = document.getElementById(viewId);
  if (!view) return;
  const visible = [];
  view.querySelectorAll("[id$='-wrap']").forEach((w) => {
    if (w.style.display !== "none") visible.push(w);
  });
  visible.forEach((w, idx) => {
    const up = w.querySelector(".section-move-up");
    const down = w.querySelector(".section-move-down");
    if (up) up.disabled = idx === 0;
    if (down) down.disabled = idx === visible.length - 1;
  });
}

function moveSection(section, dir, prefix, viewId, emptyId) {
  const view = document.getElementById(viewId);
  if (!view) return;
  const wrap = document.getElementById(`${prefix}-${section}-wrap`);
  if (!wrap || wrap.style.display === "none") return;
  const visible = [];
  view.querySelectorAll("[id$='-wrap']").forEach((w) => {
    if (w.style.display !== "none") visible.push(w);
  });
  const idx = visible.indexOf(wrap);
  if (idx < 0) return;
  const target = dir === "up" ? idx - 1 : idx + 1;
  if (target < 0 || target >= visible.length) return;
  const empty = document.getElementById(emptyId);
  if (dir === "up") {
    view.insertBefore(wrap, visible[target]);
  } else {
    if (visible[target].nextSibling && visible[target].nextSibling !== empty) {
      view.insertBefore(wrap, visible[target].nextSibling);
    } else {
      view.insertBefore(wrap, empty);
    }
  }
  const order = visible.map((w) => w.id.replace(`${prefix}-`, "").replace("-wrap", ""));
  const targetId = order[idx];
  const newId = order[target];
  order[idx] = newId;
  order[target] = targetId;
  saveSectionOrder(prefix, order);
  updateMoveButtons(viewId);
}

document.addEventListener("click", (e) => {
  const up = e.target.closest(".section-move-up");
  if (up && !up.disabled) {
    moveSection(up.dataset.section, "up", up.dataset.prefix, up.dataset.view, up.dataset.empty);
    return;
  }
  const down = e.target.closest(".section-move-down");
  if (down && !down.disabled) {
    moveSection(down.dataset.section, "down", down.dataset.prefix, down.dataset.view, down.dataset.empty);
  }
});

export { switchView, loadFollowed, loadAnime, loadUnwatched, loadWatched, animeNextText, animeStatusLabel, applySort, updateSortMenu, views, tabs, sortMenu, activateUtilityTab };