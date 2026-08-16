const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

const views = {
  followed: document.getElementById("view-followed"),
  search: document.getElementById("view-search"),
  settings: document.getElementById("view-settings"),
};

const tabs = {
  followed: document.getElementById("tab-followed"),
  search: document.getElementById("tab-search"),
  settings: document.getElementById("tab-settings"),
};

function switchView(name) {
  Object.keys(views).forEach((k) => views[k].classList.remove("active"));
  Object.keys(tabs).forEach((k) => tabs[k].classList.remove("active"));
  views[name].classList.add("active");
  tabs[name].classList.add("active");
  if (name === "followed") loadFollowed();
  if (name === "settings") loadSettings();
}

tabs.followed.onclick = () => switchView("followed");
tabs.search.onclick = () => switchView("search");
tabs.settings.onclick = () => switchView("settings");

function posterHTML(posterPath, title) {
  if (posterPath) {
    return `<img src="${IMAGE_BASE}${posterPath}" alt="${title}" onerror="this.outerHTML='<div class=&quot;no-poster&quot;>🎬</div>'" />`;
  }
  return `<div class="no-poster">🎬</div>`;
}

function scoreTag(v) {
  if (!v || Number(v) <= 0) return "";
  return `<span class="badge badge-score">${Number(v).toFixed(1)}</span>`;
}

function typeLabel(t) {
  return t === "tv" ? "Dizi" : "Film";
}

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

const CALENDAR_SVG = `
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>`;

function formatDate(dateStr) {
  if (!dateStr) return { text: "Tarih bilinmiyor", day: "" };
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return { text: dateStr, day: "" };
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const days = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  return { text: `${dd}/${mm}/${yyyy}`, day: days[d.getDay()] };
}

function shortDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  const months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return d.getTime() === today.getTime();
}

function dateState(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (d.getTime() < today.getTime()) return "date-past";
  if (d.getTime() > today.getTime()) return "date-future";
  return "date-today";
}

