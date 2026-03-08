# WishList App — Product & Tech Spec для Cursor

## Продуктовые решения

### Авторизация
- Email + пароль (JWT). Google OAuth как плюс.
- После регистрации — сразу попадаешь в дашборд, не на лендинг.
- Нет подтверждения email на MVP (friction убран намеренно).

### Дашборд владельца
- Пустой вишлист встречает тебя: большая иллюстрация/иконка + текст "Создай свой первый список — на день рождения, свадьбу или просто так" + кнопка "Создать вишлист".
- У пользователя может быть несколько вишлистов (Др 2025, Новый год, Свадьба).
- Каждый вишлист показывает: название, дату события (опционально), количество позиций, сколько зарезервировано/собрано.

### Вишлист — управление позициями
- Поля товара: название, URL, цена, картинка (URL или загрузка), описание (опционально), тип: "подарить целиком" или "скинуться вместе".
- **Автозаполнение по ссылке**: вставляешь URL → бэкенд делает scraping (Open Graph / meta теги) → автоматически заполняет название, картинку, иногда цену. Кнопка "Заполнить автоматически" рядом с полем URL.
- Для режима "скинуться": обязательно указать целевую сумму. Минимального взноса нет — каждый вносит сколько хочет.
- Позиции можно переупорядочить drag-and-drop.
- Статусы позиции: свободно / зарезервировано / сбор идёт (X% собрано) / куплено.

### Публичная ссылка
- Формат: `app.com/list/[slug]` — slug генерируется автоматически из названия + random suffix, можно переименовать.
- Открывается **без регистрации**.
- Гость видит: карточки товаров, цену, картинку, статус (свободно/зарезервировано/идёт сбор).
- Гость **не видит** кто зарезервировал и кто сколько внёс.
- Чтобы зарезервировать или внести вклад — нужно ввести имя (не регистрация, просто "Как тебя называть?"). Имя сохраняется в localStorage.

### Резервирование подарка
- Кнопка "Забираю себе" → модалка с полем имени → подтверждение.
- После резервирования кнопка меняется на "Ты забрал(а) этот подарок" если то же имя из localStorage.
- Отменить резервирование можно (например, планы изменились) — кнопка "Освободить" в той же модалке.
- Владелец видит только: "1 подарок зарезервирован" без имён.

### Совместный сбор
- Кнопка "Скинуться" → модалка: имя + сумма вклада.
- Прогресс-бар: собрано X₽ из Y₽. Визуально заметный.
- Если сумма уже набрана — кнопка меняется на "Сбор завершён 🎉", но можно всё равно добавить ещё (переполнение ок).
- **Edge-case: товар удалили пока шёл сбор** — вклады не удаляются сразу. Показываем уведомление "Этот товар был удалён из вишлиста. Если ты уже перевёл деньги — уточни у именинника." Владелец видит, что позиция удалена, но в логе остаётся история взносов (для его же совести).
- Что если сумма не набралась — ничего страшного, сбор это не Kickstarter. Подарок можно купить частично или доложить самому имениннику.

### Реалтайм
- WebSocket (или Server-Sent Events как fallback).
- События: gift_reserved, gift_unreserved, contribution_added, gift_deleted.
- При получении события — карточка подарка анимированно обновляется без перезагрузки страницы.
- Если несколько вкладок открыты — все синхронизируются.

### Приватность владельца
- Бэкенд: отдельный endpoint для владельца (`/api/lists/:id/owner`) и для гостей (`/api/lists/:id/public`).
- Owner endpoint возвращает агрегированные данные: сколько зарезервировано, сколько собрано в % — без имён.
- Guest endpoint возвращает полные данные о вкладах (имена видны другим гостям, чтобы не дублировать взнос) но НЕ возвращается владельцу.

---

## Стек

```
Frontend:  Next.js 14 (App Router) + TypeScript + Tailwind CSS
Backend:   FastAPI (Python) или Next.js API Routes
Database:  PostgreSQL + Prisma (или SQLAlchemy для FastAPI)
Realtime:  WebSocket через FastAPI / или Supabase Realtime
Auth:      NextAuth.js (email+pass + Google OAuth)
Scraping:  Python: httpx + BeautifulSoup для OG-тегов
Deploy:    Railway / Render (бэк) + Vercel (фронт) или всё на Railway
```

---

## Задачи для Cursor

### 1. Инициализация проекта

```
Create a Next.js 14 project with TypeScript, Tailwind CSS, ESLint.
Create a FastAPI project in /backend with PostgreSQL via SQLAlchemy async.
Set up docker-compose.yml with postgres, backend, frontend services.
Create .env.example with all required variables.
```

### 2. База данных — схема

