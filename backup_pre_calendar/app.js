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

function typeLabel(t) {
  return t === "tv" ? "Dizi" : "Film";
}

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
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
          <span class="badge">${typeLabel(item.media_type)}</span>
          <div>${item.release_date || "Tarih bilinmiyor"}</div>
          ${item.notified ? '<div style="color:#6ee7a0">✓ Bildirildi</div>' : ""}
        </div>
      </div>
      <button class="remove" title="Takibi bırak">&times;</button>
    `;
    div.querySelector(".remove").onclick = async () => {
      await fetch(`/api/unfollow/${item.id}`, { method: "DELETE" });
      loadFollowed();
      toast("Takip bırakıldı");
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
          <span class="badge">${typeLabel(item.media_type)}</span>
          <div>${item.release_date || ""}</div>
        </div>
      </div>
      <button class="remove" style="display:block" title="Takip et">+</button>
    `;
    div.querySelector(".remove").onclick = async () => {
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
