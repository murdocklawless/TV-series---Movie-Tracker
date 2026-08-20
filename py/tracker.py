import os
import sqlite3
import json
import time
import datetime
import threading
import requests
from flask import Flask, jsonify, request, send_from_directory
from apscheduler.schedulers.background import BackgroundScheduler
from zoneinfo import ZoneInfo
import zoneinfo

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Faz 2 klasör düzenlemesi için: .py dosyaları py/ altına taşınırsa BASE_DIR'i proje köküne sabitle
if os.path.basename(BASE_DIR) == "py":
    BASE_DIR = os.path.dirname(BASE_DIR)
DB_PATH = os.environ.get("DB_PATH", os.path.join(BASE_DIR, "db", "tracker.db"))
# Migration: eski konumda (root'ta data.db veya tracker.db) varsa ve hedefte yoksa onu kullan
if "DB_PATH" not in os.environ and not os.path.exists(DB_PATH):
    for legacy in (os.path.join(BASE_DIR, "data.db"), os.path.join(BASE_DIR, "tracker.db")):
        if os.path.exists(legacy):
            DB_PATH = legacy
            break
STATIC_DIR = os.path.join(BASE_DIR, "static")

TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path="/static")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute(
        """CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS followed (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tmdb_id INTEGER,
            media_type TEXT,
            title TEXT,
            poster_path TEXT,
            release_date TEXT,
            notified INTEGER DEFAULT 0,
            vote_average REAL DEFAULT 0
        )"""
    )
    cols = [r["name"] for r in conn.execute("PRAGMA table_info(followed)").fetchall()]
    if "vote_average" not in cols:
        conn.execute("ALTER TABLE followed ADD COLUMN vote_average REAL DEFAULT 0")
    if "networks" not in cols:
        conn.execute("ALTER TABLE followed ADD COLUMN networks TEXT")
    if "overview" not in cols:
        conn.execute("ALTER TABLE followed ADD COLUMN overview TEXT")
    if "genres" not in cols:
        conn.execute("ALTER TABLE followed ADD COLUMN genres TEXT")
    if "tagline" not in cols:
        conn.execute("ALTER TABLE followed ADD COLUMN tagline TEXT")
    if "runtime" not in cols:
        conn.execute("ALTER TABLE followed ADD COLUMN runtime INTEGER")
    if "number_of_seasons" not in cols:
        conn.execute("ALTER TABLE followed ADD COLUMN number_of_seasons INTEGER")
    if "number_of_episodes" not in cols:
        conn.execute("ALTER TABLE followed ADD COLUMN number_of_episodes INTEGER")
    if "status" not in cols:
        conn.execute("ALTER TABLE followed ADD COLUMN status TEXT")
    if "season_list" not in cols:
        conn.execute("ALTER TABLE followed ADD COLUMN season_list TEXT")
    if "vote_count" not in cols:
        conn.execute("ALTER TABLE followed ADD COLUMN vote_count INTEGER")
    if "first_air_date" not in cols:
        conn.execute("ALTER TABLE followed ADD COLUMN first_air_date TEXT")
    if "watched" not in cols:
        conn.execute("ALTER TABLE followed ADD COLUMN watched INTEGER DEFAULT 0")
    conn.execute(
        """CREATE TABLE IF NOT EXISTS episodes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            follow_id INTEGER,
            season INTEGER,
            episode INTEGER,
            air_date TEXT,
            air_time INTEGER,
            notified INTEGER DEFAULT 0,
            watched INTEGER DEFAULT 0,
            name TEXT,
            UNIQUE(follow_id, season, episode)
        )"""
    )
    ecols = [r["name"] for r in conn.execute("PRAGMA table_info(episodes)").fetchall()]
    if "watched" not in ecols:
        conn.execute("ALTER TABLE episodes ADD COLUMN watched INTEGER DEFAULT 0")
    if "name" not in ecols:
        conn.execute("ALTER TABLE episodes ADD COLUMN name TEXT")
    if "air_time" not in ecols:
        conn.execute("ALTER TABLE episodes ADD COLUMN air_time INTEGER")
    conn.execute(
        """CREATE TABLE IF NOT EXISTS cast (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            follow_id INTEGER,
            person_id INTEGER,
            name TEXT,
            character TEXT,
            profile_path TEXT,
            sort_order INTEGER DEFAULT 0
        )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS genres (
            source TEXT NOT NULL,
            name TEXT NOT NULL,
            UNIQUE(source, name)
        )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS anime (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            anilist_id INTEGER UNIQUE,
            title TEXT,
            cover_url TEXT,
            episodes INTEGER DEFAULT 0,
            status TEXT,
            score REAL,
            notified INTEGER DEFAULT 0
        )"""
    )
    acols = [r["name"] for r in conn.execute("PRAGMA table_info(anime)").fetchall()]
    if "score" not in acols:
        conn.execute("ALTER TABLE anime ADD COLUMN score REAL")
    if "studios" not in acols:
        conn.execute("ALTER TABLE anime ADD COLUMN studios TEXT")
    if "banner" not in acols:
        conn.execute("ALTER TABLE anime ADD COLUMN banner TEXT")
    if "description" not in acols:
        conn.execute("ALTER TABLE anime ADD COLUMN description TEXT")
    if "format" not in acols:
        conn.execute("ALTER TABLE anime ADD COLUMN format TEXT")
    if "duration" not in acols:
        conn.execute("ALTER TABLE anime ADD COLUMN duration INTEGER")
    if "genres" not in acols:
        conn.execute("ALTER TABLE anime ADD COLUMN genres TEXT")
    if "start_date" not in acols:
        conn.execute("ALTER TABLE anime ADD COLUMN start_date TEXT")
    conn.execute(
        """CREATE TABLE IF NOT EXISTS anime_cast (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            anime_id INTEGER,
            person_id INTEGER,
            name TEXT,
            image TEXT,
            sort_order INTEGER DEFAULT 0
        )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS anime_episodes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            anime_id INTEGER,
            episode INTEGER,
            air_at INTEGER,
            notified INTEGER DEFAULT 0,
            watched INTEGER DEFAULT 0,
            UNIQUE(anime_id, episode)
        )"""
    )
    conn.commit()
    conn.close()


ENV_KEYS = {
    "tmdb_api_key": "TMDB_API_KEY",
    "telegram_bot_token": "TELEGRAM_BOT_TOKEN",
    "telegram_chat_id": "TELEGRAM_CHAT_ID",
    "notify_hour": "NOTIFY_HOUR",
    "timezone": "TIMEZONE",
    "language": "LANGUAGE",
    "ntfy_topic": "NTFY_TOPIC",
}


def get_setting(key):
    env_name = ENV_KEYS.get(key)
    if env_name and os.environ.get(env_name):
        return os.environ.get(env_name)
    conn = get_db()
    row = conn.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    conn.close()
    return row["value"] if row else None


def today_str():
    """Seçili zaman diliminde bugünün tarihi (YYYY-MM-DD)."""
    tz_name = get_setting("timezone") or "Europe/Istanbul"
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = ZoneInfo("Europe/Istanbul")
    return datetime.datetime.now(tz).strftime("%Y-%m-%d")


def set_setting(key, value):
    conn = get_db()
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?, ?) "
        "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (key, value),
    )
    conn.commit()
    conn.close()


def tmdb_request(path, params=None):
    api_key = get_setting("tmdb_api_key")
    if not api_key:
        return None
    url = "https://api.themoviedb.org/3/" + path.lstrip("/")
    selected = get_setting("language") or "tr-TR"
    langs = ["en-US"]
    if selected != "en-US":
        langs.insert(0, selected)
    for lang in langs:
        p = {"api_key": api_key, "language": lang}
        if params:
            p.update(params)
        try:
            r = requests.get(url, params=p, timeout=15)
        except requests.RequestException:
            continue
        if r.status_code != 200:
            return None
        data = r.json()
        if _has_content(data):
            return data
    return None


_tvmaze_cache = {}
_TVMAZE_TTL = 6 * 3600  # 6 saat


def _tvmaze_episode_times(title):
    """TVmaze'ten dizi bölümlerinin yayın saatlerini (UTC epoch) döndürür.

    Dönüş: {(season, episode): epoch_saniye} veya None (bulunamadı/hata).
    """
    if not title:
        return None
    now = time.time()
    cached = _tvmaze_cache.get(title)
    if cached and now - cached[0] < _TVMAZE_TTL:
        return cached[1]
    try:
        r = requests.get(
            "https://api.tvmaze.com/singlesearch/shows",
            params={"q": title, "embed": "episodes"},
            timeout=15,
        )
        if r.status_code != 200:
            _tvmaze_cache[title] = (now, None)
            return None
        data = r.json()
    except requests.RequestException:
        _tvmaze_cache[title] = (now, None)
        return None
    eps = {}
    for ep in data.get("_embedded", {}).get("episodes", []):
        air = ep.get("airstamp")
        season = ep.get("season")
        number = ep.get("number")
        if air and season is not None and number is not None:
            try:
                dt = datetime.datetime.fromisoformat(air.replace("Z", "+00:00"))
                eps[(season, number)] = int(dt.timestamp())
            except ValueError:
                continue
    _tvmaze_cache[title] = (now, eps)
    return eps


ANILIST_URL = "https://graphql.anilist.co"


def anilist_query(query, variables=None):
    """AniList GraphQL isteği yapar."""
    try:
        r = requests.post(
            ANILIST_URL,
            json={"query": query, "variables": variables or {}},
            timeout=15,
        )
    except requests.RequestException:
        return None
    if r.status_code != 200:
        return None
    data = r.json()
    return data.get("data")


ANIME_SEARCH_QUERY = """
query ($q: String) {
  Page(page: 1, perPage: 20) {
    media(search: $q, type: ANIME) {
      id
      title { romaji english native }
      coverImage { large }
      format
      status
      episodes
      nextAiringEpisode { episode airingAt }
      averageScore
      startDate { year month day }
      genres
    }
  }
}
"""


def anilist_search(q):
    data = anilist_query(ANIME_SEARCH_QUERY, {"q": q})
    if not data or not data.get("Page"):
        return []
    return data["Page"].get("media") or []


ANIME_CHAR_MEDIA_QUERY = """
query ($characterId: Int) {
  Character(id: $characterId) {
    media(type: ANIME, perPage: 50) {
      nodes { id }
    }
  }
}
"""

