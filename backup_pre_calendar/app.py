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
            notified INTEGER DEFAULT 0
        )"""
    )
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
    return send_from_directory(STATIC_DIR, "index.html")


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
                "overview": item.get("overview"),
            }
        )
    return jsonify(results)


def get_release_date(media_type, tmdb_id):
    if media_type == "movie":
        data = tmdb_request(f"/movie/{tmdb_id}")
        if data:
            return data.get("release_date")
    elif media_type == "tv":
        data = tmdb_request(f"/tv/{tmdb_id}")
        if data:
            return data.get("first_air_date")
    return None


@app.route("/api/follow", methods=["POST"])
def follow():
    body = request.get_json()
    tmdb_id = body.get("tmdb_id")
    media_type = body.get("media_type")
    title = body.get("title")
    poster_path = body.get("poster_path")

    if not all([tmdb_id, media_type, title]):
        return jsonify({"error": "Eksik bilgi"}), 400

    release_date = get_release_date(media_type, tmdb_id)

    conn = get_db()
    existing = conn.execute(
        "SELECT id FROM followed WHERE tmdb_id=? AND media_type=?",
        (tmdb_id, media_type),
    ).fetchone()
    if existing:
        conn.close()
        return jsonify({"error": "Zaten takipte"}), 400

    conn.execute(
        "INSERT INTO followed (tmdb_id, media_type, title, poster_path, release_date) "
        "VALUES (?, ?, ?, ?, ?)",
        (tmdb_id, media_type, title, poster_path, release_date),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/followed")
def followed():
    conn = get_db()
    rows = conn.execute("SELECT * FROM followed ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/unfollow/<int:item_id>", methods=["DELETE"])
def unfollow(item_id):
    conn = get_db()
    conn.execute("DELETE FROM followed WHERE id=?", (item_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


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


def build_message(item):
    media_label = "Dizi" if item["media_type"] == "tv" else "Film"
    date = item.get("release_date") or "bilinmiyor"
    return f"🎬 *{item['title']}* yayında!\n\n{media_label} - Tarih: {date}"


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


def check_releases():
    today = datetime.date.today().isoformat()
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM followed WHERE notified=0 AND release_date=?",
        (today,),
    ).fetchall()
    for row in rows:
        msg = build_message(dict(row))
        if send_telegram(msg):
            conn.execute("UPDATE followed SET notified=1 WHERE id=?", (row["id"],))
            conn.commit()
    conn.close()


def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        check_releases,
        "cron",
        hour=9,
        minute=0,
        id="daily_release_check",
        misfire_grace_time=3600,
    )
    scheduler.start()


init_db()
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
