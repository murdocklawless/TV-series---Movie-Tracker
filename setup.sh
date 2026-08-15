#!/usr/bin/env bash
# /etc/tracker kurulum betiği (Raspberry Pi)
set -e

APP_DIR="/etc/tracker"

echo "==> /etc/tracker klasörü hazırlanıyor..."
if [ "$(id -u)" -ne 0 ]; then
  echo "Lütfen sudo ile çalıştırın: sudo bash setup.sh"
  exit 1
fi

mkdir -p "$APP_DIR"

# Betik çalıştırılan dizinde dosyalar varsa kopyala
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ "$SCRIPT_DIR" != "$APP_DIR" ]; then
  echo "==> Dosyalar $APP_DIR içine kopyalanıyor..."
  cp -r "$SCRIPT_DIR"/app.py "$SCRIPT_DIR"/static "$SCRIPT_DIR"/requirements.txt "$SCRIPT_DIR"/run.sh "$SCRIPT_DIR"/takip.service "$APP_DIR"/ 2>/dev/null || true
fi

cd "$APP_DIR"

echo "==> Python3 ve bağımlılıklar kuruluyor..."
apt-get update
apt-get install -y python3 python3-pip python3-venv

echo "==> Sanal ortam oluşturuluyor..."
if [ ! -d "venv" ]; then
  python3 -m venv venv
fi

echo "==> Bağımlılıklar yükleniyor..."
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt

# /etc klasörü okuma/yazma izni
chmod -R a+rw "$APP_DIR" 2>/dev/null || true

echo ""
echo "Kurulum tamamlandı."
echo "Uygulamayı başlat:       cd /etc/tracker && ./run.sh"
echo "Ya da systemd servisi:"
echo "  sudo cp /etc/tracker/takip.service /etc/systemd/system/"
echo "  sudo systemctl daemon-reload"
echo "  sudo systemctl enable --now takip"
