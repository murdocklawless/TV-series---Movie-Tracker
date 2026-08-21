"""Migrasyon: var olan posterleri w500/w185 lokal klasore indirir + eski flat -> w500/w185 tasima."""
import os
from db import get_db, init_db
from poster_store import download_tmdb_poster_with_sizes, download_anime_poster_with_sizes, filesystem_path_from_web, poster_local_path


def _ensure_w185_from_w500(kind, ident, w500_web, w185_web):
    if not w500_web or not w185_web:
        return w185_web
    fs500 = filesystem_path_from_web(w500_web)
    fs185 = filesystem_path_from_web(w185_web)
    if fs500 and os.path.exists(fs500) and fs185 and not os.path.exists(fs185):
        try:
            from poster_store import _generate_w185
            _generate_w185(fs500, fs185)
            print(f"  w185 generated {fs185}")
        except Exception as e:
            print(f"  w185 gen failed {e}")
    return w185_web


def main():
    init_db()
    conn = get_db()
    done = 0
    skipped = 0
    failed = 0

    # followed: dizi/film
    rows = conn.execute("SELECT id, tmdb_id, media_type, poster_path, poster_local, poster_local_w185 FROM followed").fetchall()
    for r in rows:
        pid = r["tmdb_id"]
        kind = r["media_type"]
        has_w500 = r["poster_local"] and filesystem_path_from_web(r["poster_local"]) and os.path.exists(filesystem_path_from_web(r["poster_local"]))
        has_w185 = r["poster_local_w185"] and filesystem_path_from_web(r["poster_local_w185"]) and os.path.exists(filesystem_path_from_web(r["poster_local_w185"]))
        # also check new w500/w185 paths via helper (handles flat migration)
        if not has_w500:
            cand = poster_local_path(kind, pid, "w500")
            if cand and filesystem_path_from_web(cand) and os.path.exists(filesystem_path_from_web(cand)):
                has_w500 = True
                r = dict(r)
                r["poster_local"] = cand
        if not has_w185:
            cand = poster_local_path(kind, pid, "w185")
            if cand and filesystem_path_from_web(cand) and os.path.exists(filesystem_path_from_web(cand)):
                has_w185 = True
                r = dict(r)
                r["poster_local_w185"] = cand
        if has_w500 and has_w185:
            # ensure DB has both
            if r["poster_local"] and r["poster_local_w185"]:
                skipped += 1
                continue
            else:
                # fill missing DB
                w500 = r["poster_local"] or poster_local_path(kind, pid, "w500")
                w185 = r["poster_local_w185"] or poster_local_path(kind, pid, "w185")
                conn.execute("UPDATE followed SET poster_local=?, poster_local_w185=? WHERE id=?", (w500, w185, r["id"]))
                conn.commit()
                done += 1
                print(f"followed {r['id']} tmdb {pid} -> fill DB {w500} {w185}")
                continue
        # need download or generate
        if not r["poster_path"]:
            # try to get poster_path from DB already? skip
            skipped += 1
            continue
        # if w500 exists but w185 not, just generate
        if has_w500 and not has_w185:
            w500 = r["poster_local"] or poster_local_path(kind, pid, "w500")
            w185 = poster_local_path(kind, pid, "w185")
            _ensure_w185_from_w500(kind, pid, w500, w185)
            conn.execute("UPDATE followed SET poster_local_w185=? WHERE id=?", (w185, r["id"]))
            conn.commit()
            done += 1
            print(f"followed {r['id']} tmdb {pid} -> w185 generated {w185}")
            continue
        w500, w185 = download_tmdb_poster_with_sizes(kind, pid, r["poster_path"])
        if w500 or w185:
            conn.execute("UPDATE followed SET poster_local=?, poster_local_w185=? WHERE id=?", (w500, w185, r["id"]))
            conn.commit()
            done += 1
            print(f"followed {r['id']} tmdb {pid} -> {w500} {w185}")
        else:
            failed += 1
            print(f"FAILED followed {r['id']} tmdb {pid} path {r['poster_path']}")

    # anime
    rows = conn.execute("SELECT id, anilist_id, cover_url, poster_local, poster_local_w185 FROM anime").fetchall()
    for r in rows:
        aid = r["anilist_id"]
        has_w500 = r["poster_local"] and filesystem_path_from_web(r["poster_local"]) and os.path.exists(filesystem_path_from_web(r["poster_local"]))
        has_w185 = r["poster_local_w185"] and filesystem_path_from_web(r["poster_local_w185"]) and os.path.exists(filesystem_path_from_web(r["poster_local_w185"]))
        if not has_w500:
            cand = poster_local_path("anime", aid, "w500")
            if cand and filesystem_path_from_web(cand) and os.path.exists(filesystem_path_from_web(cand)):
                has_w500 = True
        if not has_w185:
            cand = poster_local_path("anime", aid, "w185")
            if cand and filesystem_path_from_web(cand) and os.path.exists(filesystem_path_from_web(cand)):
                has_w185 = True
        if has_w500 and has_w185:
            skipped += 1
            continue
        if not r["cover_url"]:
            skipped += 1
            continue
        if has_w500 and not has_w185:
            w500 = r["poster_local"] or poster_local_path("anime", aid, "w500")
            w185 = poster_local_path("anime", aid, "w185")
            _ensure_w185_from_w500("anime", aid, w500, w185)
            conn.execute("UPDATE anime SET poster_local_w185=? WHERE id=?", (w185, r["id"]))
            conn.commit()
            done += 1
            print(f"anime {r['id']} anilist {aid} -> w185 generated {w185}")
            continue
        w500, w185 = download_anime_poster_with_sizes(aid, r["cover_url"])
        if w500 or w185:
            conn.execute("UPDATE anime SET poster_local=?, poster_local_w185=? WHERE id=?", (w500, w185, r["id"]))
            conn.commit()
            done += 1
            print(f"anime {r['id']} anilist {aid} -> {w500} {w185}")
        else:
            failed += 1
            print(f"FAILED anime {r['id']} anilist {aid} url {r['cover_url']}")
    conn.close()
    print(f"Migrasyon bitti: done={done} skipped={skipped} failed={failed}")


if __name__ == "__main__":
    main()
