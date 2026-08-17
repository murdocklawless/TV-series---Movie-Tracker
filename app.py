import os
import sqlite3
import json
import datetime
import threading
import requests
from flask import Flask, jsonify, request, send_from_directory
from apscheduler.schedulers.background import BackgroundScheduler
from zoneinfo import ZoneInfo
import zoneinfo

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("DB_PATH", os.path.join(BASE_DIR, "data.db"))
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
    conn.execute(
        """CREATE TABLE IF NOT EXISTS episodes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            follow_id INTEGER,
            season INTEGER,
            episode INTEGER,
            air_date TEXT,
            notified INTEGER DEFAULT 0,
            watched INTEGER DEFAULT 0,
            UNIQUE(follow_id, season, episode)
        )"""
    )
    ecols = [r["name"] for r in conn.execute("PRAGMA table_info(episodes)").fetchall()]
    if "watched" not in ecols:
        conn.execute("ALTER TABLE episodes ADD COLUMN watched INTEGER DEFAULT 0")
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


ANIME_ADV_SEARCH_QUERY = """
query ($year: Int, $score: Int, $genres: [String], $q: String) {
  Page(page: 1, perPage: 20) {
    media(type: ANIME, seasonYear: $year, averageScore_greater: $score, genre_in: $genres, search: $q) {
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


def _anime_adv_results(year=None, score=None, genres=None, q=None):
    variables = {}
    if year is not None:
        variables["year"] = int(year)
    if score is not None:
        variables["score"] = int(round(float(score) * 10))
    if genres:
        variables["genres"] = [g.strip() for g in genres.split(",") if g.strip()]
    if q:
        variables["q"] = q
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
        return jsonify(_anime_adv_results(year=year_i, score=score_f, genres=genres or None, q=q or None))

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


@app.route("/api/anime/details")
def anime_details():
    anilist_id = request.args.get("anilist_id")
    if not anilist_id:
        return jsonify({"error": "anilist_id gereklidir"}), 400
    d = anilist_detail(anilist_id)
    if not d:
        return jsonify({"error": "AniList'ten veri alınamadı"}), 404
    return jsonify(
        {
            "anilist_id": d.get("id"),
            "title": _anime_title(d),
            "cover_url": _anime_cover(d),
            "banner_url": d.get("bannerImage"),
            "description": d.get("description"),
            "format": d.get("format"),
            "status": d.get("status"),
            "episodes": d.get("episodes"),
            "duration": d.get("duration"),
            "genres": d.get("genres") or [],
            "score": d.get("averageScore"),
            "start_date": (
                (d.get("startDate") or {}).get("year")
                if (d.get("startDate") or {}).get("year")
                else None
            ),
            "studios": [s.get("name") for s in (d.get("studios") or {}).get("nodes") or [] if s.get("name")],
            "characters": [
                {
                    "name": c.get("name", {}).get("full") if c.get("name") else "",
                    "image": (c.get("image") or {}).get("large") if c.get("image") else None,
                }
                for c in (d.get("characters") or {}).get("nodes") or []
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
    conn = get_db()
    conn.execute(
        "INSERT INTO anime (anilist_id, title, cover_url, episodes, status, score) "
        "VALUES (?, ?, ?, ?, ?, ?) "
        "ON CONFLICT(anilist_id) DO UPDATE SET "
        "title=excluded.title, cover_url=excluded.cover_url, "
        "episodes=excluded.episodes, status=excluded.status, score=excluded.score",
        (anilist_id, title, cover, episodes, status, score),
    )
    conn.commit()
    row = conn.execute("SELECT id FROM anime WHERE anilist_id=?", (anilist_id,)).fetchone()
    anime_db_id = row["id"]

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
    """TMDB'den temel bilgileri çeker: release_date ve vote_average."""
    if media_type not in ("movie", "tv"):
        return None
    data = tmdb_request(f"/{media_type}/{tmdb_id}")
    if not data:
        return None
    if media_type == "movie":
        return {
            "release_date": data.get("release_date"),
            "vote_average": data.get("vote_average") or 0,
        }
    return {
        "release_date": data.get("first_air_date"),
        "vote_average": data.get("vote_average") or 0,
    }


