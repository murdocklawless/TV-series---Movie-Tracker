import json
import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from zoneinfo import ZoneInfo

from config import TMDB_IMAGE_BASE
from db import get_db, get_setting, today_str
from tvmaze import _tvmaze_episode_times
from tmdb import (
    tmdb_request,
    get_tmdb_info,
    get_tmdb_cast,
    save_details,
    _fetch_tmdb_genres,
)
from anilist import anilist_detail, anilist_schedule, save_anime_details, _fetch_anilist_genres
from notifications import notify_all


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
    _reset_stale_watched(conn)
    conn.commit()
    conn.close()


def _reset_stale_watched(conn):
    """in_watched=1 olup artık tamamlanmamış (yeni bölüm yayınlanan) yapımları izlenmişten çıkarır."""
    for r in conn.execute(
        "SELECT id FROM followed WHERE media_type='tv' AND in_watched=1"
    ).fetchall():
        total = conn.execute(
            "SELECT COUNT(*) c FROM episodes WHERE follow_id=?", (r["id"],)
        ).fetchone()["c"]
        watched_cnt = conn.execute(
            "SELECT COUNT(*) c FROM episodes WHERE follow_id=? AND watched=1", (r["id"],)
        ).fetchone()["c"]
        if total > 0 and total != watched_cnt:
            conn.execute("UPDATE followed SET in_watched=0 WHERE id=?", (r["id"],))
    for r in conn.execute(
        "SELECT id FROM followed WHERE media_type='movie' AND in_watched=1"
    ).fetchall():
        watched = conn.execute(
            "SELECT watched FROM followed WHERE id=?", (r["id"],)
        ).fetchone()["watched"]
        if not (watched == 1):
            conn.execute("UPDATE followed SET in_watched=0 WHERE id=?", (r["id"],))
    for r in conn.execute(
        "SELECT id FROM anime WHERE in_watched=1"
    ).fetchall():
        total = conn.execute(
            "SELECT COUNT(*) c FROM anime_episodes WHERE anime_id=?", (r["id"],)
        ).fetchone()["c"]
        watched_cnt = conn.execute(
            "SELECT COUNT(*) c FROM anime_episodes WHERE anime_id=? AND watched=1", (r["id"],)
        ).fetchone()["c"]
        if total > 0 and total != watched_cnt:
            conn.execute("UPDATE anime SET in_watched=0 WHERE id=?", (r["id"],))


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