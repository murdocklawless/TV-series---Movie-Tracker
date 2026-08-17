import json
import urllib.request

with urllib.request.urlopen(
    "http://127.0.0.1:8050/api/releases?media_type=tv&tmdb_id=299167&title=Dutton%20Ranch"
) as r:
    d = json.loads(r.read().decode())
for it in d["items"]:
    if it["season"] == 1:
        print(it["episode"], repr(it.get("episode_name", "")), len(it.get("episode_name", "")))