ANIME_ADV_SEARCH_QUERY = """
query ($year: Int, $score: Int, $genres: [String], $q: String, $idIn: [Int]) {
  Page(page: 1, perPage: 20) {
    media(type: ANIME, seasonYear: $year, averageScore_greater: $score, genre_in: $genres, search: $q, id_in: $idIn) {
      id
      title { romaji english native }
      coverImage { large }
      format
      status
      episodes
      nextAiringEpisode { episode airingAt }
      averageScore
      startDate { year month day }
      genres
    }
  }
}
"""


def _anime_adv_results(year=None, score=None, genres=None, q=None, character_id=None):
    variables = {}
    if year is not None:
        variables["year"] = int(year)
    if score is not None:
        variables["score"] = int(round(float(score) * 10))
    if genres:
        variables["genres"] = [g.strip() for g in genres.split(",") if g.strip()]
    if q:
        variables["q"] = q
    if character_id is not None:
        cdata = anilist_query(ANIME_CHAR_MEDIA_QUERY, {"characterId": int(character_id)})
        ids = []
        if cdata and cdata.get("Character"):
            ids = [n.get("id") for n in (cdata["Character"].get("media") or {}).get("nodes") or [] if n.get("id")]
        if not ids:
            return []
        variables["idIn"] = ids
    data = anilist_query(ANIME_ADV_SEARCH_QUERY, variables)
    if not data or not data.get("Page"):
        return []
    results = []
    for m in data["Page"].get("media") or []:
        ep, air_at = _anime_next_ep(m)
        results.append(
            {
                "anilist_id": m.get("id"),
                "title": _anime_title(m),
                "cover_url": _anime_cover(m),
                "format": m.get("format"),
                "status": m.get("status"),
                "episodes": m.get("episodes"),
                "next_episode": ep,
                "airing_at": air_at,
                "score": m.get("averageScore"),
                "start_date": (
                    (m.get("startDate") or {}).get("year")
                    if (m.get("startDate") or {}).get("year")
                    else None
                ),
                "genres": m.get("genres") or [],
            }
        )
    return results


ANIME_DETAIL_QUERY = """
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    title { romaji english native }
    coverImage { large }
    bannerImage
    description
    format
    status
    episodes
    duration
    genres
    averageScore
    nextAiringEpisode { episode airingAt }
    startDate { year month day }
    endDate { year month day }
    studios(isMain: true) {
      nodes { name }
    }
    characters(sort: ROLE, perPage: 12) {
      nodes {
        id
        name { full }
        image { large }
      }
    }
  }
}
"""


def anilist_detail(anime_id):
    data = anilist_query(ANIME_DETAIL_QUERY, {"id": anime_id})
    if not data:
        return None
    return data.get("Media")


ANIME_SCHEDULE_QUERY = """
query ($id: Int, $now: Int) {
  Media(id: $id, type: ANIME) {
    id
    episodes
    status
    nextAiringEpisode {
      episode airingAt
    }
  }
  future: Page(perPage: 50) {
    airingSchedules(mediaId: $id, airingAt_greater: $now, sort: TIME) {
      episode airingAt
    }
  }
  past: Page(perPage: 50) {
    airingSchedules(mediaId: $id, airingAt_lesser: $now, sort: TIME_DESC) {
      episode airingAt
    }
  }
}
"""


def anilist_schedule(anime_id):
    now = int(datetime.datetime.now().timestamp())
    data = anilist_query(ANIME_SCHEDULE_QUERY, {"id": anime_id, "now": now})
    if not data or not data.get("Media"):
        return None
    media = data["Media"]
    nodes = []
    seen = set()

    nxt = media.get("nextAiringEpisode")
    if nxt and nxt.get("episode") is not None:
        key = (nxt.get("episode"), nxt.get("airingAt"))
        seen.add(key)
        nodes.append(nxt)

    for group_key in ("future", "past"):
        group = (data.get(group_key) or {}).get("airingSchedules") or []
        for node in group:
            key = (node.get("episode"), node.get("airingAt"))
            if key not in seen:
                seen.add(key)
                nodes.append(node)
    media["airingSchedule"] = {"nodes": sorted(nodes, key=lambda n: n.get("episode") or 0)}
    return media


def _anime_title(m):
    if not m:
        return ""
    t = m.get("title") or {}
    return t.get("romaji") or t.get("english") or t.get("native") or ""


def _anime_cover(m):
    c = (m.get("coverImage") or {}).get("large")
    return c or ""


def _anime_next_ep(m):
    nea = m.get("nextAiringEpisode") or {}
    return nea.get("episode"), nea.get("airingAt")


def _has_content(data):
    """TMDB yanıtında kullanılabilir içerik olup olmadığını kontrol eder."""
    if not data:
        return False
    if isinstance(data, list):
        return bool(data)
    if "results" in data:
        return bool(data.get("results"))
    if data.get("title") or data.get("name") or data.get("overview"):
        return True
    if data.get("cast") or data.get("crew") or data.get("episodes"):
        return True
    if data.get("genres"):
        return True
    return False


@app.route("/")
def index():
    resp = send_from_directory(STATIC_DIR, "index.html")
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    return resp


@app.route("/api/search")
def search():
    q = request.args.get("q", "")
    if not q:
        return jsonify([])
    data = tmdb_request("/search/multi", {"query": q, "include_adult": "false"})
    if not data:
        return jsonify({"error": "TMDB API anahtarı geçersiz veya ayarlanmamış"}), 400
    results = []
    for item in data.get("results", []):
        if item.get("media_type") not in ("movie", "tv"):
            continue
        num_seasons = None
        if item.get("media_type") == "tv":
            detail = tmdb_request(f"/tv/{item.get('id')}")
            if detail:
                num_seasons = detail.get("number_of_seasons")
                num_episodes = detail.get("number_of_episodes")
        else:
            num_episodes = None
        results.append(
            {
                "tmdb_id": item.get("id"),
                "media_type": item.get("media_type"),
                "title": item.get("title") or item.get("name"),
                "poster_path": item.get("poster_path"),
                "release_date": item.get("release_date") or item.get("first_air_date"),
                "vote_average": item.get("vote_average") or 0,
                "overview": item.get("overview"),
                "number_of_seasons": num_seasons,
                "number_of_episodes": num_episodes,
            }
        )
    return jsonify(results)


def _tmdb_tv_by_people(params, genre_filter=None):
    """TV'de with_people discover güvenilmez (filtreyi yok sayıyor); bunun yerine
    her oyuncunun tv_credits'inden şovları toplayıp tür/yıl/puan/başlık filtrelerini
    kendi tarafımızda uygular."""
    person_ids = [p for p in (params.get("with_people") or "").split(",") if p]
    year = params.get("first_air_date_year")
    score = params.get("vote_average.gte")
    query = params.get("query")
    show_ids = []
    for pid in person_ids:
        data = tmdb_request(f"/person/{pid}/tv_credits")
        if data:
            for item in (data.get("cast") or []):
                sid = item.get("id")
                if sid and sid not in show_ids:
                    show_ids.append(sid)
    out = []
    for sid in show_ids:
        det = tmdb_request(f"/tv/{sid}")
        if not det:
            continue
        genres = set((g or {}).get("id") for g in (det.get("genres") or []))
        if genre_filter and not (genres & genre_filter):
            continue
        first_air = det.get("first_air_date") or ""
        if year and not first_air.startswith(str(year)):
            continue
        va = det.get("vote_average") or 0
        if score is not None and va < score:
            continue
        if query and query.lower() not in (det.get("name") or "").lower():
            continue
        out.append(
            {
                "tmdb_id": det.get("id"),
                "media_type": "tv",
                "title": det.get("name"),
                "poster_path": det.get("poster_path"),
                "release_date": det.get("first_air_date"),
                "vote_average": va,
                "overview": det.get("overview"),
                "number_of_seasons": det.get("number_of_seasons"),
                "number_of_episodes": det.get("number_of_episodes"),
            }
        )
    out.sort(key=lambda x: x["vote_average"], reverse=True)
    return out[:20]


def _tmdb_movie_by_people(params, genre_filter=None):
    """Movie'de with_people discover limitli (20) ve eksik; aktörün movie_credits
    uç noktasından tüm filmleri toplayıp tür/yıl/puan/başlık filtrelerini kendi
    tarafımızda uygular."""
    person_ids = [p for p in (params.get("with_people") or "").split(",") if p]
    year = params.get("primary_release_year")
    score = params.get("vote_average.gte")
    query = params.get("query")
    out = []
    seen = set()
    for pid in person_ids:
        data = tmdb_request(f"/person/{pid}/movie_credits")
        if not data:
            continue
        for item in (data.get("cast") or []):
            mid = item.get("id")
            if not mid or mid in seen:
                continue
            seen.add(mid)
            if genre_filter:
                item_genres = set(item.get("genre_ids") or [])
                if not (item_genres & genre_filter):
                    continue
            release = item.get("release_date") or ""
            if year and not release.startswith(str(year)):
                continue
            va = item.get("vote_average") or 0
            if score is not None and va < score:
                continue
            if query and query.lower() not in (item.get("title") or "").lower():
                continue
            out.append(
                {
                    "tmdb_id": mid,
                    "media_type": "movie",
                    "title": item.get("title"),
                    "poster_path": item.get("poster_path"),
                    "release_date": release,
                    "vote_average": va,
                    "overview": item.get("overview"),
                    "number_of_seasons": None,
                    "number_of_episodes": None,
                }
            )
    out.sort(key=lambda x: x["vote_average"], reverse=True)
    return out


