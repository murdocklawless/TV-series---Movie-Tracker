// Faz 4: views — görünüm (tab) yönetimi, sıralama ve ana liste yükleyicileri (takip edilenler / anime / izlenmemiş).
import { state } from "./state.js";
import { t } from "./i18n.js";
import {
  posterHTML, scoreTag, platformTag, typeLabel, applyTitleHint,
  formatDate, shortDate, shortDateShort, isMobile, daysUntil, daysHint,
  isToday, dateState, utcDayStr, utcTodayStr, FILM_SVG,
} from "./utils.js";
import { openDetails, openReleases, openAnimeDetails, openAnimeSchedule, showConfirm, openUnwatchedModal } from "./components.js";
import { renderChips, closeResultsModal } from "./search.js";
import { closeSettingsMenu } from "./settings.js";

const views = {
  followed: document.getElementById("view-followed"),
  anime: document.getElementById("view-anime"),
  unwatched: document.getElementById("view-unwatched"),
  search: document.getElementById("view-search"),
};

const tabs = {
  followed: document.getElementById("tab-followed"),
  anime: document.getElementById("tab-anime"),
  unwatched: document.getElementById("tab-unwatched"),
  search: document.getElementById("tab-search"),
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
  if (name === "followed") loadFollowed();
  if (name === "anime") loadAnime();
  if (name === "unwatched") loadUnwatched();
}

tabs.followed.onclick = () => switchView("followed");
tabs.anime.onclick = () => switchView("anime");
tabs.unwatched.onclick = () => switchView("unwatched");
tabs.search.onclick = () => switchView("search");
document.getElementById("search-close").onclick = () => switchView("followed");

try {
  state.sortKey = localStorage.getItem("sortKey") || "added";
} catch (e) {}

function sortValue(item) {
  if (state.sortKey === "alpha") return (item.title || "").toLocaleLowerCase();
  if (state.sortKey === "score") return item.score != null ? item.score : item.vote_average || 0;
  if (state.sortKey === "date") {
    if (item.media_type) {
      if (item.media_type === "tv") return item.next_episode ? item.next_episode.air_date || "" : "";
      return item.release_date || "";
    }
    return item.next_episode ? new Date(item.next_episode.airing_at * 1000).toISOString() : "";
  }
  if (state.sortKey === "type") return item.media_type || item.format || "";
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
document.getElementById("tab-sort").onclick = (e) => {
  e.stopPropagation();
  closeSettingsMenu();
  const open = sortMenu.classList.contains("open");
  sortMenu.classList.toggle("open", !open);
  updateSortMenu();
};
document.querySelectorAll(".sort-item").forEach((btn) => {
  btn.onclick = (e) => {
    e.stopPropagation();
    state.sortKey = btn.dataset.sort;
    try {
      localStorage.setItem("sortKey", state.sortKey);
    } catch (e2) {}
    sortMenu.classList.remove("open");
    if (views.followed.classList.contains("active")) loadFollowed();
    if (views.anime.classList.contains("active")) loadAnime();
  };
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".sort-wrap")) sortMenu.classList.remove("open");
});

async function loadFollowed() {
  const res = await fetch("/api/followed");
  let items = await res.json();
  items = applySort(items);
  const grid = document.getElementById("poster-grid");
  const empty = document.getElementById("empty-followed");
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
                : `<div class="next-ep muted">${t("new_season")}</div>`
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
      <button class="remove" data-tip="${t("unfollow_title")}">&times;</button>
    `;
    div.querySelector(".remove").onclick = (e) => {
      e.stopPropagation();
      showConfirm(
        t("unfollow_confirm", { title: item.title }),
        async () => {
          await fetch(`/api/unfollow/${item.id}`, { method: "DELETE" });
          loadFollowed();
          toast(t("unfollowed"));
        }
      );
    };
    div.querySelector(".calendar-btn").onclick = (e) => {
      e.stopPropagation();
      openReleases(item.media_type, item.tmdb_id, item.title);
    };
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
    div.className = animeToday ? "card today-release-card" : "card";
    div.innerHTML = `
      ${item.cover_url ? `<img src="${item.cover_url}" alt="${item.title}" onerror="this.outerHTML=noPosterFallback()" />` : `<div class="no-poster">${FILM_SVG}</div>`}
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
  let data = { shows: [], anime: [] };
  try {
    const res = await fetch("/api/unwatched");
    data = await res.json();
  } catch (e) {
    data = { shows: [], anime: [] };
  }
  const showsWrap = document.getElementById("unwatched-shows-wrap");
  const animeWrap = document.getElementById("unwatched-anime-wrap");
  const empty = document.getElementById("empty-unwatched");
  const showsGrid = document.getElementById("unwatched-shows");
  const animeGrid = document.getElementById("unwatched-anime");
  showsGrid.innerHTML = "";
  animeGrid.innerHTML = "";

  const shows = (data.shows || []).map((s) => ({ ...s, isAnime: false }));
  const animes = (data.anime || []).map((a) => ({ ...a, isAnime: true }));

  showsWrap.style.display = shows.length ? "" : "none";
  animeWrap.style.display = animes.length ? "" : "none";
  animeWrap.classList.toggle("has-shows", shows.length > 0);
  empty.style.display = shows.length || animes.length ? "none" : "block";

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
    `;
    if (item.unwatched > 1) {
      div.onclick = () => openUnwatchedModal(item, false);
    }
    showsGrid.appendChild(div);
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
    `;
    if (item.unwatched > 1) {
      div.onclick = () => openUnwatchedModal(item, true);
    }
    animeGrid.appendChild(div);
    applyTitleHint(div);
  });
}


export { switchView, loadFollowed, loadAnime, loadUnwatched, animeNextText, animeStatusLabel, applySort, updateSortMenu, views, tabs };
