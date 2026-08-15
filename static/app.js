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
      html += `<div class="season-box-title">${seasonLabel}</div>`;
      html += `<table class="releases-table"><thead><tr><th>Bölüm</th><th>Tarih</th><th>Gün</th></tr></thead><tbody>`;
      seasonItems.forEach((it) => {
        const f = formatDate(it.date);
        const epName = it.episode_name
          ? `<div class="episode-name">${it.episode_name}</div>`
          : "";
        html += `<tr><td><div class="episode-label">${it.label}</div>${epName}</td><td>${f.text}</td><td>${f.day}</td></tr>`;
      });
      html += "</tbody></table></div>";
    });

    body.innerHTML = html || '<div class="releases-error">Yayın tarihi bulunamadı.</div>';
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
      html += `<img class="details-poster" src="${IMAGE_BASE}${data.poster_path}" alt="${data.title}" />`;
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
          <div>${item.release_date || "Tarih bilinmiyor"}</div>
          ${item.notified ? '<div style="color:#6ee7a0">✓ Bildirildi</div>' : ""}
        </div>
      </div>
      <button class="calendar-btn" title="Yayın takvimi">${CALENDAR_SVG}</button>
      <button class="remove" title="Takibi bırak">&times;</button>
    `;
    div.querySelector(".remove").onclick = (e) => {
      e.stopPropagation();
      fetch(`/api/unfollow/${item.id}`, { method: "DELETE" });
      loadFollowed();
      toast("Takip bırakıldı");
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