def _tmdb_adv_results(params_movie, params_tv, genre_filter=None):
    """Yıl/puan/oyuncu/tür filtreleriyle TMDB discover araması yapar (movie + tv).

    genre_filter: TMDB genre ID kümesi verilirse sonuçlar bu türlerden en az birini
    içermesi koşuluyla istemci tarafında filtrelenir (with_people + with_genres
    birlikte TMDB'de OR döndürdüğü için).
    """
    out = []
    for media_type, base_path, date_key in (
        ("movie", "/discover/movie", "release_date"),
        ("tv", "/discover/tv", "first_air_date"),
    ):
        params = dict(params_movie if media_type == "movie" else params_tv)
        params["include_adult"] = "false"
        if media_type == "movie" and params.get("with_people"):
            out.extend(_tmdb_movie_by_people(params, genre_filter))
            continue
        if media_type == "tv" and params.get("with_people"):
            out.extend(_tmdb_tv_by_people(params, genre_filter))
            continue
        data = tmdb_request(base_path, params)
        if not data:
            continue
        for item in (data.get("results") or [])[:20]:
            if genre_filter:
                item_genres = set(item.get("genre_ids") or [])
                if not (item_genres & genre_filter):
                    continue
            num_seasons = None
            num_episodes = None
            if media_type == "tv":
                detail = tmdb_request(f"/tv/{item.get('id')}")
                if detail:
                    num_seasons = detail.get("number_of_seasons")
                    num_episodes = detail.get("number_of_episodes")
            out.append(
                {
                    "tmdb_id": item.get("id"),
                    "media_type": media_type,
                    "title": item.get("title") or item.get("name"),
                    "poster_path": item.get("poster_path"),
                    "release_date": item.get(date_key),
                    "vote_average": item.get("vote_average") or 0,
                    "overview": item.get("overview"),
                    "number_of_seasons": num_seasons,
                    "number_of_episodes": num_episodes,
                }
            )
    return out


@app.route("/api/adv-search")
def adv_search():
    mode = request.args.get("mode", "")  # actor | genre | year | score
    media = request.args.get("media", "show")  # show | anime
    value = request.args.get("value", "").strip()

    if mode == "year":
        if not (value.isdigit() and len(value) == 4):
            return jsonify({"error": "Yıl 4 haneli olmalı"}), 400
        y = int(value)
        if not (1900 <= y <= 2100):
            return jsonify({"error": "Yıl 1900-2100 arasında olmalı"}), 400
        if media == "anime":
            return jsonify(_anime_adv_results(year=y))
        return jsonify(_tmdb_adv_results(
            {"primary_release_year": y},
            {"first_air_date_year": y},
        ))

    if mode == "score":
        norm = value.replace(",", ".")
        try:
            s = float(norm)
        except ValueError:
            return jsonify({"error": "Puan formatı geçersiz"}), 400
        if not (0 <= s <= 10):
            return jsonify({"error": "Puan 0-10 arasında olmalı"}), 400
        if media == "anime":
            return jsonify(_anime_adv_results(score=s))
        return jsonify(_tmdb_adv_results(
            {"vote_average.gte": s},
            {"vote_average.gte": s},
        ))

    if mode == "actor":
        parts = [x.strip() for x in value.split(",") if x.strip()]
        if not parts:
            return jsonify({"error": "Oyuncu girilmedi"}), 400
        ids = []
        for p in parts:
            if p.isdigit():
                ids.append(p)
            else:
                data = tmdb_request("/search/person", {"query": p})
                if data and (data.get("results") or []):
                    first = data["results"][0]
                    if first.get("id"):
                        ids.append(str(first["id"]))
        if not ids:
            return jsonify({"error": "Oyuncu bulunamadı"}), 400
        people = ",".join(ids)
        return jsonify(_tmdb_adv_results(
            {"with_people": people},
            {"with_people": people},
        ))

    if mode == "genre":
        names = [x.strip() for x in value.split(",") if x.strip()]
        if not names:
            return jsonify({"error": "Tür seçilmedi"}), 400
        genres = []
        for gid in _genre_names_to_ids(names):
            if gid not in genres:
                genres.append(gid)
        if not genres:
            return jsonify({"error": "Türler TMDB'de bulunamadı"}), 400
        joined = ",".join(str(g) for g in genres)
        return jsonify(_tmdb_adv_results(
            {"with_genres": joined},
            {"with_genres": joined},
        ))

    return jsonify({"error": "Geçersiz arama modu"}), 400


def _resolve_actor_ids(parts):
    ids = []
    for p in parts:
        if p.isdigit():
            ids.append(p)
        else:
            data = tmdb_request("/search/person", {"query": p})
            if data and (data.get("results") or []):
                first = data["results"][0]
                if first.get("id"):
                    ids.append(str(first["id"]))
    return ids


@app.route("/api/combo-search")
def combo_search():
    """Çoklu kriter araması: actors+genres+year+score+q (hepsi AND)."""
    media = request.args.get("media", "show")  # show | anime
    actors = request.args.get("actors", "").strip()
    genres = request.args.get("genres", "").strip()
    year = request.args.get("year", "").strip()
    score = request.args.get("score", "").strip()
    q = request.args.get("q", "").strip()

    if not (actors or genres or year or score or q):
        return jsonify({"error": "En az bir kriter gerekli"}), 400

    year_i = None
    if year:
        if not (year.isdigit() and len(year) == 4):
            return jsonify({"error": "Yıl 4 haneli olmalı"}), 400
        year_i = int(year)
        if not (1900 <= year_i <= 2100):
            return jsonify({"error": "Yıl 1900-2100 arasında olmalı"}), 400

    score_f = None
    if score:
        norm = score.replace(",", ".")
        try:
            score_f = float(norm)
        except ValueError:
            return jsonify({"error": "Puan formatı geçersiz"}), 400
        if not (0 <= score_f <= 10):
            return jsonify({"error": "Puan 0-10 arasında olmalı"}), 400

    if media == "anime":
        character_id = None
        if actors:
            cids = [x.strip() for x in actors.split(",") if x.strip().isdigit()]
            if not cids:
                return jsonify({"error": "Karakter bulunamadı"}), 400
            character_id = int(cids[0])
        return jsonify(_anime_adv_results(year=year_i, score=score_f, genres=genres or None, q=q or None, character_id=character_id))

    params_movie = {}
    params_tv = {}
    genre_filter = None
    if actors:
        ids = _resolve_actor_ids([x.strip() for x in actors.split(",") if x.strip()])
        if not ids:
            return jsonify({"error": "Oyuncu bulunamadı"}), 400
        people = ",".join(ids)
        params_movie["with_people"] = people
        params_tv["with_people"] = people
    if genres:
        gnames = [x.strip() for x in genres.split(",") if x.strip()]
        gids = []
        for gid in _genre_names_to_ids(gnames):
            if gid not in gids:
                gids.append(gid)
        if not gids:
            return jsonify({"error": "Türler TMDB'de bulunamadı"}), 400
        if actors:
            # TMDB with_people + with_genres birlikte OR döndürür; AND için
            # oyuncu sonuçlarını tür ID'leriyle kendi tarafımızda filtrele.
            genre_filter = set(gids)
        else:
            joined = ",".join(str(g) for g in gids)
            params_movie["with_genres"] = joined
            params_tv["with_genres"] = joined
    if year_i:
        params_movie["primary_release_year"] = year_i
        params_tv["first_air_date_year"] = year_i
    if score_f:
        params_movie["vote_average.gte"] = score_f
        params_tv["vote_average.gte"] = score_f
    if q:
        params_movie["query"] = q
        params_tv["query"] = q
    return jsonify(_tmdb_adv_results(params_movie, params_tv, genre_filter))


_genre_cache = None


def _genre_names_to_ids(names):
    """Favori tür isimlerini TMDB genre ID'lerine çevirir (dil duyarlı)."""
    global _genre_cache
    if _genre_cache is None:
        _genre_cache = {}
        selected = get_setting("language") or "tr-TR"
        for lang in ({selected, "en-US"} if selected != "en-US" else {"en-US"}):
            for gpath in ("genre/movie/list", "genre/tv/list"):
                data = tmdb_request(gpath, {"language": lang})
                if data:
                    for g in (data.get("genres") or []):
                        gid = g.get("id")
                        gname = (g.get("name") or "").strip().lower()
                        if gid and gname:
                            _genre_cache.setdefault(gname, gid)
    wanted = {n.lower() for n in names}
    return [_genre_cache[n] for n in wanted if n in _genre_cache]


@app.route("/api/anime/search")
def anime_search():
    q = request.args.get("q", "")
    if not q:
        return jsonify([])
    items = anilist_search(q)
    results = []
    for m in items:
        ep, air_at = _anime_next_ep(m)
        results.append(
            {
                "anilist_id": m.get("id"),
                "title": _anime_title(m),
                "cover_url": _anime_cover(m),
                "format": m.get("format"),
                "status": m.get("status"),
                "episodes": m.get("episodes"),
                "next_episode": ep,
                "airing_at": air_at,
                "score": m.get("averageScore"),
                "start_date": (
                    (m.get("startDate") or {}).get("year")
                    if (m.get("startDate") or {}).get("year")
                    else None
                ),
                "genres": m.get("genres") or [],
            }
        )
    return jsonify(results)


def _anime_start_year(d):
    return (d.get("startDate") or {}).get("year") if (d.get("startDate") or {}).get("year") else None


def save_anime_details(conn, anime_id, detail):
    """AniList detayından statik verileri ve karakterleri DB'ye yazar."""
    if not detail:
        return
    conn.execute(
        "UPDATE anime SET banner=?, description=?, format=?, duration=?, genres=?, start_date=? WHERE id=?",
        (
            detail.get("bannerImage"),
            detail.get("description"),
            detail.get("format"),
            detail.get("duration"),
            json.dumps(detail.get("genres") or []),
            _anime_start_year(detail),
            anime_id,
        ),
    )
    conn.execute("DELETE FROM anime_cast WHERE anime_id=?", (anime_id,))
    chars = (detail.get("characters") or {}).get("nodes") or []
    for i, c in enumerate(chars):
        name = c.get("name", {}).get("full") if c.get("name") else ""
        if not name:
            continue
        conn.execute(
            "INSERT INTO anime_cast (anime_id, person_id, name, image, sort_order) VALUES (?, ?, ?, ?, ?)",
            (anime_id, c.get("id"), name, (c.get("image") or {}).get("large") if c.get("image") else None, i),
        )