async function openReleases(mediaType, tmdbId, title) {
  const modal = document.getElementById("releases-modal");
  const body = document.getElementById("releases-body");
  document.getElementById("releases-title").textContent = title || "";
  body.innerHTML = '<div class="releases-loading">Yükleniyor...</div>';
  modal.style.display = "flex";

  try {
    const res = await fetch(`/api/releases?media_type=${encodeURIComponent(mediaType)}&tmdb_id=${encodeURIComponent(tmdbId)}&title=${encodeURIComponent(title || "")}`);
    const data = await res.json();
    if (!res.ok) {
      body.innerHTML = `<div class="releases-error">${data.error || "Veri alınamadı"}</div>`;
      return;
    }
    document.getElementById("releases-title").textContent = data.title || title || "";

    if (!data.items.length) {
      body.innerHTML = '<div class="releases-error">Yayın tarihi bulunamadı.</div>';
      return;
    }

    const groups = {};
    data.items.forEach((it) => {
      const season = it.season != null ? it.season : "other";
      if (!groups[season]) groups[season] = [];
      groups[season].push(it);
    });

    const seasonNames = Object.keys(groups).sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return 0;
    });

    let html = "";
    seasonNames.forEach((seasonKey) => {
      const seasonItems = groups[seasonKey];
      const seasonLabel =
        seasonKey === "other"
          ? data.media_type === "movie"
            ? "Yayın Tarihi"
            : "Diğer"
          : `Sezon ${seasonKey}`;
      html += `<div class="season-box">`;
      if (data.media_type === "tv") {
        const releasedItems = seasonItems.filter((it) => {
          const st = dateState(it.date);
          return st === "date-past" || st === "date-today";
        });
        const total = seasonItems.length;
        const watched = seasonItems.filter((it) => it.watched).length;
        const pct = total ? Math.round((watched / total) * 100) : 0;
        const allWatched = total > 0 && watched === total;
        const btnDisabled = releasedItems.length === 0 ? " disabled" : "";
        html += `<div class="season-box-title"><span class="season-name">${seasonLabel}</span><div class="season-progress"><div class="season-progress-fill" style="width:${pct}%"></div><span class="season-progress-text">${watched}/${total} · %${pct}</span></div><button class="season-watch-all" data-s="${seasonKey}" data-w="${allWatched ? 0 : 1}"${btnDisabled}>${allWatched ? "Temizle" : "Tümünü izle"}</button></div>`;
      } else {
        html += `<div class="season-box-title">${seasonLabel}</div>`;
      }
      html += `<table class="releases-table"><thead><tr><th>Bölüm</th><th>Tarih</th></tr></thead><tbody>`;
      seasonItems.forEach((it) => {
        const f = formatDate(it.date);
        const st = dateState(it.date);
        const dateClass = st ? ` class="${st}"` : "";
        const epName = it.episode_name
          ? `<div class="episode-name">${it.episode_name}</div>`
          : "";
        const watchedClass = it.watched ? " watched" : "";
        const released = st === "date-past" || st === "date-today" ? 1 : 0;
        const btnDisabled = released === 0 ? " disabled" : "";
        const btnCls = it.watched ? "watch-btn on" : "watch-btn";
        const checkIcon = it.watched ? "✓" : "";
        html += `<tr class="${watchedClass}" data-released="${released}">`;
        if (data.media_type === "tv") {
          html += `<td><button class="${btnCls}" data-s="${it.season}" data-e="${it.episode}" data-w="${it.watched ? 1 : 0}"${btnDisabled}>${checkIcon}</button><span class="episode-cell"><span class="episode-label">${it.label}</span>${epName}</span></td>`;
        } else {
          html += `<td><div class="episode-label">${it.label}</div>${epName}</td>`;
        }
        html += `<td${dateClass}>${f.text}</td></tr>`;
      });
      html += "</tbody></table></div>";
    });

    body.innerHTML = html || '<div class="releases-error">Yayın tarihi bulunamadı.</div>';

    if (data.media_type === "tv") {
      body.querySelectorAll(".watch-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (btn.disabled) return;
          const season = btn.dataset.s;
          const episode = btn.dataset.e;
          const watched = btn.dataset.w === "1" ? 0 : 1;
          const res = await fetch("/api/episode/watch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tmdb_id: tmdbId,
              season: Number(season),
              episode: Number(episode),
              watched,
            }),
          });
          if (!res.ok) return;
          btn.dataset.w = String(watched);
          btn.classList.toggle("on", watched === 1);
          btn.textContent = watched ? "✓" : "";
          const tr = btn.closest("tr");
          tr.classList.toggle("watched", watched === 1);

          const seasonBox = btn.closest(".season-box");
          const allRows = seasonBox.querySelectorAll("tbody tr");
          const releasedCount = seasonBox.querySelectorAll("tbody tr[data-released='1']").length;
          const total = allRows.length;
          const done = seasonBox.querySelectorAll("tbody tr.watched").length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          const prog = seasonBox.querySelector(".season-progress-text");
          const bar = seasonBox.querySelector(".season-progress-fill");
          if (prog) prog.textContent = `${done}/${total} · %${pct}`;
          if (bar) bar.style.width = pct + "%";
          const allBtn = seasonBox.querySelector(".season-watch-all");
          if (allBtn) {
            const allDone = total > 0 && done === total;
            allBtn.dataset.w = allDone ? 0 : 1;
            allBtn.textContent = allDone ? "Temizle" : "Tümünü izle";
            allBtn.disabled = releasedCount === 0;
          }
        });
      });

      body.querySelectorAll(".season-watch-all").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const season = btn.dataset.s;
          const watched = btn.dataset.w === "1" ? 1 : 0;
          const res = await fetch("/api/season/watch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tmdb_id: tmdbId,
              season: Number(season),
              watched,
            }),
          });
          if (!res.ok) return;
          const seasonBox = btn.closest(".season-box");
          const rows = seasonBox.querySelectorAll("tbody tr");
          rows.forEach((tr) => {
            const isReleased = tr.dataset.released === "1";
            const b = tr.querySelector(".watch-btn");
            if (watched === 1 && !isReleased) {
              if (b) b.disabled = true;
              return;
            }
            tr.classList.toggle("watched", watched === 1);
            b.dataset.w = String(watched);
            b.classList.toggle("on", watched === 1);
            b.textContent = watched ? "✓" : "";
            b.disabled = false;
          });
          const releasedCount = seasonBox.querySelectorAll("tbody tr[data-released='1']").length;
          const total = rows.length;
          const done = seasonBox.querySelectorAll("tbody tr.watched").length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          const prog = seasonBox.querySelector(".season-progress-text");
          const bar = seasonBox.querySelector(".season-progress-fill");
          if (prog) prog.textContent = `${done}/${total} · %${pct}`;
          if (bar) bar.style.width = pct + "%";
          const allDone = total > 0 && done === total;
          btn.dataset.w = allDone ? 0 : 1;
          btn.textContent = allDone ? "Temizle" : "Tümünü izle";
          btn.disabled = releasedCount === 0;
        });
      });
    }
  } catch (e) {
    body.innerHTML = '<div class="releases-error">Bağlantı hatası oluştu.</div>';
  }
}

function closeReleases() {
  document.getElementById("releases-modal").style.display = "none";
}

function closeDetails() {
  document.getElementById("details-modal").style.display = "none";
}

function closeModals() {
  closeReleases();
  closeDetails();
  closeConfirm();
}

