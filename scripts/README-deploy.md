# Deploy WishList on your server

Repo: **https://github.com/Ryukkw/WishList**

## 1. SSH to the server and clone

```bash
ssh root@85.239.34.243
```

On the server:

```bash
apt-get update && apt-get install -y git
mkdir -p /opt && cd /opt
git clone https://github.com/Ryukkw/WishList.git wishlist
cd wishlist
```

## 2. Run the deploy script

```bash
chmod +x scripts/deploy-server.sh
sudo bash scripts/deploy-server.sh
```

(Or from your laptop in one go: `ssh root@85.239.34.243 "cd /opt && git clone https://github.com/Ryukkw/WishList.git wishlist && cd wishlist && chmod +x scripts/deploy-server.sh && sudo bash scripts/deploy-server.sh"`)

**Alternative: copy via rsync** (from your laptop, project root):

```bash
rsync -avz --exclude node_modules --exclude .next --exclude backend/.venv --exclude .git . root@85.239.34.243:/opt/wishlist/
```

Optional (set before running the script):

```bash
export DOMAIN=6693237-xl58731.twc1.net
export DB_PASSWORD=your_secure_db_password
sudo -E bash scripts/deploy-server.sh
```

## 3. Open the app

- **http://6693237-xl58731.twc1.net** — main site
- API: same host, paths `/api/`, `/uploads/`, `/ws/`

## 4. Useful commands

```bash
# Logs
journalctl -u wishlist-api -f
journalctl -u wishlist-web -f

# Restart after code change
cd /opt/wishlist && git pull   # or rsync again
cd backend && source .venv/bin/activate && alembic upgrade head
systemctl restart wishlist-api
cd /opt/wishlist && npm run build && systemctl restart wishlist-web
```

## 5. HTTPS (optional)

Install certbot and get a certificate:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d 6693237-xl58731.twc1.net
```

Then set `NEXTAUTH_URL` and `NEXT_PUBLIC_API_URL` in `.env.local` to `https://6693237-xl58731.twc1.net`. **For registration and login to work**, set `BACKEND_URL=http://127.0.0.1:8010` in `.env.local` so the Next.js server calls the API internally instead of via the public URL. Restart wishlist-web after changing env.