def load_anime_details(conn, anime_id):
    """anime_id için DB'de saklı anime detay verilerini ve karakterleri döndürür (None = yok)."""
    row = conn.execute(
        "SELECT banner, description, format, duration, genres, start_date, title, cover_url, "
        "episodes, status, score, studios, anilist_id FROM anime WHERE id=?",
        (anime_id,),
    ).fetchone()
    if not row:
        return None
    chars = conn.execute(
        "SELECT person_id, name, image FROM anime_cast WHERE anime_id=? ORDER BY sort_order",
        (anime_id,),
    ).fetchall()
    return {
        "anilist_id": row["anilist_id"],
        "title": row["title"],
        "cover_url": row["cover_url"],
        "banner_url": row["banner"],
        "description": row["description"],
        "format": row["format"],
        "status": row["status"],
        "episodes": row["episodes"],
        "duration": row["duration"],
        "genres": _safe_json_list(row["genres"]),
        "score": row["score"],
        "start_date": row["start_date"],
        "studios": [s for s in (row["studios"] or "").split(",") if s] if row["studios"] else [],
        "characters": [
            {"id": c["person_id"], "name": c["name"], "image": c["image"]}
            for c in chars
        ],
    }


def _safe_json_list(value):
    if not value:
        return []
    try:
        v = json.loads(value)
        return v if isinstance(v, list) else []
    except (ValueError, TypeError):
        return []


@app.route("/api/anime/details")
def anime_details():
    anilist_id = request.args.get("anilist_id")
    if not anilist_id:
        return jsonify({"error": "anilist_id gereklidir"}), 400
    conn = get_db()
    arow = conn.execute("SELECT id FROM anime WHERE anilist_id=?", (anilist_id,)).fetchone()
    if arow:
        d = load_anime_details(conn, arow["id"])
        if d and d.get("description"):
            conn.close()
            return jsonify(d)
    detail = anilist_detail(anilist_id)
    if not detail:
        conn.close()
        return jsonify({"error": "AniList'ten veri alınamadı"}), 404
    if arow:
        save_anime_details(conn, arow["id"], detail)
        conn.commit()
        d = load_anime_details(conn, arow["id"])
        conn.close()
        return jsonify(d)
    conn.close()
    return jsonify(
        {
            "anilist_id": detail.get("id"),
            "title": _anime_title(detail),
            "cover_url": _anime_cover(detail),
            "banner_url": detail.get("bannerImage"),
            "description": detail.get("description"),
            "format": detail.get("format"),
            "status": detail.get("status"),
            "episodes": detail.get("episodes"),
            "duration": detail.get("duration"),
            "genres": detail.get("genres") or [],
            "score": detail.get("averageScore"),
            "start_date": _anime_start_year(detail),
            "studios": [s.get("name") for s in (detail.get("studios") or {}).get("nodes") or [] if s.get("name")],
            "characters": [
                {
                    "id": c.get("id"),
                    "name": c.get("name", {}).get("full") if c.get("name") else "",
                    "image": (c.get("image") or {}).get("large") if c.get("image") else None,
                }
                for c in (detail.get("characters") or {}).get("nodes") or []
            ],
        }
    )


@app.route("/api/anime/followed")
def anime_followed():
    conn = get_db()
    rows = conn.execute("SELECT * FROM anime ORDER BY id DESC").fetchall()
    result = []
    for r in rows:
        score = r["score"]
        if score is None:
            detail = anilist_detail(r["anilist_id"])
            if detail and detail.get("averageScore") is not None:
                score = detail.get("averageScore")
                conn.execute(
                    "UPDATE anime SET score=? WHERE id=?",
                    (score, r["id"]),
                )
                conn.commit()
        result.append(
            {
                "id": r["id"],
                "anilist_id": r["anilist_id"],
                "title": r["title"],
                "cover_url": r["cover_url"],
                "episodes": r["episodes"],
                "status": r["status"],
                "score": score,
                "studios": r["studios"],
                "next_episode": _anime_followed_next(conn, r["id"]),
            }
        )
    conn.close()
    return jsonify(result)


def _anime_followed_next(conn, anime_id):
    now = int(datetime.datetime.now().timestamp())
    row = conn.execute(
        "SELECT episode, air_at FROM anime_episodes "
        "WHERE anime_id=? AND watched=0 AND air_at IS NOT NULL AND air_at > ? "
        "ORDER BY episode LIMIT 1",
        (anime_id, now),
    ).fetchone()
    if row:
        return {"episode": row["episode"], "airing_at": row["air_at"]}
    return None


@app.route("/api/anime/follow", methods=["POST"])
def anime_follow():
    body = request.get_json()
    anilist_id = body.get("anilist_id")
    if not anilist_id:
        return jsonify({"error": "anilist_id gereklidir"}), 400
    detail = anilist_detail(anilist_id)
    if not detail:
        return jsonify({"error": "AniList'ten veri alınamadı"}), 400
    title = _anime_title(detail)
    cover = _anime_cover(detail)
    episodes = detail.get("episodes") or 0
    status = detail.get("status")
    score = detail.get("averageScore")
    studios = [s.get("name") for s in (detail.get("studios") or {}).get("nodes") or [] if s.get("name")]
    studio = studios[0] if studios else None
    conn = get_db()
    conn.execute(
        "INSERT INTO anime (anilist_id, title, cover_url, episodes, status, score, studios) "
        "VALUES (?, ?, ?, ?, ?, ?, ?) "
        "ON CONFLICT(anilist_id) DO UPDATE SET "
        "title=excluded.title, cover_url=excluded.cover_url, "
        "episodes=excluded.episodes, status=excluded.status, score=excluded.score, studios=excluded.studios",
        (anilist_id, title, cover, episodes, status, score, studio),
    )
    conn.commit()
    row = conn.execute("SELECT id FROM anime WHERE anilist_id=?", (anilist_id,)).fetchone()
    anime_db_id = row["id"]

    save_anime_details(conn, anime_db_id, detail)
    conn.commit()

    schedule = anilist_schedule(anilist_id)
    if schedule and schedule.get("airingSchedule"):
        for node in schedule["airingSchedule"].get("nodes") or []:
            conn.execute(
                "INSERT INTO anime_episodes (anime_id, episode, air_at) "
                "VALUES (?, ?, ?) "
                "ON CONFLICT(anime_id, episode) DO UPDATE SET air_at=excluded.air_at",
                (anime_db_id, node.get("episode"), node.get("airingAt")),
            )
        conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/anime/unfollow/<int:anime_id>", methods=["DELETE"])
