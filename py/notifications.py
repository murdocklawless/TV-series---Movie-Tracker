import requests

from db import get_setting


def send_telegram(text, poster_url=None):
    if get_setting("telegram_enabled") == "0":
        return False
    token = get_setting("telegram_bot_token")
    chat_id = get_setting("telegram_chat_id")
    if not token or not chat_id:
        return False
    try:
        if poster_url:
            r = requests.post(
                f"https://api.telegram.org/bot{token}/sendPhoto",
                json={
                    "chat_id": chat_id,
                    "photo": poster_url,
                    "caption": text,
                    "parse_mode": "Markdown",
                },
                timeout=20,
            )
        else:
            r = requests.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"},
                timeout=15,
            )
        return r.status_code == 200
    except Exception:
        return False


def ntfy_topic_clean(topic):
    """Konu adından ntfy.sh/ vb. önekleri temizler, sadece konu adını döndürür."""
    topic = (topic or "").strip()
    topic = topic.replace("https://ntfy.sh/", "").replace("http://ntfy.sh/", "")
    topic = topic.replace("ntfy.sh/", "")
    return topic.strip("/").strip()


def send_ntfy(text, poster_url=None):
    if get_setting("ntfy_enabled") == "0":
        return False
    topic = ntfy_topic_clean(get_setting("ntfy_topic"))
    if not topic:
        return False
    try:
        if poster_url:
            img = requests.get(poster_url, timeout=20)
            if img.status_code == 200:
                content_type = img.headers.get("Content-Type", "image/jpeg")
                r = requests.post(
                    f"https://ntfy.sh/{topic}",
                    data=img.content,
                    headers={
                        "Content-Type": content_type,
                        "X-ntfy-filename": "poster.jpg",
                    },
                    timeout=30,
                )
                # Ek ile birlikte metni de ayrı bir bildirim olarak gönder
                requests.post(
                    f"https://ntfy.sh/{topic}",
                    data=text.encode("utf-8"),
                    timeout=15,
                )
                return r.status_code == 200
        r = requests.post(
            f"https://ntfy.sh/{topic}",
            data=text.encode("utf-8"),
            timeout=15,
        )
        return r.status_code == 200
    except Exception:
        return False


def notify_all(text, poster_url=None):
    ok = False
    if send_telegram(text, poster_url):
        ok = True
    if send_ntfy(text, poster_url):
        ok = True
    return ok