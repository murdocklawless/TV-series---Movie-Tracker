import json
import datetime

from flask import Blueprint, jsonify, request

from db import get_db, today_str
from tmdb import get_tmdb_info, get_tmdb_cast, save_details, load_details, tmdb_request
from tvmaze import _tvmaze_episode_times
from scheduler import sync_episodes

followed_bp = Blueprint("followed", __name__)


@followed_bp.route("/api/follow", methods=["POST"])
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


@followed_bp.route("/api/followed")
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


@followed_bp.route("/api/unwatched")
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


@followed_bp.route("/api/releases")
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


@followed_bp.route("/api/episode/watch", methods=["POST"])
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


@followed_bp.route("/api/season/watch", methods=["POST"])
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


@followed_bp.route("/api/movie/watch", methods=["POST"])
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


@followed_bp.route("/api/details")
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