def anime_unfollow(anime_id):
    conn = get_db()
    conn.execute("DELETE FROM anime_cast WHERE anime_id=?", (anime_id,))
    conn.execute("DELETE FROM anime_episodes WHERE anime_id=?", (anime_id,))
    conn.execute("DELETE FROM anime WHERE id=?", (anime_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/anime/schedule")
def anime_schedule():
    anime_id = request.args.get("anime_id")
    if not anime_id:
        return jsonify({"error": "anime_id gereklidir"}), 400
    conn = get_db()
    arow = conn.execute("SELECT * FROM anime WHERE id=?", (anime_id,)).fetchone()
    if not arow:
        return jsonify({"error": "Anime bulunamadı"}), 404
    rows = conn.execute(
        "SELECT episode, air_at, watched, notified FROM anime_episodes "
        "WHERE anime_id=? ORDER BY episode",
        (anime_id,),
    ).fetchall()
    conn.close()
    return jsonify(
        {
            "title": arow["title"],
            "anilist_id": arow["anilist_id"],
            "items": [
                {
                    "episode": r["episode"],
                    "airing_at": r["air_at"],
                    "watched": r["watched"],
                    "notified": r["notified"],
                }
                for r in rows
            ],
        }
    )


def get_tmdb_info(media_type, tmdb_id):
    """TMDB'den temel bilgileri çeker: release_date, vote_average, yayın platformları ve detay alanları."""
    if media_type not in ("movie", "tv"):
        return None
    data = tmdb_request(f"/{media_type}/{tmdb_id}")
    if not data:
        return None
    networks = [n.get("name") for n in (data.get("networks") or []) if n.get("name")]
    genres = [g.get("name") for g in data.get("genres", []) if g.get("name")]
    if media_type == "movie":
        networks = [c.get("name") for c in (data.get("production_companies") or []) if c.get("name")]
        return {
            "release_date": data.get("release_date"),
            "vote_average": data.get("vote_average") or 0,
            "vote_count": data.get("vote_count"),
            "networks": networks,
            "overview": data.get("overview") or "",
            "genres": genres,
            "tagline": data.get("tagline") or "",
            "runtime": data.get("runtime"),
            "number_of_seasons": None,
            "number_of_episodes": None,
            "status": data.get("status") or "",
            "season_list": [],
        }
    season_list = [
        {
            "season_number": s.get("season_number"),
            "name": s.get("name") or "",
            "air_date": s.get("air_date"),
            "episode_count": s.get("episode_count"),
        }
        for s in (data.get("seasons") or [])
        if s.get("season_number") and s.get("season_number") != 0
    ]
    return {
        "release_date": data.get("first_air_date"),
        "vote_average": data.get("vote_average") or 0,
        "vote_count": data.get("vote_count"),
        "networks": networks,
        "overview": data.get("overview") or "",
        "genres": genres,
        "tagline": data.get("tagline") or "",
        "runtime": (data.get("episode_run_time") or [None])[0],
        "number_of_seasons": data.get("number_of_seasons"),
        "number_of_episodes": data.get("number_of_episodes"),
        "status": data.get("status") or "",
        "season_list": season_list,
    }


def get_tmdb_cast(media_type, tmdb_id):
    """TMDB'den oyuncu kadrosunu çeker (ilk 8)."""
    if media_type not in ("movie", "tv"):
        return []
    credits = tmdb_request(f"/{media_type}/{tmdb_id}/credits")
    if not credits:
        return []
    out = []
    for c in (credits.get("cast") or [])[:8]:
        name = c.get("name") or c.get("original_name")
        if name:
            out.append(
                {
                    "person_id": c.get("id"),
                    "name": name,
                    "character": c.get("character") or "",
                    "profile_path": c.get("profile_path"),
                }
            )
    return out


def save_details(conn, follow_id, info, cast):
    """Detay verilerini ve oyuncu kadrosunu DB'ye yazar."""
    if not info:
        return
    conn.execute(
        "UPDATE followed SET overview=?, genres=?, tagline=?, runtime=?, "
        "number_of_seasons=?, number_of_episodes=?, status=?, season_list=?, "
        "vote_count=?, first_air_date=? WHERE id=?",
        (
            info.get("overview") or "",
            json.dumps(info.get("genres") or []),
            info.get("tagline") or "",
            info.get("runtime"),
            info.get("number_of_seasons"),
            info.get("number_of_episodes"),
            info.get("status") or "",
            json.dumps(info.get("season_list") or []),
            info.get("vote_count"),
            info.get("release_date"),
            follow_id,
        ),
    )
    conn.execute("DELETE FROM cast WHERE follow_id=?", (follow_id,))
    for i, c in enumerate(cast):
        conn.execute(
            "INSERT INTO cast (follow_id, person_id, name, character, profile_path, sort_order) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (follow_id, c.get("person_id"), c.get("name"), c.get("character") or "", c.get("profile_path"), i),
        )


def load_details(conn, follow_id):
    """follow_id için DB'de saklı detay verilerini ve oyuncu kadrosunu döndürür (None = yok)."""
    row = conn.execute(
        "SELECT overview, genres, tagline, runtime, number_of_seasons, number_of_episodes, "
        "status, season_list, vote_count, first_air_date, poster_path, vote_average, release_date, title "
        "FROM followed WHERE id=?",
        (follow_id,),
    ).fetchone()
    if not row:
        return None
    cast = conn.execute(
        "SELECT person_id, name, character, profile_path FROM cast WHERE follow_id=? ORDER BY sort_order",
        (follow_id,),
    ).fetchall()
    return {
        "overview": row["overview"] or "",
        "genres": _safe_json_list(row["genres"]),
        "tagline": row["tagline"] or "",
        "runtime": row["runtime"],
        "number_of_seasons": row["number_of_seasons"],
        "number_of_episodes": row["number_of_episodes"],
        "status": row["status"] or "",
        "season_list": _safe_json_list(row["season_list"]),
        "vote_count": row["vote_count"],
        "first_air_date": row["first_air_date"] or row["release_date"],
        "poster_path": row["poster_path"],
        "vote_average": row["vote_average"],
        "release_date": row["release_date"],
        "title": row["title"],
        "cast": [dict(c) for c in cast],
    }


def backfill_votes():
    """Takip edilen dizi/film ve anime verilerini TMDB/AniList'ten güncel çekip DB'yi yeniler."""
    conn = get_db()
    for row in conn.execute("SELECT * FROM followed").fetchall():
        info = get_tmdb_info(row["media_type"], row["tmdb_id"])
        if info:
            conn.execute(
                "UPDATE followed SET vote_average=?, networks=?, release_date=? WHERE id=?",
                (
                    info.get("vote_average") or 0,
                    json.dumps(info.get("networks") or []),
                    info.get("release_date") or row["release_date"],
                    row["id"],
                ),
            )
            save_details(conn, row["id"], info, get_tmdb_cast(row["media_type"], row["tmdb_id"]))
        if row["media_type"] == "tv":
            sync_episodes(conn, row)
    for row in conn.execute("SELECT * FROM anime").fetchall():
        detail = anilist_detail(row["anilist_id"])
        if detail:
            studios = [s.get("name") for s in (detail.get("studios") or {}).get("nodes") or [] if s.get("name")]
            conn.execute(
                "UPDATE anime SET score=?, studios=?, episodes=? WHERE id=?",
                (
                    detail.get("averageScore"),
                    studios[0] if studios else None,
                    detail.get("episodes") or row["episodes"],
                    row["id"],
                ),
            )
            save_anime_details(conn, row["id"], detail)
            schedule = anilist_schedule(row["anilist_id"])
            if schedule and schedule.get("airingSchedule"):
                for node in schedule["airingSchedule"].get("nodes") or []:
                    conn.execute(
                        "INSERT INTO anime_episodes (anime_id, episode, air_at) "
                        "VALUES (?, ?, ?) "
                        "ON CONFLICT(anime_id, episode) DO UPDATE SET air_at=excluded.air_at",
                        (row["id"], node.get("episode"), node.get("airingAt")),
                    )
    conn.commit()
    conn.close()


@app.route("/api/follow", methods=["POST"])
def follow():
    body = request.get_json()
    tmdb_id = body.get("tmdb_id")
    media_type = body.get("media_type")
    title = body.get("title")
    poster_path = body.get("poster_path")
    vote_average = body.get("vote_average")

    if not all([tmdb_id, media_type, title]):
        return jsonify({"error": "Eksik bilgi"}), 400

    info = get_tmdb_info(media_type, tmdb_id)
    release_date = body.get("release_date") or (info or {}).get("release_date")
    if vote_average is None:
        vote_average = (info or {}).get("vote_average") or 0
    networks = (info or {}).get("networks") or []

    conn = get_db()
    existing = conn.execute(
        "SELECT id FROM followed WHERE tmdb_id=? AND media_type=?",
        (tmdb_id, media_type),
    ).fetchone()
    if existing:
        conn.close()
        return jsonify({"error": "Zaten takipte"}), 400

    conn.execute(
        "INSERT INTO followed (tmdb_id, media_type, title, poster_path, release_date, vote_average, networks) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (tmdb_id, media_type, title, poster_path, release_date, vote_average, json.dumps(networks)),
    )
    new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.commit()

    if info:
        save_details(conn, new_id, info, get_tmdb_cast(media_type, tmdb_id))
        conn.commit()

    if media_type == "tv":
        new_follow = conn.execute(
            "SELECT * FROM followed WHERE id=?", (new_id,)
        ).fetchone()
        sync_episodes(conn, new_follow)

    conn.close()
    return jsonify({"ok": True})


@app.route("/api/followed")
def followed():
    conn = get_db()
    rows = conn.execute("SELECT * FROM followed ORDER BY id DESC").fetchall()
    today = today_str()
    items = []
    for r in rows:
        item = dict(r)
        try:
            item["networks"] = json.loads(item.get("networks")) if item.get("networks") else []
        except (ValueError, TypeError):
            item["networks"] = []
        # film için watched, dizi için completed
        item["watched"] = int(item.get("watched") or 0)
        if item["media_type"] == "tv":
            nxt = conn.execute(
                "SELECT season, episode, air_date FROM episodes "
                "WHERE follow_id=? AND air_date IS NOT NULL AND air_date>=? "
                "ORDER BY air_date ASC, episode ASC LIMIT 1",
                (item["id"], today),
            ).fetchone()
            if nxt:
                item["next_episode"] = {
                    "season": nxt["season"],
                    "episode": nxt["episode"],
                    "air_date": nxt["air_date"],
                }
            # tüm bölümler izlendi mi?
            try:
                total = conn.execute("SELECT COUNT(*) c FROM episodes WHERE follow_id=?", (item["id"],)).fetchone()["c"]
                watched_cnt = conn.execute("SELECT COUNT(*) c FROM episodes WHERE follow_id=? AND watched=1", (item["id"],)).fetchone()["c"]
                item["completed"] = bool(total > 0 and total == watched_cnt)
            except Exception:
                item["completed"] = False
        items.append(item)
    conn.close()
    return jsonify(items)


@app.route("/api/unwatched")
def unwatched():
    """Yayına girmiş ve izlenmemiş bölümleri olan dizi ve animeleri döndürür."""
    conn = get_db()
    today = today_str()
    now = int(datetime.datetime.now().timestamp())

    shows = []
    for r in conn.execute("SELECT * FROM followed WHERE media_type='tv'").fetchall():
        rows = conn.execute(
            "SELECT season, episode, air_date, name FROM episodes "
            "WHERE follow_id=? AND air_date IS NOT NULL AND air_date<=? AND watched=0 "
            "ORDER BY air_date ASC, episode ASC",
            (r["id"], today),
        ).fetchall()
        if not rows:
            continue
        items = [
            {
                "season": x["season"],
                "episode": x["episode"],
                "episode_name": x["name"] or "",
                "air_date": x["air_date"],
            }
            for x in rows
        ]
        shows.append(
            {
                "id": r["id"],
                "tmdb_id": r["tmdb_id"],
                "title": r["title"],
                "poster_path": r["poster_path"],
                "vote_average": r["vote_average"] or 0,
                "networks": json.loads(r["networks"]) if r["networks"] else [],
                "unwatched": len(items),
                "items": items,
            }
        )

    anime_list = []
    for r in conn.execute("SELECT * FROM anime").fetchall():
        rows = conn.execute(
            "SELECT episode, air_at FROM anime_episodes "
            "WHERE anime_id=? AND air_at IS NOT NULL AND air_at<=? AND watched=0 "
            "ORDER BY air_at ASC, episode ASC",
            (r["id"], now),
        ).fetchall()
        if not rows:
            continue
        anime_list.append(
            {
                "id": r["id"],
                "anilist_id": r["anilist_id"],
                "title": r["title"],
                "cover_url": r["cover_url"],
                "score": r["score"],
                "studios": r["studios"],
                "unwatched": len(rows),
                "items": [{"episode": x["episode"], "air_at": x["air_at"]} for x in rows],
            }
        )

    conn.close()
    return jsonify({"shows": shows, "anime": anime_list})
def unfollow(item_id):
    conn = get_db()
    conn.execute("DELETE FROM cast WHERE follow_id=?", (item_id,))
    conn.execute("DELETE FROM episodes WHERE follow_id=?", (item_id,))
    conn.execute("DELETE FROM followed WHERE id=?", (item_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/releases")
def releases():
    media_type = request.args.get("media_type")
    tmdb_id = request.args.get("tmdb_id")
    title = request.args.get("title", "")
    if media_type not in ("movie", "tv") or not tmdb_id:
        return jsonify({"error": "Geçersiz istek"}), 400

    conn = get_db()
    follow = conn.execute(
        "SELECT * FROM followed WHERE tmdb_id=? AND media_type=?",
        (tmdb_id, media_type),
    ).fetchone()

    if media_type == "movie":
        rel = (follow["release_date"] if follow else None) or (get_tmdb_info("movie", tmdb_id) or {}).get("release_date")
        watched = int((follow["watched"] if follow and follow["watched"] is not None else 0))
        conn.close()
        return jsonify(
            {
                "title": title or (follow["title"] if follow else ""),
                "media_type": "movie",
                "items": [
                    {
                        "label": "Yayın Tarihi",
                        "date": rel,
                        "watched": watched,
                    }
                ],
            }
        )

    if follow is None:
        conn.close()
        return jsonify({"error": "Takip edilen dizi bulunamadı"}), 404

    rows = conn.execute(
        "SELECT season, episode, air_date, air_time, name, watched FROM episodes "
        "WHERE follow_id=? ORDER BY season ASC, episode ASC",
        (follow["id"],),
    ).fetchall()
    if not rows:
        sync_episodes(conn, follow)
        rows = conn.execute(
            "SELECT season, episode, air_date, air_time, name, watched FROM episodes "
            "WHERE follow_id=? ORDER BY season ASC, episode ASC",
            (follow["id"],),
        ).fetchall()
    conn.close()

    items = [
        {
            "label": f"Sezon {x['season']} · Bölüm {x['episode']}",
            "episode_name": x["name"] or "",
            "season": x["season"],
            "episode": x["episode"],
            "date": x["air_date"],
            "watched": x["watched"],
            "air_time": x["air_time"],
        }
        for x in rows
    ]
    return jsonify(
        {
            "title": title or follow["title"],
            "media_type": "tv",
            "items": items,
        }
    )


@app.route("/api/episode/watch", methods=["POST"])
def episode_watch():
    body = request.get_json()
    tmdb_id = body.get("tmdb_id")
    season = body.get("season")
    episode = body.get("episode")
    watched = 1 if body.get("watched") else 0
    if not tmdb_id or season is None or episode is None:
        return jsonify({"error": "Eksik bilgi"}), 400

    conn = get_db()
    follow = conn.execute(
        "SELECT id FROM followed WHERE tmdb_id=? AND media_type='tv'",
        (tmdb_id,),
    ).fetchone()
    if not follow:
        conn.close()
        return jsonify({"error": "Takip bulunamadı"}), 400

    conn.execute(
        "INSERT INTO episodes (follow_id, season, episode, watched) "
        "VALUES (?, ?, ?, ?) "
        "ON CONFLICT(follow_id, season, episode) "
        "DO UPDATE SET watched=excluded.watched",
        (follow["id"], season, episode, watched),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "watched": watched})


@app.route("/api/anime/episode/watch", methods=["POST"])
def anime_episode_watch():
    body = request.get_json()
    anime_id = body.get("anime_id")
    episode = body.get("episode")
    watched = 1 if body.get("watched") else 0
    if not anime_id or episode is None:
        return jsonify({"error": "Eksik bilgi"}), 400

    conn = get_db()
    conn.execute(
        "INSERT INTO anime_episodes (anime_id, episode, watched) "
        "VALUES (?, ?, ?) "
        "ON CONFLICT(anime_id, episode) DO UPDATE SET watched=excluded.watched",
        (anime_id, episode, watched),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "watched": watched})


@app.route("/api/season/watch", methods=["POST"])
def season_watch():
    body = request.get_json()
    tmdb_id = body.get("tmdb_id")
    season = body.get("season")
    watched = 1 if body.get("watched") else 0
    if not tmdb_id or season is None:
        return jsonify({"error": "Eksik bilgi"}), 400

    conn = get_db()
    follow = conn.execute(
        "SELECT id FROM followed WHERE tmdb_id=? AND media_type='tv'",
        (tmdb_id,),
    ).fetchone()
    if not follow:
        conn.close()
        return jsonify({"error": "Takip bulunamadı"}), 400

    season_data = tmdb_request(f"/tv/{tmdb_id}/season/{season}")
    if not season_data:
        conn.close()
        return jsonify({"error": "Sezon bilgisi alınamadı"}), 400

    show_data = tmdb_request(f"/tv/{tmdb_id}")
    utc_today = datetime.datetime.now(datetime.timezone.utc).date()
    tvmaze_times = None
    if watched:
        for t in (
            (show_data or {}).get("original_name"),
            (show_data or {}).get("name"),
        ):
            if t:
                tvmaze_times = _tvmaze_episode_times(t)
                if tvmaze_times is not None:
                    break
    count = 0
    for ep in season_data.get("episodes", []):
        ep_num = ep.get("episode_number")
        if not ep_num:
            continue
        air_date = ep.get("air_date")
        if watched:
            air_time = None
            if tvmaze_times is not None:
                air_time = tvmaze_times.get((season, ep_num))
            if air_time:
                # yayın günü UTC bugünden küçükse (en az 1 gün önce) seçilebilir
                try:
                    air_day = datetime.datetime.fromtimestamp(
                        air_time, datetime.timezone.utc
                    ).date()
                except (ValueError, OSError, OverflowError):
                    air_day = None
                if air_day is None or air_day >= utc_today:
                    continue
            else:
                # air_time yok: UTC günü olarak en az bir gün önce yayınlanmış olmalı
                try:
                    air_day = datetime.date.fromisoformat(air_date) if air_date else None
                except ValueError:
                    air_day = None
                if air_day is None or air_day >= utc_today:
                    continue
            if air_time:
                try:
                    air_date = datetime.datetime.fromtimestamp(
                        air_time, datetime.timezone.utc
                    ).date().isoformat()
                except (ValueError, OSError, OverflowError):
                    pass
        conn.execute(
            "INSERT INTO episodes (follow_id, season, episode, air_date, watched) "
            "VALUES (?, ?, ?, ?, ?) "
            "ON CONFLICT(follow_id, season, episode) "
            "DO UPDATE SET watched=excluded.watched, air_date=excluded.air_date",
            (follow["id"], season, ep_num, air_date, watched),
        )
        count += 1
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "count": count})


