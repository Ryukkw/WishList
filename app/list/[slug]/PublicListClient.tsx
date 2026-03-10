"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { Button, Card, Modal, Input, ProgressBar, Avatar } from "@/components/ui";
import { useWishlistRealtime, type RealtimeEvent } from "@/hooks/useWishlistRealtime";
import { resolveImageUrl } from "@/lib/imageUrl";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const GUEST_NAME_KEY = "wishlist_guest_name";
const GUEST_ID_KEY = "wishlist_guest_id";
function reservedKey(slug: string) {
  return `wishlist_reserved_${slug}`;
}
function getReservedIds(slug: string): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(reservedKey(slug));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function setReservedIds(slug: string, ids: number[]) {
  localStorage.setItem(reservedKey(slug), JSON.stringify(ids));
}

function getGuestId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = crypto.randomUUID?.() || `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

function getGuestName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(GUEST_NAME_KEY) || "";
}

type Item = {
  id: number;
  title: string;
  url: string | null;
  price: number | null;
  image_url: string | null;
  type: string;
  target_amount: number | null;
  reservation_count: number;
  contribution_total: number;
  contribution_percentage: number | null;
  reserved_by?: string | null;
};

type Props = {
  slug: string;
  title: string;
  description: string | null;
  eventDate: string | null;
  items: Item[];
  isOwner?: boolean;
  ownerName?: string | null;
  ownerAvatarUrl?: string | null;
  showReservedToGuests?: boolean;
};

export function PublicListClient({ slug, title, description, eventDate, items, isOwner = false, ownerName = null, ownerAvatarUrl = null, showReservedToGuests = false }: Props) {
  const [localTitle, setLocalTitle] = useState(title);
  const [localDescription, setLocalDescription] = useState(description ?? "");
  const [localEventDate, setLocalEventDate] = useState(eventDate);
  const [localOwnerName, setLocalOwnerName] = useState<string | null>(ownerName ?? null);
  const [localOwnerAvatarUrl, setLocalOwnerAvatarUrl] = useState<string | null>(ownerAvatarUrl ?? null);
  const [localShowReservedToGuests, setLocalShowReservedToGuests] = useState(showReservedToGuests);
  const [guestName, setGuestName] = useState("");
  const [guestId, setGuestId] = useState("");
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [reserveItem, setReserveItem] = useState<number | null>(null);
  const [contributeItem, setContributeItem] = useState<Item | null>(null);
  const [contribAmount, setContribAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reservedByMe, setReservedByMe] = useState<Set<number>>(new Set());
  const [localItems, setLocalItems] = useState(items);
  const [highlightItemId, setHighlightItemId] = useState<number | null>(null);
  const [deletedItemIds, setDeletedItemIds] = useState<Set<number>>(new Set());
  const [contributorNames, setContributorNames] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setLocalTitle(title);
    setLocalDescription(description ?? "");
    setLocalEventDate(eventDate);
    setLocalOwnerName(ownerName ?? null);
    setLocalOwnerAvatarUrl(ownerAvatarUrl ?? null);
    setLocalShowReservedToGuests(showReservedToGuests);
  }, [title, description, eventDate, ownerName, ownerAvatarUrl, showReservedToGuests]);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    const highlightId = "item_id" in event ? event.item_id : "item" in event ? event.item.id : null;
    if (highlightId != null) {
      setHighlightItemId(highlightId);
      setTimeout(() => setHighlightItemId(null), 2000);
    }
    switch (event.type) {
      case "gift_reserved":
        setLocalItems((prev) =>
          prev.map((i) =>
            i.id === event.item_id
              ? { ...i, reservation_count: event.reserved_count, reserved_by: event.reserved_by ?? i.reserved_by }
              : i
          )
        );
        break;
      case "gift_unreserved":
        setLocalItems((prev) =>
          prev.map((i) =>
            i.id === event.item_id ? { ...i, reservation_count: 0, reserved_by: null } : i
          )
        );
        break;
      case "contribution_added":
        setLocalItems((prev) =>
          prev.map((i) =>
            i.id === event.item_id
              ? {
                  ...i,
                  contribution_total: event.total_amount,
                  contribution_percentage: event.percentage,
                }
              : i
          )
        );
        break;
      case "item_deleted":
        setDeletedItemIds((prev) => new Set(prev).add(event.item_id));
        break;
      case "item_added": {
        const it = event.item;
        const next = {
          id: it.id,
          title: it.title,
          url: it.url,
          price: it.price != null ? Number(it.price) : null,
          image_url: it.image_url,
          type: it.type,
          target_amount: it.target_amount != null ? Number(it.target_amount) : null,
          reservation_count: it.reservation_count ?? 0,
          contribution_total: it.contribution_total != null ? Number(it.contribution_total) : 0,
          contribution_percentage: it.contribution_percentage ?? null,
          reserved_by: it.reserved_by ?? null,
        };
        setLocalItems((prev) => (prev.some((i) => i.id === next.id) ? prev : [...prev, next]));
        break;
      }
      case "item_updated": {
        const it = event.item;
        setLocalItems((prev) =>
          prev.map((i) =>
            i.id === it.id
              ? {
                  ...i,
                  title: it.title,
                  url: it.url,
                  price: it.price != null ? Number(it.price) : null,
                  image_url: it.image_url,
                  type: it.type,
                  target_amount: it.target_amount != null ? Number(it.target_amount) : null,
                  reservation_count: it.reservation_count ?? i.reservation_count,
                  contribution_total: it.contribution_total != null ? Number(it.contribution_total) : i.contribution_total,
                  contribution_percentage: it.contribution_percentage ?? i.contribution_percentage,
                  reserved_by: it.reserved_by ?? i.reserved_by,
                }
              : i
          )
        );
        break;
      }
      case "wishlist_updated":
        if (event.title !== undefined) setLocalTitle(event.title);
        if (event.description !== undefined) setLocalDescription(event.description ?? "");
        if (event.event_date !== undefined) setLocalEventDate(event.event_date);
        if (event.owner_name !== undefined) setLocalOwnerName(event.owner_name ?? null);
        if (event.owner_avatar_url !== undefined) setLocalOwnerAvatarUrl(event.owner_avatar_url ?? null);
        if (event.show_reserved_to_guests !== undefined) setLocalShowReservedToGuests(event.show_reserved_to_guests);
        break;
      case "items_reordered": {
        const ids = event.item_ids;
        setLocalItems((prev) => {
          const byId = new Map(prev.map((i) => [i.id, i]));
          const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as Item[];
          const rest = prev.filter((i) => !ids.includes(i.id));
          return ordered.length > 0 ? [...ordered, ...rest] : prev;
        });
        break;
      }
    }
  }, []);

  const { connected } = useWishlistRealtime(slug, { onEvent: handleRealtimeEvent });

  useEffect(() => {
    const name = getGuestName();
    const id = getGuestId();
    setGuestId(id);
    setGuestName(name);
    if (!name.trim()) setNameModalOpen(true);
    setReservedByMe(new Set(getReservedIds(slug)));
  }, [slug]);

  useEffect(() => {
    if (!contributeItem) {
      setContributorNames([]);
      return;
    }
    let cancelled = false;
    fetch(`${API_URL}/api/public/${slug}/social`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.items) return;
        const item = data.items.find((i: { id: number }) => i.id === contributeItem.id);
        setContributorNames(item?.contributor_names ?? []);
      })
      .catch(() => setContributorNames([]));
    return () => { cancelled = true; };
  }, [slug, contributeItem]);

  function saveName() {
    const trimmed = guestName.trim() || "Гость";
    localStorage.setItem(GUEST_NAME_KEY, trimmed);
    setGuestName(trimmed);
    setNameModalOpen(false);
  }

  async function handleReserve(itemId: number) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/public/${slug}/items/${itemId}/reserve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guest_name: guestName.trim() || "Гость",
            guest_identifier: guestId,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (data as { detail?: string }).detail || "Не удалось зарезервировать";
        setError(msg);
        if (res.status === 409) {
          setLocalItems((prev) =>
            prev.map((i) =>
              i.id === itemId ? { ...i, reservation_count: 1 } : i
            )
          );
        }
        setLoading(false);
        return;
      }
      setReserveItem(null);
      const next = new Set(reservedByMe).add(itemId);
      setReservedByMe(next);
      setReservedIds(slug, Array.from(next));
      setLocalItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, reservation_count: 1 } : i
        )
      );
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      setToast("Успешно зарезервировано");
      setTimeout(() => setToast(null), 2500);
    } catch {
      setError("Ошибка сети");
    }
    setLoading(false);
  }

  async function handleUnreserve(itemId: number) {
    setLoading(true);
    try {
      await fetch(
        `${API_URL}/api/public/${slug}/items/${itemId}/reserve`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guest_identifier: guestId }),
        }
      );
      const next = new Set(reservedByMe);
      next.delete(itemId);
      setReservedByMe(next);
      setReservedIds(slug, Array.from(next));
      setLocalItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, reservation_count: 0 } : i
        )
      );
    } catch {
      // ignore
    }
    setLoading(false);
  }

  async function handleContribute() {
    if (!contributeItem || !contribAmount || parseFloat(contribAmount) <= 0) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/public/${slug}/items/${contributeItem.id}/contribute`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guest_name: guestName.trim() || "Гость",
            guest_identifier: guestId,
            amount: parseFloat(contribAmount),
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { detail?: string }).detail || "Не удалось добавить вклад");
        setLoading(false);
        return;
      }
      setContributeItem(null);
      setContribAmount("");
      setToast("Вклад добавлен");
      setTimeout(() => setToast(null), 2500);
      // Don't update localItems here — WebSocket contribution_added will update it.
      // Otherwise we'd add the amount twice (optimistic + WS from same action).
    } catch {
      setError("Ошибка сети");
    }
    setLoading(false);
  }

  return (
    <>
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] py-3 px-5 rounded-lg bg-[#8BAF8B] text-white font-sans font-medium shadow-lg" role="status">
          {toast}
        </div>
      )}
      <Modal open={nameModalOpen} onClose={() => {}} title="Как тебя зовут?">
        <p className="text-charcoal/70 text-sm mb-3">
          Чтобы зарезервировать подарок или скинуться, введи имя — так друзья не перепутают.
        </p>
        <Input
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="Имя"
          onKeyDown={(e) => e.key === "Enter" && saveName()}
        />
        <div className="mt-4">
          <Button variant="primary" onClick={saveName} disabled={!guestName.trim()}>
            Готово
          </Button>
        </div>
      </Modal>

      <Modal
        open={reserveItem !== null}
        onClose={() => !loading && setReserveItem(null)}
        title="Забрать подарок себе"
      >
        {reserveItem !== null && (
          <>
            <p className="text-charcoal/70 text-sm mb-3">Отображаемое имя:</p>
            <p className="font-medium text-charcoal mb-4">{guestName || "Гость"}</p>
            {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => !loading && setReserveItem(null)}>
                Отмена
              </Button>
              <Button
                variant="primary"
                onClick={() => handleReserve(reserveItem)}
                disabled={loading}
              >
                {loading ? "…" : "Забрать"}
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={contributeItem !== null}
        onClose={() => !loading && (setContributeItem(null), setContribAmount(""), setError(""))}
        title="Скинуться на подарок"
      >
        {contributeItem && (
          <>
            <p className="text-[#1c1c1e]/80 text-sm mb-1">Твоё имя: {guestName || "Гость"}</p>
            <p className={`text-sm text-[#1c1c1e]/70 ${contributorNames.length > 0 ? "mb-1" : "mb-3"}`}>
              Собрано {contributeItem.contribution_total.toLocaleString("ru-RU")} ₽ из{" "}
              {contributeItem.target_amount?.toLocaleString("ru-RU")} ₽
            </p>
            {contributorNames.length > 0 && (
              <p className="text-xs text-[#1c1c1e]/60 mb-3">
                Уже скидываются: {contributorNames.join(", ")}
              </p>
            )}
            <Input
              label="Сумма (₽)"
              type="number"
              min="1"
              step="0.01"
              value={contribAmount}
              onChange={(e) => setContribAmount(e.target.value)}
            />
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            <div className="flex gap-2 mt-4">
              <Button variant="ghost" onClick={() => { setContributeItem(null); setContribAmount(""); }}>
                Отмена
              </Button>
              <Button
                variant="primary"
                onClick={handleContribute}
                disabled={loading || !contribAmount || parseFloat(contribAmount) <= 0}
              >
                {loading ? "…" : "Скинуться"}
              </Button>
            </div>
          </>
        )}
      </Modal>

      <div className="max-w-2xl mx-auto">
        {isOwner && (
          <div className="mb-4 py-2.5 px-4 rounded-lg bg-[#E8604A]/15 text-[#1c1c1e] font-sans text-sm border border-[#E8604A]/30">
            Ты смотришь как тебя видят гости
          </div>
        )}
        {!connected && (
          <p className="mb-2 text-xs text-[#1c1c1e]/50 font-sans">обновляется…</p>
        )}
        <header className="mb-8">
          <h1 className="font-display text-3xl text-charcoal">{localTitle}</h1>
          <div className="flex items-center gap-3 mt-3 p-3 rounded-xl bg-white/60 border border-charcoal/8">
            <Avatar
              src={resolveImageUrl(localOwnerAvatarUrl, API_URL)}
              name={localOwnerName || undefined}
              size="lg"
            />
            <div>
              <p className="text-xs font-sans text-charcoal/50 uppercase tracking-wide">
                Список от
              </p>
              <p className="font-sans font-medium text-charcoal">
                {localOwnerName || "именинника"}
              </p>
            </div>
          </div>
          {localEventDate && (
            <p className="text-charcoal/60 font-sans mt-1">
              {new Date(localEventDate).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
          {localDescription != null && localDescription.trim() !== "" && (
            <section className="mt-3">
              <h2 className="text-sm font-medium text-charcoal/70 font-sans mb-0.5">Описание</h2>
              <p className="text-charcoal/80 font-sans text-sm whitespace-pre-wrap">{localDescription.trim()}</p>
            </section>
          )}
        </header>

        {localItems.length === 0 ? (
          <p className="text-charcoal/70 font-sans">
            Список пока пуст — именинник скоро добавит желания 🎁
          </p>
        ) : (
          <ul className="space-y-4">
            {localItems.map((item) => (
              <li key={item.id}>
                <Card
                  className={`p-4 transition-all duration-300 ${
                    highlightItemId === item.id ? "ring-2 ring-[#E8604A] ring-offset-2 ring-offset-[#faf7f2]" : ""
                  }`}
                >
                  {deletedItemIds.has(item.id) ? (
                    <div className="flex gap-4">
                      {item.image_url && (
                        <img
                          src={resolveImageUrl(item.image_url, API_URL) ?? ""}
                          alt=""
                          className="w-20 h-20 object-cover rounded-lg flex-shrink-0 opacity-60"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h2 className="font-display text-lg text-[#1c1c1e]/70">{item.title}</h2>
                        <p className="text-sm text-[#1c1c1e]/60 mt-2">
                          Этот товар был удалён из вишлиста. Если ты уже перевёл деньги — уточни у именинника.
                        </p>
                      </div>
                    </div>
                  ) : (
                  <div className="flex gap-4">
                    {item.image_url && (
                      <img
                        src={resolveImageUrl(item.image_url, API_URL) ?? ""}
                        alt=""
                        className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h2 className="font-display text-lg text-charcoal">{item.title}</h2>
                      {item.price != null && (
                        <p className="text-sm text-charcoal/70 mt-0.5">
                          {item.price.toLocaleString("ru-RU")} ₽
                        </p>
                      )}
                      {item.type === "solo" && (
                        <>
                          {item.reservation_count > 0 ? (
                            reservedByMe.has(item.id) ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="text-sm text-sage">Ты забрал(а) этот подарок</span>
                                <Button
                                  variant="ghost"
                                  onClick={() => handleUnreserve(item.id)}
                                  disabled={loading}
                                >
                                  Освободить
                                </Button>
                              </div>
                            ) : (
                              <p className="text-sm text-charcoal/50 mt-2">
                                {localShowReservedToGuests && item.reserved_by
                                  ? `Зарезервировано — ${item.reserved_by}`
                                  : "Уже занят"}
                              </p>
                            )
                          ) : (
                            <Button
                              variant="primary"
                              className="mt-3"
                              onClick={() => setReserveItem(item.id)}
                              disabled={nameModalOpen}
                            >
                              Забираю себе
                            </Button>
                          )}
                        </>
                      )}
                      {item.type === "group" && (
                        <div className="mt-3">
                          <ProgressBar
                            value={item.contribution_total}
                            max={item.target_amount || 100}
                            showLabel
                          />
                          <p className="text-xs text-charcoal/60 mt-1">
                            Собрано {item.contribution_total.toLocaleString("ru-RU")} ₽ из{" "}
                            {item.target_amount?.toLocaleString("ru-RU")} ₽
                            {item.contribution_percentage != null &&
                              item.contribution_percentage >= 100 && " 🎉"}
                          </p>
                          <Button
                            variant="secondary"
                            className="mt-2"
                            onClick={() => setContributeItem(item)}
                            disabled={nameModalOpen}
                          >
                            Скинуться
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-10 text-center text-sm text-charcoal/60 font-sans">
          <Link href="/" className="text-coral hover:underline">
            Создать свой вишлист
          </Link>
        </p>
      </div>
    </>
  );
}
