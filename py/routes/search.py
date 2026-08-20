from flask import Blueprint, jsonify, request, send_from_directory

from config import STATIC_DIR
from tmdb import tmdb_request, _tmdb_adv_results, _genre_names_to_ids
from anilist import _anime_adv_results, _anime_title, _anime_cover, _anime_next_ep

search_bp = Blueprint("search", __name__)


@search_bp.route("/")
def index():
    resp = send_from_directory(STATIC_DIR, "index.html")
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    return resp


@search_bp.route("/api/search")
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


@search_bp.route("/api/adv-search")
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


@search_bp.route("/api/combo-search")
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


@search_bp.route("/api/person/<int:person_id>")
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