@app.route("/api/movie/watch", methods=["POST"])
def movie_watch():
    body = request.get_json()
    tmdb_id = body.get("tmdb_id")
    watched = 1 if body.get("watched") else 0
    if not tmdb_id:
        return jsonify({"error": "Eksik bilgi"}), 400
    conn = get_db()
    follow = conn.execute(
        "SELECT id FROM followed WHERE tmdb_id=? AND media_type='movie'",
        (tmdb_id,),
    ).fetchone()
    if not follow:
        conn.close()
        return jsonify({"error": "Takip bulunamadı"}), 400
    conn.execute("UPDATE followed SET watched=? WHERE id=?", (watched, follow["id"]))
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "watched": watched})


@app.route("/api/details")
def details():
    media_type = request.args.get("media_type")
    tmdb_id = request.args.get("tmdb_id")
    if media_type not in ("movie", "tv") or not tmdb_id:
        return jsonify({"error": "Geçersiz istek"}), 400

    conn = get_db()
    follow = conn.execute(
        "SELECT id FROM followed WHERE tmdb_id=? AND media_type=?",
        (tmdb_id, media_type),
    ).fetchone()

    if follow:
        d = load_details(conn, follow["id"])
        if d and d.get("overview"):
            cast = d["cast"]
            highlight = (request.args.get("highlight_person") or "").strip().lower()
            hpid = (request.args.get("highlight_person_id") or "").strip()
            for i, c in enumerate(cast):
                nm = (c.get("name") or "").strip().lower()
                if (highlight and nm == highlight) or (hpid and str(c.get("person_id")) == hpid):
                    cast.insert(0, cast.pop(i))
                    break
            conn.close()
            if media_type == "movie":
                return jsonify(
                    {
                        "media_type": "movie",
                        "title": d.get("title") or "",
                        "poster_path": d.get("poster_path"),
                        "overview": d.get("overview"),
                        "tagline": d.get("tagline"),
                        "genres": d.get("genres"),
                        "vote_average": d.get("vote_average"),
                        "vote_count": d.get("vote_count"),
                        "runtime": d.get("runtime"),
                        "release_date": d.get("release_date"),
                        "cast": [
                            {"id": c.get("person_id"), "name": c.get("name"), "character": c.get("character"), "profile_path": c.get("profile_path")}
                            for c in cast
                        ],
                    }
                )
            return jsonify(
                {
                    "media_type": "tv",
                    "title": d.get("title") or "",
                    "poster_path": d.get("poster_path"),
                    "overview": d.get("overview"),
                    "genres": d.get("genres"),
                    "vote_average": d.get("vote_average"),
                    "vote_count": d.get("vote_count"),
                    "runtime": d.get("runtime"),
                    "first_air_date": d.get("first_air_date"),
                    "number_of_seasons": d.get("number_of_seasons"),
                    "number_of_episodes": d.get("number_of_episodes"),
                    "status": d.get("status"),
                    "cast": [
                        {"id": c.get("person_id"), "name": c.get("name"), "character": c.get("character"), "profile_path": c.get("profile_path")}
                        for c in cast
                    ],
                }
            )

    data = tmdb_request(f"/{media_type}/{tmdb_id}")
    if not data:
        conn.close()
        return jsonify({"error": "TMDB'den veri alınamadı"}), 400

    info = get_tmdb_info(media_type, tmdb_id)
    cst = get_tmdb_cast(media_type, tmdb_id)
    if follow:
        save_details(conn, follow["id"], info, cst)
        conn.commit()
    conn.close()

    genres = info.get("genres") or []
    cast = [
        {"id": c.get("person_id"), "name": c.get("name"), "character": c.get("character"), "profile_path": c.get("profile_path")}
        for c in cst
    ]
    if media_type == "movie":
        return jsonify(
            {
                "media_type": "movie",
                "title": data.get("title") or data.get("name"),
                "poster_path": data.get("poster_path"),
                "overview": info.get("overview"),
                "tagline": info.get("tagline"),
                "genres": genres,
                "vote_average": info.get("vote_average"),
                "vote_count": info.get("vote_count"),
                "runtime": info.get("runtime"),
                "release_date": info.get("release_date"),
                "cast": cast,
            }
        )
    return jsonify(
        {
            "media_type": "tv",
            "title": data.get("name") or data.get("original_name"),
            "poster_path": data.get("poster_path"),
            "overview": info.get("overview"),
            "genres": genres,
            "vote_average": info.get("vote_average"),
            "vote_count": info.get("vote_count"),
            "runtime": info.get("runtime"),
            "first_air_date": info.get("release_date"),
            "number_of_seasons": info.get("number_of_seasons"),
            "number_of_episodes": info.get("number_of_episodes"),
            "status": info.get("status"),
            "cast": cast,
        }
    )