function closeConfirm() {
  document.getElementById("confirm-modal").style.display = "none";
}

function showConfirm(text, onYes) {
  document.getElementById("confirm-text").textContent = text;
  document.getElementById("confirm-modal").style.display = "flex";
  document.getElementById("confirm-yes").onclick = () => {
    closeConfirm();
    onYes();
  };
  document.getElementById("confirm-no").onclick = closeConfirm;
  document.getElementById("confirm-close").onclick = closeConfirm;
  document.getElementById("confirm-modal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeConfirm();
  });
}

document.getElementById("releases-close").onclick = closeReleases;
document.getElementById("releases-modal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closeReleases();
});
document.getElementById("details-close").onclick = closeDetails;
document.getElementById("details-modal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closeDetails();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModals();
});

function fmtRuntime(min) {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h} sa ${m} dk`;
  if (h) return `${h} sa`;
  return `${m} dk`;
}

function fmtScore(v) {
  if (v == null) return "";
  return Number(v).toFixed(1);
}

async function openDetails(mediaType, tmdbId, title) {
  const modal = document.getElementById("details-modal");
  const body = document.getElementById("details-body");
  document.getElementById("details-title").textContent = title || "";
  body.innerHTML = '<div class="releases-loading">Yükleniyor...</div>';
  modal.style.display = "flex";

  try {
    const res = await fetch(`/api/details?media_type=${encodeURIComponent(mediaType)}&tmdb_id=${encodeURIComponent(tmdbId)}`);
    const data = await res.json();
    if (!res.ok) {
      body.innerHTML = `<div class="releases-error">${data.error || "Veri alınamadı"}</div>`;
      return;
    }
    document.getElementById("details-title").textContent = data.title || title || "";

    let html = '<div class="details-wrap">';
    if (data.poster_path) {
      html += `<div class="details-poster-col"><img class="details-poster" src="${IMAGE_BASE}${data.poster_path}" alt="${data.title}" /></div>`;
    }

    html += '<div class="details-main">';

    if (data.tagline) {
      html += `<div class="details-tagline">${data.tagline}</div>`;
    }

    const badges = [];
    if (data.media_type === "tv") {
      badges.push("Dizi");
      if (data.number_of_seasons) badges.push(`${data.number_of_seasons} Sezon`);
      if (data.number_of_episodes) badges.push(`${data.number_of_episodes} Bölüm`);
      if (data.status) badges.push(data.status);
      if (data.first_air_date) badges.push(formatDate(data.first_air_date).text);
    } else {
      badges.push("Film");
      if (data.release_date) badges.push(formatDate(data.release_date).text);
    }
    if (data.runtime) badges.push(fmtRuntime(data.runtime));
    if (data.genres && data.genres.length) badges.push(data.genres.join(", "));

    html += '<div class="details-meta">';
    badges.forEach((b) => {
      html += `<span class="detail-badge">${b}</span>`;
    });
    html += "</div>";

    if (data.vote_average != null) {
      html += `<div class="details-rating">⭐ ${fmtScore(data.vote_average)} / 10 <span class="details-votes">(${data.vote_count || 0} oy)</span></div>`;
    }

    if (data.overview) {
      html += `<p class="details-overview">${data.overview}</p>`;
    }

    if (data.cast && data.cast.length) {
      html += '<div class="details-cast"><div class="details-cast-title">Oyuncular</div><div class="details-cast-list">';
      data.cast.forEach((c) => {
        const img = c.profile_path
          ? `<img class="cast-avatar" src="${IMAGE_BASE}${c.profile_path}" alt="${c.name}" />`
          : `<div class="cast-avatar cast-avatar-fallback">${c.name.charAt(0)}</div>`;
        html += `<div class="cast-item">${img}<div class="cast-info"><div class="cast-name">${c.name}</div><div class="cast-char">${c.character || ""}</div></div></div>`;
      });
      html += "</div></div>";
    }

    html += `<button class="btn primary detail-calendar-btn" data-mt="${mediaType}" data-id="${tmdbId}" data-title="${encodeURIComponent(data.title || title || "")}">Yayın Takvimi</button>`;
    html += "</div></div>";

    body.innerHTML = html;

    body.querySelector(".detail-calendar-btn").onclick = () => {
      closeDetails();
      openReleases(mediaType, tmdbId, data.title || title || "");
    };
  } catch (e) {
    body.innerHTML = '<div class="releases-error">Bağlantı hatası oluştu.</div>';
  }
}

// ---- Followed ----
async function loadFollowed() {
  const res = await fetch("/api/followed");
  const items = await res.json();
  const grid = document.getElementById("poster-grid");
  const empty = document.getElementById("empty-followed");
  grid.innerHTML = "";
  empty.style.display = items.length ? "none" : "block";

  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      ${posterHTML(item.poster_path, item.title)}
      <div class="info">
        <div class="title">${item.title}</div>
        <div class="meta">
          <span class="badge badge-${item.media_type}">${typeLabel(item.media_type)}</span>
          ${scoreTag(item.vote_average)}
          ${
            item.media_type === "tv"
              ? item.next_episode
                ? isToday(item.next_episode.air_date)
                  ? `<div class="next-ep today">S${String(item.next_episode.season).padStart(2, "0")}E${String(item.next_episode.episode).padStart(2, "0")} Bugün Yayında</div>`
                  : `<div class="next-ep">S${String(item.next_episode.season).padStart(2, "0")}E${String(item.next_episode.episode).padStart(2, "0")} · ${shortDate(item.next_episode.air_date)}</div>`
                : `<div class="next-ep muted">Yeni Sezon Bekleniyor</div>`
              : `<div>${item.release_date || "Tarih bilinmiyor"}</div>`
          }
          ${item.notified ? '<div style="color:#6ee7a0">✓ Bildirildi</div>' : ""}
        </div>
      </div>
      <button class="calendar-btn" title="Yayın takvimi">${CALENDAR_SVG}</button>
      <button class="remove" title="Takibi bırak">&times;</button>
    `;
    div.querySelector(".remove").onclick = (e) => {
      e.stopPropagation();
      showConfirm(
        `"${item.title}" takibini bırakmak istiyor musunuz?`,
        async () => {
          await fetch(`/api/unfollow/${item.id}`, { method: "DELETE" });
          loadFollowed();
          toast("Takip bırakıldı");
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
  });
}

