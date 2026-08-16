import os
import sqlite3
import datetime
import threading
import requests
from flask import Flask, jsonify, request, send_from_directory
from apscheduler.schedulers.background import BackgroundScheduler

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "data.db")
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
    conn.commit()
    conn.close()


def get_setting(key):
    conn = get_db()
    row = conn.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    conn.close()
    return row["value"] if row else None


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
    p = {"api_key": api_key, "language": "tr-TR"}
    if params:
        p.update(params)
    r = requests.get(url, params=p, timeout=15)
    if r.status_code != 200:
        return None
    return r.json()


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
        results.append(
            {
                "tmdb_id": item.get("id"),
                "media_type": item.get("media_type"),
                "title": item.get("title") or item.get("name"),
                "poster_path": item.get("poster_path"),
                "release_date": item.get("release_date") or item.get("first_air_date"),
                "vote_average": item.get("vote_average") or 0,
                "overview": item.get("overview"),
            }
        )
    return jsonify(results)


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
    today = datetime.date.today().isoformat()
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

    today = datetime.date.today().isoformat()
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
        for c in (credits.get("cast") or [])[:8]:
            name = c.get("name") or c.get("original_name")
            if name:
                cast.append(
                    {
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


@app.route("/api/settings", methods=["GET"])
def get_settings():
    return jsonify(
        {
            "tmdb_api_key": get_setting("tmdb_api_key") or "",
            "telegram_bot_token": get_setting("telegram_bot_token") or "",
            "telegram_chat_id": get_setting("telegram_chat_id") or "",
            "notify_hour": get_setting("notify_hour") or "09:00",
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
    ):
        if key in body:
            set_setting(key, str(body[key] or ""))
    return jsonify({"ok": True})


@app.route("/api/settings/test", methods=["POST"])
def test_settings():
    body = request.get_json()
    token = body.get("telegram_bot_token")
    chat_id = body.get("telegram_chat_id")
    if not token or not chat_id:
        return jsonify({"error": "Bot token ve chat id gereklidir"}), 400
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    r = requests.post(
        url,
        json={
            "chat_id": chat_id,
            "text": "Takip uygulaması test mesajı ✅",
        },
        timeout=15,
    )
    if r.status_code == 200:
        return jsonify({"ok": True})
    try:
        err = r.json().get("description", "Bilinmeyen hata")
    except Exception:
        err = "Bilinmeyen hata"
    return jsonify({"error": f"Telegram hatası: {err}"}), 400


def send_telegram(text):
    token = get_setting("telegram_bot_token")
    chat_id = get_setting("telegram_chat_id")
    if not token or not chat_id:
        return False
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        r = requests.post(
            url,
            json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"},
            timeout=15,
        )
        return r.status_code == 200
    except Exception:
        return False


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


def build_episode_message(title, media_type, season, episode, date):
    media_label = "Dizi" if media_type == "tv" else "Film"
    return (
        f"🎬 *{title}* yeni bölüm yayında!\n\n"
        f"{media_label} - Sezon {season} · Bölüm {episode}\n"
        f"Tarih: {date}"
    )


def build_movie_message(title, date):
    return f"🎬 *{title}* bugün yayında!\n\nFilm - Tarih: {date}"


def check_releases():
    today = datetime.date.today().isoformat()
    conn = get_db()

    follows = conn.execute("SELECT * FROM followed").fetchall()
    for follow in follows:
        if follow["media_type"] == "tv":
            sync_episodes(conn, follow)

    conn.commit()

    rows = conn.execute(
        "SELECT e.*, f.title, f.media_type FROM episodes e "
        "JOIN followed f ON f.id = e.follow_id "
        "WHERE e.notified=0 AND e.air_date=?",
        (today,),
    ).fetchall()
    for row in rows:
        msg = build_episode_message(
            row["title"], row["media_type"], row["season"], row["episode"], row["air_date"]
        )
        if send_telegram(msg):
            conn.execute("UPDATE episodes SET notified=1 WHERE id=?", (row["id"],))
            conn.commit()

    movies = conn.execute(
        "SELECT * FROM followed WHERE media_type='movie' AND notified=0 AND release_date=?",
        (today,),
    ).fetchall()
    for movie in movies:
        msg = build_movie_message(movie["title"], movie["release_date"])
        if send_telegram(msg):
            conn.execute("UPDATE followed SET notified=1 WHERE id=?", (movie["id"],))
            conn.commit()

    conn.close()


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