@app.route("/api/person/<int:person_id>")
def person_credits(person_id):
    data = tmdb_request(f"/person/{person_id}/combined_credits")
    if not data:
        return jsonify({"error": "TMDB'den veri alınamadı"}), 400
    results = []
    for item in (data.get("cast") or []):
        media_type = item.get("media_type")
        if media_type not in ("movie", "tv"):
            continue
        title = item.get("title") or item.get("name")
        if not title:
            continue
        results.append(
            {
                "tmdb_id": item.get("id"),
                "media_type": media_type,
                "title": title,
                "poster_path": item.get("poster_path"),
                "release_date": item.get("release_date") or item.get("first_air_date"),
                "vote_average": item.get("vote_average") or 0,
                "character": item.get("character"),
            }
        )
    return jsonify(results)


@app.route("/api/fav_actors", methods=["GET", "POST"])
def fav_actors():
    if request.method == "GET":
        raw = get_setting("fav_actors")
        actors = json.loads(raw) if raw else []
        return jsonify({"actors": actors})
    body = request.get_json(silent=True) or {}
    person_id = body.get("person_id")
    name = (body.get("name") or "").strip()
    if not person_id:
        return jsonify({"error": "Oyuncu id gerekli"}), 400
    raw = get_setting("fav_actors")
    actors = json.loads(raw) if raw else []
    if any(a.get("person_id") == person_id for a in actors):
        actors = [a for a in actors if a.get("person_id") != person_id]
        added = False
    else:
        actors.append({"person_id": person_id, "name": name})
        added = True
    set_setting("fav_actors", json.dumps(actors, ensure_ascii=False))
    return jsonify({"ok": True, "added": added, "actors": actors})


@app.route("/api/fav_anime_chars", methods=["GET", "POST"])
def fav_anime_chars():
    if request.method == "GET":
        raw = get_setting("fav_anime_chars")
        chars = json.loads(raw) if raw else []
        return jsonify({"characters": chars})
    body = request.get_json(silent=True) or {}
    character_id = body.get("character_id")
    name = (body.get("name") or "").strip()
    anime_title = (body.get("anime_title") or "").strip()
    if not character_id:
        return jsonify({"error": "Karakter id gerekli"}), 400
    raw = get_setting("fav_anime_chars")
    chars = json.loads(raw) if raw else []
    if any(a.get("character_id") == character_id for a in chars):
        chars = [a for a in chars if a.get("character_id") != character_id]
        added = False
    else:
        chars.append({"character_id": character_id, "name": name, "anime_title": anime_title})
        added = True
    set_setting("fav_anime_chars", json.dumps(chars, ensure_ascii=False))
    return jsonify({"ok": True, "added": added, "characters": chars})


@app.route("/api/timezones")
def list_timezones():
    zones = sorted(z for z in zoneinfo.available_timezones() if "/" in z or z == "UTC")
    tz_country = {}
    try:
        with open("/usr/share/zoneinfo/zone.tab") as f:
            for line in f:
                if line.startswith("#") or not line.strip():
                    continue
                parts = line.split()
                if len(parts) >= 3:
                    tz_country[parts[2]] = parts[0]
    except OSError:
        pass

    cc_lang = _country_languages()

    out = []
    for z in zones:
        cc = tz_country.get(z, "")
        locale = ""
        if cc:
            lang = cc_lang.get(cc.upper(), "")
            if lang:
                locale = f"{lang}-{cc.upper()}"
        out.append({"value": z, "country": cc, "locale": locale})
    return jsonify(out)


def _country_languages():
    """glibc locale dosyalarından ülke kodu -> birincil dil (örn. US -> en)."""
    locales_dir = "/usr/share/i18n/locales"
    cc_lang = {}
    try:
        names = sorted(os.listdir(locales_dir))
    except OSError:
        return cc_lang
    preferred = {
        "TR": "tr", "FR": "fr", "ES": "es", "IT": "it", "DE": "de",
        "US": "en", "GB": "en", "CA": "en", "AU": "en", "NZ": "en",
        "BR": "pt", "PT": "pt", "BE": "nl", "CH": "de", "AT": "de",
        "MX": "es", "AR": "es", "CO": "es", "PE": "es", "CL": "es",
        "MY": "ms", "SG": "en", "HK": "zh-Hant", "TW": "zh-TW", "CN": "zh",
        "IN": "hi", "PK": "ur", "BD": "bn", "LK": "si", "NP": "ne",
        "AE": "ar", "SA": "ar", "EG": "ar", "MA": "ar", "IQ": "ar",
        "IL": "he", "IR": "fa", "AZ": "az", "KZ": "kk", "UZ": "uz",
        "BY": "be", "UA": "uk", "MD": "ro", "BA": "bs", "RS": "sr",
        "HR": "hr", "SI": "sl", "SK": "sk", "CZ": "cs", "HU": "hu",
        "RO": "ro", "BG": "bg", "GR": "el", "CY": "el", "MT": "mt",
        "IS": "is", "NO": "nb", "SE": "sv", "FI": "fi", "DK": "da",
        "NL": "nl", "IE": "en", "LU": "lb", "EE": "et", "LV": "lv",
        "LT": "lt", "PL": "pl", "RU": "ru", "AM": "hy", "GE": "ka",
        "MN": "mn", "KH": "km", "LA": "lo", "TH": "th", "VN": "vi",
        "ID": "id", "PH": "fil", "MM": "my", "KR": "ko", "JP": "ja",
        "TR": "tr",
    }
    for name in names:
        if name.startswith(".") or "_" not in name:
            continue
        lang, cc = name.split("_", 1)
        cc = cc.upper()
        if len(cc) != 2 or not cc.isalpha():
            continue
        if cc in preferred:
            cc_lang[cc] = preferred[cc]
        elif cc not in cc_lang:
            cc_lang[cc] = lang
    return cc_lang


@app.route("/api/settings", methods=["GET"])
def get_settings():
    return jsonify(
        {
            "tmdb_api_key": get_setting("tmdb_api_key") or "",
            "telegram_bot_token": get_setting("telegram_bot_token") or "",
            "telegram_chat_id": get_setting("telegram_chat_id") or "",
            "notify_hour": get_setting("notify_hour") or "09:00",
            "sync_hour": get_setting("sync_hour") or "09:00",
            "genre_hour": get_setting("genre_hour") or "05:00",
            "data_hour": get_setting("data_hour") or "05:10",
            "timezone": get_setting("timezone") or "Europe/Istanbul",
            "language": get_setting("language") or "tr-TR",
            "ntfy_topic": get_setting("ntfy_topic") or "",
            "telegram_enabled": get_setting("telegram_enabled") or "1",
            "ntfy_enabled": get_setting("ntfy_enabled") or "1",
        }
    )


@app.route("/api/settings", methods=["POST"])
def save_settings():
    body = request.get_json()
    for key in (
        "tmdb_api_key",
        "telegram_bot_token",
        "telegram_chat_id",
        "notify_hour",
        "sync_hour",
        "genre_hour",
        "data_hour",
        "timezone",
        "language",
        "ntfy_topic",
        "telegram_enabled",
        "ntfy_enabled",
    ):
        if key in body:
            set_setting(key, str(body[key] or ""))
    if any(k in body for k in ("notify_hour", "sync_hour", "genre_hour", "data_hour", "timezone")):
        schedule_releases()
    return jsonify({"ok": True})


@app.route("/api/settings/test", methods=["POST"])
def test_settings():
    body = request.get_json()
    token = body.get("telegram_bot_token")
    chat_id = body.get("telegram_chat_id")
    ntfy_topic = body.get("ntfy_topic")
    if not ((token and chat_id) or ntfy_topic):
        return jsonify({"error": "Telegram veya ntfy bilgisi gereklidir"}), 400
    errors = []
    if token and chat_id:
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        r = requests.post(
            url,
            json={
                "chat_id": chat_id,
                "text": "Takip uygulaması test mesajı",
            },
            timeout=15,
        )
        if r.status_code != 200:
            try:
                err = r.json().get("description", "Bilinmeyen hata")
            except Exception:
                err = "Bilinmeyen hata"
            errors.append(f"Telegram hatası: {err}")
    if ntfy_topic:
        r = requests.post(
            f"https://ntfy.sh/{ntfy_topic_clean(ntfy_topic)}",
            data="Takip uygulaması test mesajı",
            timeout=15,
        )
        if r.status_code != 200:
            errors.append(f"ntfy hatası: HTTP {r.status_code}")
    if errors:
        return jsonify({"error": "; ".join(errors)}), 400
    return jsonify({"ok": True})


def send_telegram(text, poster_url=None):
    if get_setting("telegram_enabled") == "0":
        return False
    token = get_setting("telegram_bot_token")
    chat_id = get_setting("telegram_chat_id")
    if not token or not chat_id:
        return False
    try:
        if poster_url:
            r = requests.post(
                f"https://api.telegram.org/bot{token}/sendPhoto",
                json={
                    "chat_id": chat_id,
                    "photo": poster_url,
                    "caption": text,
                    "parse_mode": "Markdown",
                },
                timeout=20,
            )
        else:
            r = requests.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"},
                timeout=15,
            )
        return r.status_code == 200
    except Exception:
        return False


def ntfy_topic_clean(topic):
    """Konu adından ntfy.sh/ vb. önekleri temizler, sadece konu adını döndürür."""
    topic = (topic or "").strip()
    topic = topic.replace("https://ntfy.sh/", "").replace("http://ntfy.sh/", "")
    topic = topic.replace("ntfy.sh/", "")
    return topic.strip("/").strip()


def send_ntfy(text, poster_url=None):
    if get_setting("ntfy_enabled") == "0":
        return False
    topic = ntfy_topic_clean(get_setting("ntfy_topic"))
    if not topic:
        return False
    try:
        if poster_url:
            img = requests.get(poster_url, timeout=20)
            if img.status_code == 200:
                content_type = img.headers.get("Content-Type", "image/jpeg")
                r = requests.post(
                    f"https://ntfy.sh/{topic}",
                    data=img.content,
                    headers={
                        "Content-Type": content_type,
                        "X-ntfy-filename": "poster.jpg",
                    },
                    timeout=30,
                )
                # Ek ile birlikte metni de ayrı bir bildirim olarak gönder
                requests.post(
                    f"https://ntfy.sh/{topic}",
                    data=text.encode("utf-8"),
                    timeout=15,
                )
                return r.status_code == 200
        r = requests.post(
            f"https://ntfy.sh/{topic}",
            data=text.encode("utf-8"),
            timeout=15,
        )
        return r.status_code == 200
    except Exception:
        return False


