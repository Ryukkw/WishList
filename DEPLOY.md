# Deploy: WishList

## Backend (Railway)

1. Create a new project on [Railway](https://railway.app). Add **PostgreSQL** (managed).
2. Add a service from **Dockerfile** (use `backend/Dockerfile`; build context: `backend/`).
3. Set env vars:
   - `DATABASE_URL` — from Railway Postgres (use `postgresql+asyncpg://...`; replace `postgres://` with `postgresql+asyncpg://` if needed).
   - `SECRET_KEY` — e.g. `openssl rand -base64 32`
   - `CORS_ORIGINS` — your frontend URL, e.g. `https://your-app.vercel.app` (comma-separated for multiple).
4. Expose port **8000**; Railway will assign a public URL. Use that as `NEXT_PUBLIC_API_URL` for the frontend.
5. **WebSocket:** Railway supports WSS on the same host; ensure frontend uses `wss://` when `NEXT_PUBLIC_API_URL` is HTTPS.

## Frontend (Vercel)

1. Import the repo in [Vercel](https://vercel.com). Root is the Next.js app.
2. Set env vars:
   - `NEXT_PUBLIC_API_URL` — your Railway backend URL (e.g. `https://your-backend.up.railway.app`).
   - `NEXTAUTH_SECRET` — e.g. `openssl rand -base64 32`
   - `NEXTAUTH_URL` — your Vercel URL (e.g. `https://your-app.vercel.app`).
   - Optional: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` for Google OAuth.
3. Deploy. No custom build needed if root has `package.json` and `next.config.mjs`.

## CORS

Backend reads `CORS_ORIGINS` from env (comma-separated). For production set:

```env
CORS_ORIGINS=https://your-app.vercel.app
```

## Health

- Backend: `GET /health` → `{"status":"ok"}`. Use for Railway health checks.

## Rate limiting

- **Scrape:** 10 requests per minute per IP.
- **Public reserve/contribute:** 30 requests per minute per IP.
- 429 response with message in Russian when exceeded.
