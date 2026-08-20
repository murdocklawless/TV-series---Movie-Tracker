#!/usr/bin/env bash
# Dizi/Film Takip - tek betik kurulum (Raspberry Pi)
# Kullanım: sudo bash setup.sh   (isteğe bağlı: sudo PORT=8050 bash setup.sh)
set -e

APP_DIR="/etc/tracker"
PORT="${PORT:-8050}"

echo "==> Kök yetkisi kontrol ediliyor..."
if [ "$(id -u)" -ne 0 ]; then
  echo "Lütfen sudo ile çalıştırın: sudo bash setup.sh"
  exit 1
fi

# Betik çalıştırılan dizinden dosyaları kopyala
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "==> $APP_DIR klasörü hazırlanıyor..."
mkdir -p "$APP_DIR/static"
if [ -f "$SCRIPT_DIR/tracker.py" ]; then
  cp -f "$SCRIPT_DIR/tracker.py" "$APP_DIR/"
  cp -f "$SCRIPT_DIR/requirements.txt" "$APP_DIR/" 2>/dev/null || true
  cp -f "$SCRIPT_DIR/static/tracker.js" "$APP_DIR/static/" 2>/dev/null || true
  cp -f "$SCRIPT_DIR/static/style.css" "$APP_DIR/static/" 2>/dev/null || true
  cp -f "$SCRIPT_DIR/static/index.html" "$APP_DIR/static/" 2>/dev/null || true
  echo "==> Kaynak dosyalar kopyalandı."
else
  echo "==> tracker.py bu dizinde bulunamadı; mevcut $APP_DIR dosyaları kullanılacak."
fi

cd "$APP_DIR"

echo "==> Python3 ve bağımlılıklar kuruluyor..."
apt-get update
apt-get install -y python3 python3-pip python3-venv curl

echo "==> Sanal ortam oluşturuluyor..."
if [ ! -d "venv" ]; then
  python3 -m venv venv
fi

echo "==> Bağımlılıklar yükleniyor..."
./venv/bin/pip install --upgrade pip >/dev/null
./venv/bin/pip install -r requirements.txt

echo "==> Systemd servisi kuruluyor (port: $PORT)..."
cat > /etc/systemd/system/takip.service <<EOF
[Unit]
Description=Takip Listesi - Dizi/Film Takip Uygulamasi
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR
Environment=PORT=$PORT
ExecStart=$APP_DIR/venv/bin/python $APP_DIR/tracker.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now takip

echo "==> Servis başlatılıyor..."
for i in $(seq 1 15); do
  if curl -sf -o /dev/null "http://127.0.0.1:$PORT/"; then
    echo "==> Kurulum tamamlandı! Uygulama http://$(hostname -I | awk '{print $1}'):$PORT adresinde çalışıyor."
    exit 0
  fi
  sleep 1
done

echo "!! Servis başladı ama yanıt vermedi. Durum:"
systemctl status takip --no-pager || true
exit 1