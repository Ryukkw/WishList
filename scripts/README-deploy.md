# Deploy WishList on your server

## 1. Copy the project to the server

From your laptop (project root):

```bash
# Option A: clone from Git
ssh root@85.239.34.243 "mkdir -p /opt && cd /opt && git clone https://github.com/YOUR_USER/WishList.git wishlist"

# Option B: rsync (no git on server)
rsync -avz --exclude node_modules --exclude .next --exclude backend/.venv --exclude .git . root@85.239.34.243:/opt/wishlist/
```

## 2. Run the deploy script

```bash
ssh root@85.239.34.243
cd /opt/wishlist
chmod +x scripts/deploy-server.sh
sudo bash scripts/deploy-server.sh
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

Then set `NEXTAUTH_URL` and `NEXT_PUBLIC_API_URL` in `.env.local` to `https://6693237-xl58731.twc1.net` and restart wishlist-web.
