#!/usr/bin/env bash
# Uygulamayı (waitress) başlatır
cd "$(dirname "$0")"
export PORT="${PORT:-5000}"
exec ./venv/bin/python app.py
