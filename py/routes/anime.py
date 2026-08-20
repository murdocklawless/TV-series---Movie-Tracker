import datetime

from flask import Blueprint, jsonify, request

from db import get_db
from anilist import (
    anilist_search,
    anilist_detail,
    anilist_schedule,
    _anime_title,
    _anime_cover,
    _anime_next_ep,
    save_anime_details,
    load_anime_details,
    _anime_start_year,
)

anime_bp = Blueprint("anime", __name__)


@anime_bp.route("/api/anime/search")
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


@anime_bp.route("/api/anime/details")
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


@anime_bp.route("/api/anime/followed")
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


@anime_bp.route("/api/anime/follow", methods=["POST"])
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


@anime_bp.route("/api/anime/unfollow/<int:anime_id>", methods=["DELETE"])
def anime_unfollow(anime_id):
    conn = get_db()
    conn.execute("DELETE FROM anime_cast WHERE anime_id=?", (anime_id,))
    conn.execute("DELETE FROM anime_episodes WHERE anime_id=?", (anime_id,))
    conn.execute("DELETE FROM anime WHERE id=?", (anime_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@anime_bp.route("/api/anime/schedule")
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


@anime_bp.route("/api/anime/episode/watch", methods=["POST"])
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