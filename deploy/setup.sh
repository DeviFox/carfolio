#!/bin/bash
# One-time server setup for the Carvisio API (Ubuntu / Debian). Safe to
# re-run: existing keys and configs are kept.
#
# Usage (as root, from a copy of the deploy/ directory):
#   sudo bash setup.sh <certbot-email> <path-to-deploy-key.pub>
set -euo pipefail

DOMAIN=api.carvisio.pro
FRONT_URL=https://carvisio.pro
SRC="$(cd "$(dirname "$0")" && pwd)"

[ $# -eq 2 ] || { echo "usage: sudo bash $0 <certbot-email> <deploy-key.pub>" >&2; exit 1; }
[ "$(id -u)" -eq 0 ] || { echo "run as root (sudo)" >&2; exit 1; }
CERTBOT_EMAIL=$1
DEPLOY_PUBKEY=$(cat "$2")

step() { printf '\n==> %s\n' "$*"; }

step "packages"
apt-get update -q
DEBIAN_FRONTEND=noninteractive apt-get install -yq \
    nginx postgresql certbot python3-certbot-nginx gnupg lftp curl sudo

step "service user and directories"
id carfolio >/dev/null 2>&1 || useradd --system --home /opt/carfolio --shell /usr/sbin/nologin carfolio
install -d -o root -g root -m 755 /opt/carfolio
install -d -o root -g carfolio -m 750 /etc/carfolio

step "postgres: role and database"
# Peer authentication over the unix socket: the OS user "carfolio" logs in
# as the role "carfolio", so there is no database password to store.
sudo -u postgres psql -v ON_ERROR_STOP=1 -tAc \
    "SELECT 1 FROM pg_roles WHERE rolname = 'carfolio'" | grep -q 1 ||
    sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE ROLE carfolio LOGIN"
sudo -u postgres psql -v ON_ERROR_STOP=1 -tAc \
    "SELECT 1 FROM pg_database WHERE datname = 'carfolio'" | grep -q 1 ||
    sudo -u postgres createdb -O carfolio carfolio

step "api config"
if [ ! -f /etc/carfolio/api.env ]; then
    cat > /etc/carfolio/api.env <<EOF
DATABASE_URL=postgres://carfolio@/carfolio?host=/var/run/postgresql
HTTP_ADDR=127.0.0.1:8080
APP_URL=$FRONT_URL
COOKIE_SECURE=true
TRUST_PROXY=true
ALLOWED_ORIGINS=https://carvisio.pro,https://www.carvisio.pro
EOF
fi
chown root:carfolio /etc/carfolio/api.env
chmod 640 /etc/carfolio/api.env

step "systemd unit"
install -m 644 "$SRC/carfolio-api.service" /etc/systemd/system/carfolio-api.service
systemctl daemon-reload
systemctl enable carfolio-api
# The binary arrives with the first GitHub Actions deploy.
[ -x /opt/carfolio/carfolio-api ] && systemctl restart carfolio-api

step "deploy user for GitHub Actions"
id deploy >/dev/null 2>&1 || useradd --create-home --shell /bin/bash deploy
install -d -o deploy -g deploy -m 700 /home/deploy/.ssh
grep -qxF "$DEPLOY_PUBKEY" /home/deploy/.ssh/authorized_keys 2>/dev/null ||
    echo "$DEPLOY_PUBKEY" >> /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

install -m 755 "$SRC/carfolio-deploy" /usr/local/bin/carfolio-deploy
echo "deploy ALL=(root) NOPASSWD: /usr/local/bin/carfolio-deploy" > /etc/sudoers.d/carfolio-deploy
chmod 440 /etc/sudoers.d/carfolio-deploy
# A broken sudoers file can lock sudo for everyone: remove it if the check fails.
visudo -cf /etc/sudoers.d/carfolio-deploy || {
    rm -f /etc/sudoers.d/carfolio-deploy
    echo "!! sudoers check failed, rule removed" >&2
    exit 1
}

step "nginx"
# certbot edits the installed file; do not overwrite it once HTTPS is set up.
grep -q 'managed by Certbot' "/etc/nginx/sites-available/$DOMAIN" 2>/dev/null ||
    install -m 644 "$SRC/nginx-api.conf" "/etc/nginx/sites-available/$DOMAIN"
ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
nginx -t
systemctl reload nginx

step "https certificate"
if certbot --nginx -d "$DOMAIN" -m "$CERTBOT_EMAIL" \
        --agree-tos --non-interactive --redirect --keep-until-expiring; then
    echo "certificate ok"
else
    echo "!! certbot failed. Check that $DOMAIN points to this server, then re-run setup.sh" >&2
fi

step "backups"
install -m 755 "$SRC/carfolio-backup" /usr/local/bin/carfolio-backup
if [ ! -f /etc/carfolio/backup.passphrase ]; then
    (umask 077 && gpg --gen-random --armor 1 32 > /etc/carfolio/backup.passphrase)
    NEW_PASSPHRASE=1
fi
if [ ! -f /etc/carfolio/backup.env ]; then
    (umask 077 && cat > /etc/carfolio/backup.env <<'EOF'
# FTPS upload to the reg.ru hosting. Leave FTP_HOST empty for local-only backups.
# Use a directory OUTSIDE the website folders, so dumps are never web-accessible.
FTP_HOST=
FTP_USER=
FTP_PASS=
FTP_DIR=/backups/carfolio
EOF
    )
fi
echo "17 3 * * * root /usr/local/bin/carfolio-backup >> /var/log/carfolio-backup.log 2>&1" \
    > /etc/cron.d/carfolio-backup

step "done"
if [ "${NEW_PASSPHRASE:-}" = 1 ]; then
    echo
    echo "Backup encryption passphrase (SAVE IT OUTSIDE THIS SERVER, e.g. in a password manager):"
    cat /etc/carfolio/backup.passphrase
    echo "Without it the backups cannot be restored if this server is lost."
fi
echo
echo "Next: fill /etc/carfolio/backup.env, then run the 'Deploy API' workflow on GitHub."