def backfill_votes():
    """Puanı 0 olan takip kayıtlarını TMDB'den doldurur."""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM followed WHERE vote_average IS NULL OR vote_average=0"
    ).fetchall()
    for row in rows:
        info = get_tmdb_info(row["media_type"], row["tmdb_id"])
        if info and info.get("vote_average"):
            conn.execute(
                "UPDATE followed SET vote_average=? WHERE id=?",
                (info["vote_average"], row["id"]),
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

    conn = get_db()
    existing = conn.execute(
        "SELECT id FROM followed WHERE tmdb_id=? AND media_type=?",
        (tmdb_id, media_type),
    ).fetchone()
    if existing:
        conn.close()
        return jsonify({"error": "Zaten takipte"}), 400

    conn.execute(
        "INSERT INTO followed (tmdb_id, media_type, title, poster_path, release_date, vote_average) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (tmdb_id, media_type, title, poster_path, release_date, vote_average),
    )
    new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
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
        items.append(item)
    conn.close()
    return jsonify(items)


@app.route("/api/unfollow/<int:item_id>", methods=["DELETE"])
def unfollow(item_id):
    conn = get_db()
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

    if media_type == "movie":
        data = tmdb_request(f"/movie/{tmdb_id}")
        if not data:
            return jsonify({"error": "TMDB'den veri alınamadı"}), 400
        return jsonify(
            {
                "title": title or data.get("title"),
                "media_type": "movie",
                "items": [
                    {
                        "label": "Yayın Tarihi",
                        "date": data.get("release_date"),
                    }
                ],
            }
        )

    data = tmdb_request(f"/tv/{tmdb_id}")
    if not data:
        return jsonify({"error": "TMDB'den veri alınamadı"}), 400

    conn = get_db()
    follow = conn.execute(
        "SELECT id FROM followed WHERE tmdb_id=? AND media_type='tv'",
        (tmdb_id,),
    ).fetchone()
    follow_id = follow["id"] if follow else None

    items = []
    for season in data.get("seasons", []):
        season_number = season.get("season_number")
        if season_number is None or season_number == 0:
            continue
        season_data = tmdb_request(f"/tv/{tmdb_id}/season/{season_number}")
        if not season_data:
            continue
        for ep in season_data.get("episodes", []):
            ep_num = ep.get("episode_number")
            ep_name = ep.get("name") or ""
            watched = 0
            if follow_id is not None:
                wrow = conn.execute(
                    "SELECT watched FROM episodes "
                    "WHERE follow_id=? AND season=? AND episode=?",
                    (follow_id, season_number, ep_num),
                ).fetchone()
                watched = wrow["watched"] if wrow else 0
            items.append(
                {
                    "label": f"Sezon {season_number} · Bölüm {ep_num}",
                    "episode_name": ep_name,
                    "season": season_number,
                    "episode": ep_num,
                    "date": ep.get("air_date"),
                    "watched": watched,
                }
            )

    conn.close()
    return jsonify(
        {
            "title": title or data.get("name"),
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

    today = today_str()
    count = 0
    for ep in season_data.get("episodes", []):
        ep_num = ep.get("episode_number")
        if not ep_num:
            continue
        air_date = ep.get("air_date")
        if watched and (not air_date or air_date > today):
            continue
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


@app.route("/api/details")
def details():
    media_type = request.args.get("media_type")
    tmdb_id = request.args.get("tmdb_id")
    if media_type not in ("movie", "tv") or not tmdb_id:
        return jsonify({"error": "Geçersiz istek"}), 400

    data = tmdb_request(f"/{media_type}/{tmdb_id}")
    if not data:
        return jsonify({"error": "TMDB'den veri alınamadı"}), 400

    genres = [g.get("name") for g in data.get("genres", []) if g.get("name")]

    cast = []
    credits = tmdb_request(f"/{media_type}/{tmdb_id}/credits")
    if credits:
        full_cast = credits.get("cast") or []
        highlight = (request.args.get("highlight_person") or "").strip().lower()
        hpid = (request.args.get("highlight_person_id") or "").strip()
        for i, c in enumerate(full_cast):
            nm = (c.get("name") or c.get("original_name") or "").strip().lower()
            if (highlight and nm == highlight) or (hpid and str(c.get("id")) == hpid):
                full_cast.insert(0, full_cast.pop(i))
                break
        for c in full_cast[:8]:
            name = c.get("name") or c.get("original_name")
            if name:
                cast.append(
                    {
                        "id": c.get("id"),
                        "name": name,
                        "character": c.get("character"),
                        "profile_path": c.get("profile_path"),
                    }
                )

    if media_type == "movie":
        result = {
            "media_type": "movie",
            "title": data.get("title") or data.get("name"),
            "poster_path": data.get("poster_path"),
            "overview": data.get("overview"),
            "tagline": data.get("tagline"),
            "genres": genres,
            "vote_average": data.get("vote_average"),
            "vote_count": data.get("vote_count"),
            "runtime": data.get("runtime"),
            "release_date": data.get("release_date"),
            "cast": cast,
        }
    else:
        runtimes = data.get("episode_run_time") or []
        result = {
            "media_type": "tv",
            "title": data.get("name") or data.get("original_name"),
            "poster_path": data.get("poster_path"),
            "overview": data.get("overview"),
            "genres": genres,
            "vote_average": data.get("vote_average"),
            "vote_count": data.get("vote_count"),
            "runtime": runtimes[0] if runtimes else None,
            "first_air_date": data.get("first_air_date"),
            "number_of_seasons": data.get("number_of_seasons"),
            "number_of_episodes": data.get("number_of_episodes"),
            "status": data.get("status"),
            "cast": cast,
        }

    return jsonify(result)


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
            "timezone": get_setting("timezone") or "Europe/Istanbul",
            "language": get_setting("language") or "tr-TR",
            "ntfy_topic": get_setting("ntfy_topic") or "",
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
        "timezone",
        "language",
        "ntfy_topic",
    ):
        if key in body:
            set_setting(key, str(body[key] or ""))
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
            conn.execute(
                "INSERT INTO episodes (follow_id, season, episode, air_date) "
                "VALUES (?, ?, ?, ?) "
                "ON CONFLICT(follow_id, season, episode) "
                "DO UPDATE SET air_date=excluded.air_date",
                (follow["id"], season_number, ep_num, air_date),
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


def check_releases():
    today = today_str()
    conn = get_db()

    follows = conn.execute("SELECT * FROM followed").fetchall()
    for follow in follows:
        if follow["media_type"] == "tv":
            sync_episodes(conn, follow)

    conn.commit()

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


def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        check_releases,
        "interval",
        hours=6,
        id="release_check",
        misfire_grace_time=3600,
    )
    scheduler.start()


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
