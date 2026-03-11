#!/bin/bash
# Deploy FindPro backend to Hetzner (178.104.4.77)
# Usage: ./deploy/deploy.sh
# Requires: rsync, ssh. Uses SSH key from SERVER-SETUP.md so deploy works the same as manual Option B.
#
# What this does (safe for production):
# - Rsync: copies code only; excludes node_modules and .env (server .env is never touched).
# - npm install --production: updates dependencies from package.json.
# - prisma migrate deploy: applies only pending migrations (no-op if none).
# - pm2 restart: brief restart (~few seconds). Does NOT run seed (no data deletion).
# - Seed is never run by this script. To delete mock data and demo pro account (run once after deploy):
#     ssh -i ~/.ssh/id_ed25519_hetzner root@178.104.4.77 "cd /root/findpro-backend && npx prisma db seed"

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVER="root@178.104.4.77"
REMOTE_PATH="/root/findpro-backend"
# Same key as in deploy/SERVER-SETUP.md (ssh -i ~/.ssh/id_ed25519_hetzner root@178.104.4.77)
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519_hetzner}"
SSH_OPTS=(-o "StrictHostKeyChecking=accept-new")
[[ -f "$SSH_KEY" ]] && SSH_OPTS=(-i "$SSH_KEY" "${SSH_OPTS[@]}")

echo "Deploying findpro-backend to $SERVER..."
rsync -avz -e "ssh ${SSH_OPTS[*]}" --exclude node_modules --exclude .env "$BACKEND_DIR/" "$SERVER:$REMOTE_PATH/"
echo "Running install, migrate, restart..."
ssh "${SSH_OPTS[@]}" "$SERVER" "cd $REMOTE_PATH && npm install --production && npx prisma migrate deploy && npx prisma generate && pm2 restart findpro-api"
echo "Done. API: https://api.findpro.co.za/api/health"
