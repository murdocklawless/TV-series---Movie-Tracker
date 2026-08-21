"""Surec ici RAM cache'i: TTL'li, sinirli girdili, thread-safe.
ttl=0 iken tamamen kapalidir (get hep None doner, set islemsizdir)."""
import threading
import time

from flask import jsonify


class TTLCache:
    def __init__(self, maxsize=64, ttl=90):
        self._store = {}
        self._lock = threading.Lock()
        self._maxsize = maxsize
        self._ttl = int(ttl or 0)

    def configure(self, ttl):
        with self._lock:
            self._ttl = int(ttl or 0)
            if self._ttl <= 0:
                self._store.clear()

    def get(self, key):
        now = time.time()
        with self._lock:
            item = self._store.get(key)
            if not item:
                return None
            ts, value = item
            if self._ttl <= 0 or now - ts > self._ttl:
                del self._store[key]
                return None
            return value

    def set(self, key, value):
        if self._ttl <= 0:
            return
        now = time.time()
        with self._lock:
            if len(self._store) >= self._maxsize and key not in self._store:
                oldest = min(self._store, key=lambda k: self._store[k][0])
                del self._store[oldest]
            self._store[key] = (now, value)

    def clear(self):
        with self._lock:
            self._store.clear()


_gen_lock = threading.Lock()
_gen = 0


def bump():
    """Herhangi bir yazma isleminde cagrilir; tum liste cache'lerini gecersiz kil."""
    global _gen
    with _gen_lock:
        _gen += 1


def gen():
    return _gen


def cached_response(data, hit):
    """Cache durumunu X-Cache basligiyle dondurur (HIT/MISS)."""
    resp = jsonify(data)
    resp.headers["X-Cache"] = "HIT" if hit else "MISS"
    return resp


list_cache = TTLCache()
