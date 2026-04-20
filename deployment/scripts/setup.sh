#!/bin/bash
# ============================================================
# deployment/scripts/setup.sh
# إعداد السيرفر من الصفر — Ubuntu 22.04
# تشغيل: bash setup.sh
# ============================================================
set -euo pipefail
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()   { echo -e "${GREEN}[✓] $1${NC}"; }
warn()  { echo -e "${YELLOW}[⚠] $1${NC}"; }
error() { echo -e "${RED}[✗] $1${NC}"; exit 1; }

echo "🎓 إعداد سيرفر منصة النجاح..."

# ── تحديث النظام ──
log "تحديث حزم النظام..."
apt-get update -qq && apt-get upgrade -y -qq

# ── تثبيت الأدوات الأساسية ──
log "تثبيت الأدوات الأساسية..."
apt-get install -y -qq \
  curl wget git unzip \
  nginx certbot python3-certbot-nginx \
  ufw fail2ban \
  build-essential

# ── Node.js 20 ──
if ! command -v node &>/dev/null; then
  log "تثبيت Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
  log "Node.js $(node --version) مثبّت"
else
  log "Node.js $(node --version) موجود"
fi

# ── Docker ──
if ! command -v docker &>/dev/null; then
  log "تثبيت Docker..."
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker $USER
  log "Docker $(docker --version) مثبّت"
fi

# ── Docker Compose ──
if ! command -v docker-compose &>/dev/null; then
  log "تثبيت Docker Compose..."
  curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
    -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
fi

# ── Redis ──
if ! command -v redis-cli &>/dev/null; then
  log "تثبيت Redis..."
  apt-get install -y redis-server
  systemctl enable redis-server
  systemctl start redis-server
fi

# ── PM2 (لتشغيل Node.js في الإنتاج) ──
if ! command -v pm2 &>/dev/null; then
  log "تثبيت PM2..."
  npm install -g pm2
  pm2 startup
fi

# ── إعداد Firewall ──
log "إعداد جدار الحماية..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3001/tcp  # API (مؤقت حتى إعداد Nginx)
ufw --force enable

# ── إعداد Fail2Ban ──
log "إعداد Fail2Ban..."
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true
EOF
systemctl enable fail2ban && systemctl restart fail2ban

# ── مجلد المشروع ──
log "إعداد مجلد المشروع..."
mkdir -p /opt/najah-platform
chown -R $USER:$USER /opt/najah-platform

# ── SSL (Let's Encrypt) ──
warn "للحصول على SSL، شغّل بعد إعداد DNS:"
warn "  certbot --nginx -d najah-platform.iq -d www.najah-platform.iq -d api.najah-platform.iq"

# ── Nginx service ──
systemctl enable nginx

echo ""
echo "═══════════════════════════════════════════"
log "✅ تم الإعداد بنجاح!"
echo ""
echo "الخطوات التالية:"
echo "  1. انسخ ملفات المشروع إلى /opt/najah-platform"
echo "  2. أنشئ ملف .env من .env.example وعبّئ القيم"
echo "  3. شغّل: cd /opt/najah-platform && docker-compose up -d"
echo "  4. أعدّ DNS ثم احصل على SSL بـ certbot"
echo "═══════════════════════════════════════════"
