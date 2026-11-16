#!/usr/bin/env bash
# Update deploy Solaris (Laravel API di telkom-api/ + React/Vite di telkom/) ke VPS Hostinger (Ubuntu 24.04 + CloudPanel).
#
# Dipanggil otomatis oleh .github/workflows/deploy-hostinger.yaml:
#   bash /home/usersolo/deploy.sh
# Atau manual lewat SSH:
#   APP_DIR=/home/usersolo/htdocs/solaris-solo.tech bash deploy.sh
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/home/usersolo/htdocs/solaris-solo.tech}"
BRANCH="${BRANCH:-main}"
API_DIR="$APP_DIR/telkom-api"
WEB_DIR="$APP_DIR/telkom"

log()  { printf '\n==> %s\n' "$*"; }
fail() { printf '\nDEPLOY GAGAL: %s\n' "$*" >&2; exit 1; }
trap 'printf "\nDEPLOY GAGAL di baris %s. Periksa output di atas.\n" "$LINENO" >&2' ERR

# ---- Pemeriksaan awal (tidak mengubah apa pun) ----
[ -d "$APP_DIR/.git" ]                 || fail "Bukan repo git: $APP_DIR (atur APP_DIR)."
[ -f "$API_DIR/.env" ]                 || fail "$API_DIR/.env belum ada. Salin dari .env.example dan isi."
grep -q '^APP_KEY=base64:' "$API_DIR/.env" || fail "APP_KEY di $API_DIR/.env belum diisi (php artisan key:generate --show)."
[ -f "$WEB_DIR/.env" ]                 || fail "$WEB_DIR/.env belum ada. Vite membutuhkannya saat build (VITE_API_BASE_URL)."

# ---- 1. Ambil kode terbaru ----
log "1/9 git pull origin $BRANCH"
cd "$APP_DIR"
git pull --ff-only origin "$BRANCH"

# ---- 2. Dependensi PHP (tanpa dev) ----
log "2/9 composer install --no-dev"
cd "$API_DIR"
composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist

# ---- 3. Migrasi database ----
log "3/9 php artisan migrate --force"
php artisan migrate --force

# ---- 4-6. Cache konfigurasi, route, dan view ----
log "4/9 php artisan config:cache"
php artisan config:cache

log "5/9 php artisan route:cache"
php artisan route:cache

log "6/9 php artisan view:cache"
php artisan view:cache

# ---- 7. Symlink storage (hanya jika belum ada) ----
log "7/9 storage:link (jika belum ada)"
if [ ! -L public/storage ]; then
  php artisan storage:link
else
  echo "public/storage sudah ada, dilewati."
fi

# ---- 8. Dependensi dan build frontend ----
log "8/9 npm install && npm run build"
cd "$WEB_DIR"
npm install
npm run build

# ---- 9. Izin folder tulis Laravel ----
log "9/9 chmod -R 775 storage bootstrap/cache"
cd "$API_DIR"
chmod -R 775 storage bootstrap/cache

printf '\nDeploy selesai: %s (%s)\n' "$BRANCH" "$(git -C "$APP_DIR" rev-parse --short HEAD)"