def notify_all(text, poster_url=None):
    ok = False
    if send_telegram(text, poster_url):
        ok = True
    if send_ntfy(text, poster_url):
        ok = True
    return ok


def sync_episodes(conn, follow):
    """Takip edilen dizinin tüm sezon/bölüm tarihlerini episodes tablosuna işler."""
    if follow["media_type"] != "tv":
        return
    data = tmdb_request(f"/tv/{follow['tmdb_id']}")
    if not data:
        return
    tvmaze_times = None
    for t in (data.get("original_name"), data.get("name"), follow["title"]):
        if t:
            tvmaze_times = _tvmaze_episode_times(t)
            if tvmaze_times is not None:
                break
    for season in data.get("seasons", []):
        season_number = season.get("season_number")
        if season_number is None or season_number == 0:
            continue
        season_data = tmdb_request(f"/tv/{follow['tmdb_id']}/season/{season_number}")
        if not season_data:
            continue
        for ep in season_data.get("episodes", []):
            ep_num = ep.get("episode_number")
            air_date = ep.get("air_date")
            if not air_date:
                continue
            ep_name = ep.get("name") or ""
            air_time = None
            if tvmaze_times is not None:
                air_time = tvmaze_times.get((season_number, ep_num))
            if air_time:
                try:
                    air_date = datetime.datetime.fromtimestamp(
                        air_time, datetime.timezone.utc
                    ).date().isoformat()
                except (ValueError, OSError, OverflowError):
                    air_date = ep.get("air_date")
            conn.execute(
                "INSERT INTO episodes (follow_id, season, episode, air_date, air_time, name) "
                "VALUES (?, ?, ?, ?, ?, ?) "
                "ON CONFLICT(follow_id, season, episode) "
                "DO UPDATE SET air_date=excluded.air_date, air_time=excluded.air_time, name=excluded.name",
                (follow["id"], season_number, ep_num, air_date, air_time, ep_name),
            )
    conn.commit()


def build_episode_message(title, media_type, season, episode, date, poster_path=None):
    media_label = "Dizi" if media_type == "tv" else "Film"
    text = (
        f"*{title}* yeni bölüm yayında!\n\n"
        f"{media_label} - Sezon {season} · Bölüm {episode}\n"
        f"Tarih: {date}"
    )
    if poster_path:
        return text, TMDB_IMAGE_BASE + poster_path
    return text, None


def build_movie_message(title, date, poster_path=None):
    text = f"*{title}* bugün yayında!\n\nFilm - Tarih: {date}"
    if poster_path:
        return text, TMDB_IMAGE_BASE + poster_path
    return text, None


def sync_releases():
    """Takip edilen dizilerin bölüm verilerini TMDB/TVMaze'den güncelleyip DB'ye işler."""
    conn = get_db()
    follows = conn.execute("SELECT * FROM followed").fetchall()
    for follow in follows:
        if follow["media_type"] == "tv":
            sync_episodes(conn, follow)
    conn.commit()
    conn.close()


def check_releases():
    today = today_str()
    conn = get_db()

    rows = conn.execute(
        "SELECT e.*, f.title, f.media_type, f.poster_path FROM episodes e "
        "JOIN followed f ON f.id = e.follow_id "
        "WHERE e.notified=0 AND e.air_date=?",
        (today,),
    ).fetchall()
    for row in rows:
        msg, poster = build_episode_message(
            row["title"], row["media_type"], row["season"], row["episode"], row["air_date"], row["poster_path"]
        )
        if notify_all(msg, poster):
            conn.execute("UPDATE episodes SET notified=1 WHERE id=?", (row["id"],))
            conn.commit()

    movies = conn.execute(
        "SELECT * FROM followed WHERE media_type='movie' AND notified=0 AND release_date=?",
        (today,),
    ).fetchall()
    for movie in movies:
        msg, poster = build_movie_message(movie["title"], movie["release_date"], movie["poster_path"])
        if notify_all(msg, poster):
            conn.execute("UPDATE followed SET notified=1 WHERE id=?", (movie["id"],))
            conn.commit()

    conn.close()


@app.route("/api/fav_genres", methods=["GET", "POST"])
def fav_genres():
    if request.method == "GET":
        raw = get_setting("fav_genres")
        genres = json.loads(raw) if raw else []
        return jsonify({"genres": genres})
    body = request.get_json(silent=True) or {}
    genre = (body.get("genre") or "").strip()
    if not genre:
        return jsonify({"error": "Tür adı gerekli"}), 400
    raw = get_setting("fav_genres")
    genres = json.loads(raw) if raw else []
    if genre in genres:
        genres.remove(genre)
        added = False
    else:
        genres.append(genre)
        added = True
    set_setting("fav_genres", json.dumps(genres, ensure_ascii=False))
    return jsonify({"ok": True, "added": added, "genres": genres})


@app.route("/api/fav_anime_genres", methods=["GET", "POST"])
def fav_anime_genres():
    if request.method == "GET":
        raw = get_setting("fav_anime_genres")
        genres = json.loads(raw) if raw else []
        return jsonify({"genres": genres})
    body = request.get_json(silent=True) or {}
    genre = (body.get("genre") or "").strip()
    if not genre:
        return jsonify({"error": "Tür adı gerekli"}), 400
    raw = get_setting("fav_anime_genres")
    genres = json.loads(raw) if raw else []
    if genre in genres:
        genres.remove(genre)
        added = False
    else:
        genres.append(genre)
        added = True
    set_setting("fav_anime_genres", json.dumps(genres, ensure_ascii=False))
    return jsonify({"ok": True, "added": added, "genres": genres})


ANIME_GENRE_QUERY = """
query {
  GenreCollection
}
"""


def _fetch_tmdb_genres():
    """TMDB'den (seçili dilde) tüm film+dizi tür isimlerini döndürür."""
    selected = get_setting("language") or "tr-TR"
    names = []
    seen = set()
    for gpath in ("genre/movie/list", "genre/tv/list"):
        data = tmdb_request(gpath, {"language": selected})
        if data:
            for g in (data.get("genres") or []):
                gname = (g.get("name") or "").strip()
                if gname and gname.lower() not in seen:
                    seen.add(gname.lower())
                    names.append(gname)
    return names


def _fetch_anilist_genres():
    """AniList'ten tüm anime tür isimlerini döndürür."""
    data = anilist_query(ANIME_GENRE_QUERY)
    if not data:
        return []
    return [g for g in (data.get("GenreCollection") or []) if g]


def sync_genres():
    """TMDB ve AniList türlerini DB'ye işler; eksikleri ekler."""
    conn = get_db()
    for source, names in (("tmdb", _fetch_tmdb_genres()), ("anilist", _fetch_anilist_genres())):
        for name in names:
            conn.execute(
                "INSERT OR IGNORE INTO genres (source, name) VALUES (?, ?)",
                (source, name),
            )
    conn.commit()
    conn.close()
    print("sync_genres tamam", len(_tmdb_genre_names()), len(_anilist_genre_names()))


def _tmdb_genre_names():
    conn = get_db()
    rows = conn.execute("SELECT name FROM genres WHERE source='tmdb' ORDER BY name").fetchall()
    conn.close()
    return [r["name"] for r in rows]


def _anilist_genre_names():
    conn = get_db()
    rows = conn.execute("SELECT name FROM genres WHERE source='anilist' ORDER BY name").fetchall()
    conn.close()
    return [r["name"] for r in rows]


@app.route("/api/genres")
def list_genres():
    source = request.args.get("source", "tmdb")
    if source == "anilist":
        return jsonify({"genres": _anilist_genre_names()})
    return jsonify({"genres": _tmdb_genre_names()})


SCHEDULER = BackgroundScheduler()


def parse_notify_hour(value):
    h = m = 0
    try:
        parts = (value or "09:00").split(":")
        h = int(parts[0]) % 24
        m = int(parts[1]) % 60
    except (ValueError, IndexError):
        h, m = 9, 0
    return h, m


def schedule_releases():
    tz = ZoneInfo(get_setting("timezone") or "Europe/Istanbul")

    sync_h, sync_m = parse_notify_hour(get_setting("sync_hour") or "09:00")
    if SCHEDULER.get_job("release_sync"):
        SCHEDULER.remove_job("release_sync")
    SCHEDULER.add_job(
        sync_releases,
        "cron",
        hour=sync_h,
        minute=sync_m,
        timezone=tz,
        id="release_sync",
        misfire_grace_time=3600,
    )

    genre_h, genre_m = parse_notify_hour(get_setting("genre_hour") or "05:00")
    if SCHEDULER.get_job("genre_sync"):
        SCHEDULER.remove_job("genre_sync")
    SCHEDULER.add_job(
        sync_genres,
        "cron",
        hour=genre_h,
        minute=genre_m,
        timezone=tz,
        id="genre_sync",
        misfire_grace_time=3600,
    )

    data_h, data_m = parse_notify_hour(get_setting("data_hour") or "05:10")
    if SCHEDULER.get_job("follow_data_sync"):
        SCHEDULER.remove_job("follow_data_sync")
    SCHEDULER.add_job(
        backfill_votes,
        "cron",
        hour=data_h,
        minute=data_m,
        timezone=tz,
        id="follow_data_sync",
        misfire_grace_time=3600,
    )

    hour, minute = parse_notify_hour(get_setting("notify_hour"))
    if SCHEDULER.get_job("release_check"):
        SCHEDULER.remove_job("release_check")
    SCHEDULER.add_job(
        check_releases,
        "cron",
        hour=hour,
        minute=minute,
        timezone=tz,
        id="release_check",
        misfire_grace_time=3600,
    )

    if not SCHEDULER.running:
        SCHEDULER.start()
    print("next release sync:", SCHEDULER.get_job("release_sync").next_run_time)
    print("next release check:", SCHEDULER.get_job("release_check").next_run_time)


def start_scheduler():
    sync_genres()
    schedule_releases()


init_db()
backfill_votes()
start_scheduler()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    try:
        from waitress import serve

        print(f"* Production server running on http://0.0.0.0:{port}")
        serve(app, host="0.0.0.0", port=port, threads=8)
    except ImportError:
        app.run(host="0.0.0.0", port=port, debug=debug)
