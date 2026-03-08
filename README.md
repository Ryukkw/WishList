# WishList

Вишлисты, которые не портят сюрприз.

## Phase 1 — Run locally

### Prerequisites

- Node.js 20+, npm
- Python 3.12+
- PostgreSQL 16 (or use Docker)

### 1. Backend + DB

**Option A: Docker (Postgres only)**

If you have Docker Compose v2 (e.g. `docker compose`):

```bash
docker compose up -d postgres
```

If you get "unknown shorthand flag: -d" or don’t have `docker compose`, use the hyphenated command or run Postgres directly:

```bash
docker-compose up -d postgres
# or, without compose:
docker run -d --name wishlist-postgres \
  -e POSTGRES_USER=wishlist -e POSTGRES_PASSWORD=wishlist -e POSTGRES_DB=wishlist \
  -p 5432:5432 postgres:16-alpine
```

Then run backend locally:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
cp ../.env.example ../.env  # then edit .env with DATABASE_URL, SECRET_KEY
export $(cat ../.env | grep -v '^#' | xargs)  # or use dotenv
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

**Option B: Full stack in Docker**

```bash
docker compose up --build
```

- Frontend: http://localhost:3000  
- Backend: http://localhost:8000  
- API docs: http://localhost:8000/docs  

### 2. Frontend

```bash
cp .env.example .env
# Set NEXTAUTH_SECRET (e.g. openssl rand -base64 32), NEXTAUTH_URL=http://localhost:3000, NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev
```

Open http://localhost:3000 — register, then go to dashboard.

### 3. Google OAuth (optional)

Add to `.env`:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Restart frontend. Sign-in page will show "Войти через Google".

## API (Phase 1)

- `POST /api/auth/register` — register (email, password, name?)
- `POST /api/auth/login` — login → `{ access_token, user }`
- `GET /api/wishlists` — list wishlists (Bearer token)
- `POST /api/wishlists` — create wishlist
- `PUT /api/wishlists/:id` — update
- `DELETE /api/wishlists/:id` — delete
- `GET/POST/PUT/DELETE /api/wishlists/:id/items` — CRUD items
- `PATCH /api/wishlists/:id/items/reorder` — body: `{ item_ids: number[] }`

Frontend uses NextAuth (JWT). After login, `session.backend_token` is sent as `Authorization: Bearer <token>` to the backend.
