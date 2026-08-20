import os
import sqlite3
import json
import time
import datetime
import threading
import requests
from flask import Flask, jsonify, request, send_from_directory
from apscheduler.schedulers.background import BackgroundScheduler
from zoneinfo import ZoneInfo
import zoneinfo

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Faz 2 klasör düzenlemesi için: .py dosyaları py/ altına taşınırsa BASE_DIR'i proje köküne sabitle
if os.path.basename(BASE_DIR) == "py":
    BASE_DIR = os.path.dirname(BASE_DIR)
DB_PATH = os.environ.get("DB_PATH", os.path.join(BASE_DIR, "db", "tracker.db"))
# Migration: eski konumda (root'ta data.db veya tracker.db) varsa ve hedefte yoksa onu kullan
if "DB_PATH" not in os.environ and not os.path.exists(DB_PATH):
    for legacy in (os.path.join(BASE_DIR, "data.db"), os.path.join(BASE_DIR, "tracker.db")):
        if os.path.exists(legacy):
            DB_PATH = legacy
            break
STATIC_DIR = os.path.join(BASE_DIR, "static")

TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path="/static")
