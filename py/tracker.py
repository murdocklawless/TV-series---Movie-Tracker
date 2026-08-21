import os

from config import app
from db import init_db, get_setting
from ramcache import list_cache
from scheduler import backfill_votes, start_scheduler

from routes.search import search_bp
from routes.followed import followed_bp
from routes.anime import anime_bp
from routes.settings import settings_bp
from notification import notification_bp

app.register_blueprint(search_bp)
app.register_blueprint(followed_bp)
app.register_blueprint(anime_bp)
app.register_blueprint(settings_bp)
app.register_blueprint(notification_bp)

init_db()
try:
    list_cache.configure(int(get_setting("cache_ttl") or 3600))
except (TypeError, ValueError):
    pass
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