// ---- Search ----
async function doSearch() {
  const q = document.getElementById("search-input").value.trim();
  if (!q) return;
  const res = await fetch("/api/search?q=" + encodeURIComponent(q));
  const data = await res.json();
  const grid = document.getElementById("search-results");
  grid.innerHTML = "";
  if (!res.ok) {
    toast(data.error || "Arama hatası");
    return;
  }
  if (!data.length) {
    grid.innerHTML = '<div class="empty">Sonuç bulunamadı.</div>';
    return;
  }
  data.forEach((item) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      ${posterHTML(item.poster_path, item.title)}
      <div class="info">
        <div class="title">${item.title}</div>
        <div class="meta">
          <span class="badge badge-${item.media_type}">${typeLabel(item.media_type)}</span>
          ${scoreTag(item.vote_average)}
          <div>${item.release_date || ""}</div>
        </div>
      </div>
      <button class="remove" style="display:block" title="Takip et">+</button>
    `;
    div.querySelector(".remove").onclick = async (e) => {
      e.stopPropagation();
      const r = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdb_id: item.tmdb_id,
          media_type: item.media_type,
          title: item.title,
          poster_path: item.poster_path,
        }),
      });
      const j = await r.json();
      toast(r.ok ? "Takibe eklendi" : j.error || "Hata");
      if (r.ok) switchView("followed");
    };
    div.onclick = () => {
      openDetails(item.media_type, item.tmdb_id, item.title);
    };
    grid.appendChild(div);
  });
}

document.getElementById("search-btn").onclick = doSearch;
document.getElementById("search-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") doSearch();
});

// ---- Settings ----
async function loadSettings() {
  const res = await fetch("/api/settings");
  const s = await res.json();
  document.getElementById("s-tmdb").value = s.tmdb_api_key || "";
  document.getElementById("s-token").value = s.telegram_bot_token || "";
  document.getElementById("s-chat").value = s.telegram_chat_id || "";
  document.getElementById("s-hour").value = s.notify_hour || "09:00";
}

function showMsg(text, ok) {
  const el = document.getElementById("settings-msg");
  el.textContent = text;
  el.className = "msg " + (ok ? "success" : "error");
  setTimeout(() => (el.className = "msg"), 4000);
}

document.getElementById("save-settings").onclick = async () => {
  const body = {
    tmdb_api_key: document.getElementById("s-tmdb").value.trim(),
    telegram_bot_token: document.getElementById("s-token").value.trim(),
    telegram_chat_id: document.getElementById("s-chat").value.trim(),
    notify_hour: document.getElementById("s-hour").value,
  };
  const r = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  showMsg("Ayarlar kaydedildi ✅", r.ok);
};

document.getElementById("test-settings").onclick = async () => {
  const body = {
    telegram_bot_token: document.getElementById("s-token").value.trim(),
    telegram_chat_id: document.getElementById("s-chat").value.trim(),
  };
  const r = await fetch("/api/settings/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  showMsg(r.ok ? "Test mesajı gönderildi ✅" : j.error || "Hata", r.ok);
};

switchView("followed");