```
Design PostgreSQL schema with these tables:
- users (id, email, password_hash, name, avatar_url, created_at)
- wishlists (id, user_id, title, slug, description, event_date, is_public, created_at)
- wishlist_items (id, wishlist_id, title, url, price, image_url, description,
  type [solo|group], target_amount, position, status [active|deleted], created_at)
- reservations (id, item_id, guest_name, guest_identifier, created_at)
- contributions (id, item_id, guest_name, guest_identifier, amount, created_at)

Add indexes on wishlists.slug, wishlist_items.wishlist_id.
Create Alembic migrations.
```

### 3. Аутентификация

```
Implement NextAuth.js with:
- Credentials provider (email + bcrypt password)
- Google OAuth provider
- JWT sessions stored in httpOnly cookies
- /api/auth/* routes
- Middleware protecting /dashboard/* routes
- Registration endpoint POST /api/auth/register
```

### 4. API — вишлисты (owner)

```
Implement FastAPI endpoints:
- POST /api/wishlists — create wishlist, auto-generate slug from title
- GET /api/wishlists — list user's wishlists (auth required)
- PUT /api/wishlists/:id — update title/description/event_date
- DELETE /api/wishlists/:id — soft delete
- POST /api/wishlists/:id/items — add item
- PUT /api/wishlists/:id/items/:item_id — edit item
- DELETE /api/wishlists/:id/items/:item_id — soft delete item (keep contributions)
- PATCH /api/wishlists/:id/items/reorder — update positions array
All endpoints require JWT auth and verify ownership.
```

### 5. API — публичный доступ

```
Implement public endpoints (no auth required):
- GET /api/public/:slug — return wishlist with items and aggregated stats
  Items include: reservation count (not names), contribution total and percentage
  DO NOT return contributor names or reserver names in this endpoint
- GET /api/public/:slug/social — return for guest view: show other guests' names
  for contributions (so they don't duplicate) but HIDE from owner
  Use X-Guest-Token header to identify guests
- POST /api/public/:slug/items/:item_id/reserve — reserve a gift
  Body: { guest_name, guest_identifier }
- DELETE /api/public/:slug/items/:item_id/reserve — unreserve
  Body: { guest_identifier }
- POST /api/public/:slug/items/:item_id/contribute — add contribution
  Body: { guest_name, guest_identifier, amount }
```

### 6. Автозаполнение по ссылке

```
Implement POST /api/scrape endpoint:
- Accept { url } in body
- Use httpx to fetch the URL with timeout=5s and browser-like User-Agent
- Extract: og:title or <title>, og:image, og:description
- Try to extract price: look for meta[property="product:price:amount"],
  JSON-LD schema.org/Product, or regex patterns like \d+[,.]?\d*\s*[₽$€]
- Return { title, image_url, price, description }
- Handle errors gracefully: return partial data if some fields missing
- Cache results in Redis or simple in-memory LRU for 1 hour
```

### 7. Реалтайм — WebSocket

```
Implement WebSocket in FastAPI:
- Endpoint: WS /ws/list/:slug
- ConnectionManager class managing active connections per slug
- Broadcast events to all connections for a slug when:
  - gift reserved: { type: "gift_reserved", item_id, reserved_count }
  - gift unreserved: { type: "gift_unreserved", item_id }
  - contribution added: { type: "contribution_added", item_id, total_amount, percentage }
  - item deleted: { type: "item_deleted", item_id }
- Client reconnects automatically with exponential backoff
- Frontend: custom useWishlistRealtime(slug) hook
```

### 8. UI — Дизайн система

```
Create a design system with a warm, editorial aesthetic:
- Font: "Playfair Display" for headings, "DM Sans" for body (Google Fonts)
- Colors: warm cream background (#FAF7F2), deep charcoal (#1C1C1E),
  accent coral (#E8604A), soft sage (#8BAF8B)
- Components: Button (primary/secondary/ghost), Card, Modal, Input, Badge,
  ProgressBar, Avatar, Spinner
- All components in /components/ui/
- Use Tailwind with custom config for the color palette
- Add subtle animations: card hover lifts with shadow, buttons have tactile press effect
```

### 9. UI — Страницы

