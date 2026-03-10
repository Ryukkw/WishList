# WishList App — Step-by-Step Development Todo

Structured approach derived from [WishList_Spec.md](./WishList_Spec.md). Follow phases in order; within each phase, complete steps sequentially.

---

## Phase 1: Foundation (Schema + Auth + CRUD API)

**Goal:** Project runs, DB exists, users can sign in and manage wishlists.

### 1.1 Project initialization

- [x] Create Next.js 14 project with TypeScript, Tailwind CSS, ESLint.
- [x] Create FastAPI project in `/backend` with async SQLAlchemy + PostgreSQL.
- [x] Add `docker-compose.yml`: services for `postgres`, `backend`, `frontend`.
- [x] Create `.env.example` with: `DATABASE_URL`, `SECRET_KEY`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_API_URL`, Google OAuth client ID/secret, etc.

### 1.2 Database schema

- [x] **users:** `id`, `email`, `password_hash`, `name`, `avatar_url`, `created_at`.
- [x] **wishlists:** `id`, `user_id`, `title`, `slug`, `description`, `event_date`, `is_public`, `created_at`.
- [x] **wishlist_items:** `id`, `wishlist_id`, `title`, `url`, `price`, `image_url`, `description`, `type` (solo | group), `target_amount`, `position`, `status` (active | deleted), `created_at`.
- [x] **reservations:** `id`, `item_id`, `guest_name`, `guest_identifier`, `created_at`.
- [x] **contributions:** `id`, `item_id`, `guest_name`, `guest_identifier`, `amount`, `created_at`.
- [x] Add indexes: `wishlists.slug`, `wishlist_items.wishlist_id`.
- [x] Set up Alembic; create and run initial migration.

### 1.3 Authentication

- [x] Implement NextAuth.js: Credentials provider (email + bcrypt), Google OAuth.
- [x] JWT sessions in httpOnly cookies; `/api/auth/*` routes.
- [x] Middleware: protect `/dashboard/*` (redirect unauthenticated to login).
- [x] Backend or Next.js: `POST /api/auth/register` (email, password → create user, return session).
- [x] After registration → redirect to dashboard (not landing).

### 1.4 Owner API (FastAPI)

- [x] `POST /api/wishlists` — create wishlist; auto-generate slug from title + random suffix.
- [x] `GET /api/wishlists` — list current user's wishlists (JWT required).
- [x] `PUT /api/wishlists/:id` — update title, description, event_date; verify ownership.
- [x] `DELETE /api/wishlists/:id` — delete; verify ownership.
- [x] `POST /api/wishlists/:id/items` — add item; verify ownership.
- [x] `PUT /api/wishlists/:id/items/:item_id` — edit item; verify ownership.
- [x] `DELETE /api/wishlists/:id/items/:item_id` — soft delete item (keep contributions); verify ownership.
- [x] `PATCH /api/wishlists/:id/items/reorder` — accept positions array; verify ownership.
- [x] All endpoints: JWT auth + ownership checks.

---

## Phase 2: Public access & scraper

**Goal:** Guests can view lists by slug, reserve/contribute; owner can add items via URL scrape.

### 2.1 Public API (no auth for read; auth for owner view)

- [x] `GET /api/public/:slug` — wishlist + items + aggregated stats only (no guest names). For owner: use this or dedicated owner endpoint so owner never sees who reserved/contributed.
- [x] `GET /api/public/:slug/social` — for guest view: show other guests' names for contributions (to avoid duplicate names); never expose this data to owner. Use `X-Guest-Token` (or similar) to identify guest.
- [x] `POST /api/public/:slug/items/:item_id/reserve` — body: `guest_name`, `guest_identifier`.
- [x] `DELETE /api/public/:slug/items/:item_id/reserve` — body: `guest_identifier`.
- [x] `POST /api/public/:slug/items/:item_id/contribute` — body: `guest_name`, `guest_identifier`, `amount`.
- [x] Owner-specific endpoint: e.g. `GET /api/lists/:id/owner` — aggregated data only (counts, %, no names). (Owner uses existing `GET /api/wishlists/:id`.)

### 2.2 Autofill by URL (scraper)

- [x] `POST /api/scrape` — body: `{ url }`.
- [x] Use httpx (timeout 5s, browser-like User-Agent); extract: `og:title` or `<title>`, `og:image`, `og:description`.
- [x] Try price: `meta[property="product:price:amount"]`, JSON-LD schema.org/Product, regex for ₽/$/€.
- [x] Return `{ title, image_url, price, description }`; partial data OK; graceful errors.
- [x] Cache in Redis or in-memory LRU (e.g. 1 hour).

---

## Phase 3: UI (design system + pages)

**Goal:** Warm, editorial look; all main screens work.

### 3.1 Design system

- [x] Fonts: Playfair Display (headings), DM Sans (body) — Google Fonts.
- [x] Colors: cream `#FAF7F2`, charcoal `#1C1C1E`, coral `#E8604A`, sage `#8BAF8B`; extend Tailwind config.
- [x] Components in `/components/ui/`: Button (primary/secondary/ghost), Card, Modal, Input, Badge, ProgressBar, Avatar, Spinner.
- [x] Subtle animations: card hover lift, button press.

### 3.2 Pages

- [x] **Landing** `/app/page.tsx`: Hero “Вишлисты, которые не портят сюрприз”; 3 explainer blocks; CTA “Создать вишлист” (→ register if not authed).
- [x] **Dashboard** `/app/dashboard/page.tsx`: Header (avatar, logout), “Новый вишлист”, grid of wishlist cards (title, event date, item count, reserved count); empty state with illustration + “Создай свой первый список…”.
- [x] **Wishlist editor** `/app/dashboard/lists/[id]/page.tsx`: Editable title; share (copy link + QR); add item form + “Заполнить автоматически” (scrape); drag-to-reorder list; per item: image, title, price, type badge, aggregated status; owner sees “X зарезервировано”, “Собрано Y%” only (no names); actions: edit, delete (confirm if has contributions).
- [x] **Public view** `/app/list/[slug]/page.tsx`: Header (wishlist name, event date); guest name prompt (localStorage) “Как тебя зовут?”; item grid with status; free → “Забираю себе”; group → “Скинуться” + progress bar; reserved → “Уже занят” / “Ты забрал(а)”; deleted item notice; realtime updates (highlight changed card).

---

## Phase 4: Realtime

**Goal:** All viewers of a list see updates without refresh.

- [x] WebSocket: `WS /ws/list/:slug` (FastAPI or Supabase Realtime).
- [x] ConnectionManager: track connections per slug; broadcast to room on events.
- [x] Events: `gift_reserved`, `gift_unreserved`, `contribution_added`, `item_deleted` (payloads as in spec).
- [x] Client: custom hook `useWishlistRealtime(slug)`; auto-reconnect with exponential backoff.
- [x] UI: animate card updates (e.g. flash) when event received; multi-tab stays in sync.

---

## Phase 5: Modals & edge cases

**Goal:** All flows and edge cases from spec are covered.

### 5.1 Modals

- [x] **ReserveModal:** “Забрать подарок себе”; name (prefill from localStorage); confirm; success → confetti; if same guest reserved → “Освободить”.
- [x] **ContributeModal:** “Скинуться”; name, amount (₽); progress “X₽ из Y₽”; show other contributors’ names (not amounts); success → progress animation.
- [x] **DeleteItemModal (owner):** If has contributions → warning “друзья уже скидываются…”; “Отменить” / “Всё равно удалить”.
- [x] **CreateWishlistModal:** Title; event type (🎂/🎄/💍/✨); optional event date; optional description.

### 5.2 Edge cases (from spec §12)

- [x] Reserve race: already reserved → “Кто-то только что забрал этот подарок” + refresh.
- [x] Contribution over goal: allow; show “100%+” with 🎉.
- [x] Item deleted while guest has it open: WS → show deletion notice; disable reserve/contribute.
- [x] Guest name collision: use `guest_identifier` (e.g. UUID in localStorage) for dedup; display name for UI only.
when- [x] Empty public list: “Список пока пуст — именинник скоро добавит желания 🎁”.
- [x] Offline/WS disconnect: “обновляется…” indicator; silent reconnect.

---

## Phase 6: Deploy & polish

**Goal:** Production-ready and pleasant to use.

### 6.1 Deploy

- [x] Backend: Railway (Dockerfile); env: `DATABASE_URL`, `SECRET_KEY`, CORS origins.
- [x] Frontend: Vercel; env: `NEXT_PUBLIC_API_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
- [x] PostgreSQL: Railway managed (or same compose for staging).
- [x] CORS: allow Vercel domain in FastAPI.
- [x] `/health` on backend.
- [x] WSS for WebSocket through Railway proxy.
- [x] Rate limiting: `/api/scrape` and public POST endpoints.

### 6.2 Polish (spec §14)

- [x] OG image meta for public wishlist pages (link previews).
- [x] Favicon and app icons.
- [x] Loading skeletons for data-fetching states.
- [x] Error boundaries and friendly error pages.
- [x] 404 for unknown slug: “Такой вишлист не найден — может, ссылка устарела?”
- [ ] Smooth page transitions.
- [x] Toasts: “Успешно зарезервировано”, “Вклад добавлен”, etc.
- [ ] Full flow test: register → create list → add items (with scrape) → share link → reserve as guest → confirm owner sees no names.

---

## Priority summary (from spec)

| Order | Focus              | Tasks                          |
|-------|--------------------|--------------------------------|
| 1     | Foundation         | Init, Schema, Auth, Owner API  |
| 2     | Core features      | Public API + Scraper           |
| 3     | Basic UI           | Design system + Pages          |
| 4     | Realtime           | WebSocket + hook               |
| 5     | Finish UX          | Modals + Edge cases            |
| 6     | Ship               | Deploy + Polish                |

Use this file as the single checklist; tick off items as you implement. For exact field names, endpoints, and product rules, always refer to [WishList_Spec.md](./WishList_Spec.md).