```
Build these Next.js pages:

/app/page.tsx — Landing page
- Hero: "Вишлисты, которые не портят сюрприз"
- Explain the concept in 3 blocks with icons
- CTA: Создать вишлист (→ register if not authed)
- Light, airy design

/app/dashboard/page.tsx — Dashboard
- Header with user avatar + logout
- Button "Новый вишлист"
- Grid of wishlist cards: title, event date, item count, reserved count
- Empty state with illustration and encouraging copy

/app/dashboard/lists/[id]/page.tsx — Wishlist editor
- Wishlist title (editable inline)
- Share button: copies public link + shows QR code
- Add item form with scrape button
- Drag-to-reorder item list
- Each item shows: image, title, price, type badge, aggregated status
- Item actions: edit, delete (with confirmation warning if has contributions)
- Owner sees "X зарезервировано" "Собрано Y%" but NOT who

/app/list/[slug]/page.tsx — Public wishlist view
- Beautiful header with wishlist name, event date
- Guest name prompt (if not in localStorage): warm modal "Как тебя зовут?"
- Item grid: image card, title, price, status badge
- Free items: "Забираю себе" button
- Group items: "Скинуться" button + progress bar showing amount collected
- Reserved items: grayed out "Уже занят" or "Ты забрал(а) этот"
- Deleted items: "Этот товар был удалён — уточни у именинника"
- Realtime updates animate in (flash highlight on changed card)
```

### 10. Модалки и UX-флоу

```
Build modal flows:

ReserveModal:
- Title: "Забрать подарок себе"
- Name field (pre-filled from localStorage)
- Confirm button
- Success state: confetti animation (use canvas-confetti package)
- If already reserved by this guest: show "Освободить" button instead

ContributeModal:
- Title: "Скинуться на подарок"
- Name field (pre-filled)
- Amount input with ₽ suffix, number only
- Show current progress: "Уже собрано X₽ из Y₽"
- Show other contributors names (not amounts): "Уже скидываются: Миша, Катя"
- Confirm button
- Success: show updated progress bar with animation

DeleteItemModal (for owner):
- If item has contributions: warn "На этот подарок уже скидываются друзья.
  Если удалишь — они увидят уведомление. Уверен?"
- Two buttons: "Отменить" and "Всё равно удалить"

CreateWishlistModal:
- Title input
- Event type selector (icons): 🎂 День рождения, 🎄 Новый год, 💍 Свадьба, ✨ Другое
- Event date picker (optional)
- Description (optional)
```

### 11. Адаптив и мобильные

```
Ensure full mobile responsiveness:
- All grids collapse to single column on mobile
- Modals are bottom sheets on mobile (slide up animation)
- Touch-friendly tap targets (min 44px)
- Item cards stack vertically with full-width buttons
- Dashboard uses horizontal scroll for wishlist cards on mobile
- Public page header is compact on mobile
- Test breakpoints: 375px, 768px, 1280px
```

### 12. Edge-кейсы

```
Handle these edge cases:
1. Guest tries to reserve already-reserved item (race condition):
   show error "Кто-то только что забрал этот подарок" and refresh item state
2. Contribution overfills goal:
   allow it, show "100%+" badge with 🎉
3. Item deleted while guest has it open:
   WS event triggers, card shows deletion notice, reserve/contribute buttons disabled
4. Guest name collision (two "Миши"):
   use guest_identifier (UUID in localStorage) for dedup, display name only for UI
5. Wishlist owner visits own public link:
   detect via auth and show owner banner "Ты смотришь как тебя видят гости"
6. Empty wishlist shared publicly:
   show "Список пока пуст — именинник скоро добавит желания 🎁"
7. Offline/WS disconnect:
   show subtle "обновляется..." indicator, reconnect silently
```

### 13. Деплой

```
Deploy configuration:
- Backend: Railway with Dockerfile, env vars for DATABASE_URL, SECRET_KEY, CORS origins
- Frontend: Vercel with NEXT_PUBLIC_API_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
- PostgreSQL: Railway managed postgres
- Set up CORS in FastAPI: allow Vercel domain
- Add /health endpoint to backend
- Configure custom domain if available
- Ensure WS connections work through Railway's proxy (use wss://)
- Add basic rate limiting on /api/scrape and public POST endpoints
```

### 14. Финальный polish

```
Final quality pass:
- Add og:image meta tags to public wishlist pages (for link previews in messengers)
- Favicon and app icons
- Loading skeletons for all data-fetching states
- Error boundaries with friendly error pages
- 404 page for unknown slugs: "Такой вишлист не найден — может, ссылка устарела?"
- Smooth page transitions
- Toast notifications for all actions (успешно зарезервировано, вклад добавлен)
- Test full flow: register → create list → add items → share link → reserve as guest → verify owner sees no names
```

---

## Приоритет задач

| # | Задача | Почему |
|---|--------|--------|
| 1 | Schema + Auth + CRUD API (2–4) | Без этого ничего нет |
| 2 | Public endpoints + scraper (5–6) | Core фича |
| 3 | Базовый UI (8–9) | Чтобы было что показать |
| 4 | Реалтайм (7) | Wow-эффект |
| 5 | Модалки + edge-кейсы (10–12) | Доведённость |
| 6 | Деплой + polish (13–14) | Финальный шаг |