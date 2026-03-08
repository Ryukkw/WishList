"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Button, Card, Modal, Input, Badge, ProgressBar } from "@/components/ui";
import { useWishlistRealtime, type RealtimeEvent } from "@/hooks/useWishlistRealtime";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const APP_URL = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

type Item = {
  id: number;
  title: string;
  url: string | null;
  price: number | string | null;
  image_url: string | null;
  description?: string | null;
  type: string;
  target_amount: number | string | null;
  position: number;
  status: string;
  reservation_count: number;
  contribution_total: number | string | null;
  contribution_percentage: number | null;
};

type Props = {
  wishlistId: number;
  slug: string;
  initialTitle: string;
  initialItems: Item[];
  token: string;
};

export function WishlistEditorClient({
  wishlistId,
  slug,
  initialTitle,
  initialItems,
  token,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [items, setItems] = useState(initialItems);
  const [highlightItemId, setHighlightItemId] = useState<number | null>(null);
  useEffect(() => {
    setTitle(initialTitle);
    setItems(initialItems);
  }, [initialTitle, initialItems]);

  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    setHighlightItemId(event.item_id);
    setTimeout(() => setHighlightItemId(null), 2000);
    switch (event.type) {
      case "gift_reserved":
        setItems((prev) =>
          prev.map((i) =>
            i.id === event.item_id ? { ...i, reservation_count: event.reserved_count } : i
          )
        );
        break;
      case "gift_unreserved":
        setItems((prev) =>
          prev.map((i) =>
            i.id === event.item_id ? { ...i, reservation_count: 0 } : i
          )
        );
        break;
      case "contribution_added":
        setItems((prev) =>
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
        setItems((prev) => prev.filter((i) => i.id !== event.item_id));
        break;
    }
  }, []);

  const { connected } = useWishlistRealtime(slug, { onEvent: handleRealtimeEvent });

  const [shareOpen, setShareOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeMessage, setScrapeMessage] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formType, setFormType] = useState<"solo" | "group">("solo");
  const [formTarget, setFormTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [savedMessage, setSavedMessage] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; hasContrib: boolean } | null>(null);

  const publicLink = `${APP_URL}/list/${slug}`;

  async function copyLink() {
    await navigator.clipboard.writeText(publicLink);
    setShareOpen(false);
  }

  async function fillFromUrl() {
    const url = formUrl.trim();
    if (!url || !url.startsWith("http")) {
      setScrapeMessage("Вставь ссылку, начинающуюся с http:// или https://");
      return;
    }
    setScrapeMessage(null);
    setScraping(true);
    try {
      const res = await fetch(`${API_URL}/api/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = (data as { detail?: string }).detail;
        setScrapeMessage(detail || "Не удалось заполнить по ссылке");
        setScraping(false);
        return;
      }
      const hasAny = data.title || data.image_url || data.description != null || data.price != null;
      if (data.title) setFormTitle(data.title);
      if (data.image_url) setFormImage(data.image_url);
      if (data.description) setFormDesc(data.description);
      if (data.price != null) setFormPrice(String(data.price));
      if (!hasAny) {
        setScrapeMessage("По этой ссылке ничего не найдено. Заполни поля вручную.");
      } else {
        setScrapeMessage("Заполнено");
        setTimeout(() => setScrapeMessage(null), 2000);
      }
    } catch {
      setScrapeMessage("Ошибка сети. Проверь, что бэкенд запущен (порт 8000), и попробуй снова.");
    }
    setScraping(false);
  }

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const amount = formType === "group" ? (formTarget ? parseFloat(formTarget) : null) : (formPrice ? parseFloat(formPrice) : null);
    const payload = {
      title: formTitle.trim() || "Без названия",
      url: formUrl.trim() || null,
      price: amount,
      image_url: formImage.trim() || null,
      description: formDesc.trim() || null,
      type: formType,
      target_amount: formType === "group" ? amount : null,
    };
    try {
      if (editId) {
        const res = await fetch(
          `${API_URL}/api/wishlists/${wishlistId}/items/${editId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          }
        );
        if (res.ok) {
          router.refresh();
          setEditId(null);
          setAddOpen(false);
          setSavedMessage(true);
          setTimeout(() => setSavedMessage(false), 2500);
        }
      } else {
        const res = await fetch(`${API_URL}/api/wishlists/${wishlistId}/items`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          router.refresh();
          setAddOpen(false);
        }
      }
      resetForm();
    } catch {
      // ignore
    }
    setSaving(false);
  }

  function resetForm() {
    setFormTitle("");
    setFormUrl("");
    setFormPrice("");
    setFormImage("");
    setFormDesc("");
    setFormType("solo");
    setFormTarget("");
    setEditId(null);
    setScrapeMessage(null);
  }

  function openEdit(item: Item) {
    setEditId(item.id);
    setFormTitle(item.title);
    setFormUrl(item.url || "");
    const priceStr = item.price != null ? String(item.price) : "";
    const targetStr = item.target_amount != null ? String(item.target_amount) : "";
    setFormPrice(priceStr || targetStr);
    setFormImage(item.image_url || "");
    setFormDesc(item.description != null ? String(item.description) : "");
    setFormType(item.type as "solo" | "group");
    setFormTarget(targetStr || priceStr);
    setAddOpen(true);
  }

  async function deleteItem(itemId: number) {
    const res = await fetch(
      `${API_URL}/api/wishlists/${wishlistId}/items/${itemId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      setDeleteConfirm(null);
      router.refresh();
    }
  }

  async function reorder(moveIndex: number, direction: 1 | -1) {
    const newOrder = [...items];
    const swap = moveIndex + direction;
    if (swap < 0 || swap >= newOrder.length) return;
    [newOrder[moveIndex], newOrder[swap]] = [newOrder[swap], newOrder[moveIndex]];
    const itemIds = newOrder.map((i) => i.id);
    const res = await fetch(
      `${API_URL}/api/wishlists/${wishlistId}/items/reorder`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ item_ids: itemIds }),
      }
    );
    if (res.ok) {
      setItems(newOrder);
      router.refresh();
    }
  }

  async function saveTitle() {
    const res = await fetch(`${API_URL}/api/wishlists/${wishlistId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title: title.trim() }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 items-center mb-6">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          className="font-display text-2xl text-charcoal bg-transparent border-b border-transparent hover:border-charcoal/20 focus:border-coral focus:outline-none px-0 py-1 min-w-[200px]"
        />
        <Button variant="secondary" onClick={() => setShareOpen(true)}>
          Поделиться
        </Button>
        <Button variant="primary" onClick={() => { resetForm(); setAddOpen(true); }}>
          Добавить позицию
        </Button>
      </div>
      {!connected && (
        <p className="mb-4 text-xs text-[#1c1c1e]/50 font-sans">обновляется…</p>
      )}

      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Ссылка для друзей">
        <p className="text-charcoal/70 text-sm mb-2">Скопируй и отправь друзьям:</p>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={publicLink}
            className="flex-1 px-3 py-2 rounded-lg border border-charcoal/15 bg-white text-charcoal text-sm font-mono"
          />
          <Button variant="primary" onClick={copyLink}>Копировать</Button>
        </div>
        <p className="mt-3 text-xs text-charcoal/50">
          QR: <a href={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(publicLink)}`} target="_blank" rel="noopener noreferrer" className="text-coral hover:underline">открыть QR-код</a>
        </p>
      </Modal>

      <Modal
        open={addOpen || editId !== null}
        onClose={() => { setAddOpen(false); setEditId(null); resetForm(); }}
        title={editId ? "Редактировать позицию" : "Добавить позицию"}
      >
        <form onSubmit={saveItem} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[#1c1c1e]/80 mb-1">URL</label>
            <div className="flex gap-2">
              <Input
                placeholder="Ссылка на товар — можно заполнить автоматически"
                value={formUrl}
                onChange={(e) => { setFormUrl(e.target.value); setScrapeMessage(null); }}
                className="flex-1"
              />
              <Button type="button" variant="secondary" onClick={fillFromUrl} disabled={scraping || !formUrl.trim()}>
                {scraping ? "…" : "Заполнить"}
              </Button>
            </div>
            {scrapeMessage && (
              <p className={`mt-1.5 text-sm ${scrapeMessage.startsWith("Заполнено") ? "text-[#8BAF8B]" : "text-[#E8604A]"}`}>
                {scrapeMessage}
              </p>
            )}
          </div>
          <Input label="Название" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required />
          <div>
            <label className="block text-sm font-medium text-[#1c1c1e]/80 mb-1">Тип</label>
            <select
              value={formType}
              onChange={(e) => {
                const v = e.target.value as "solo" | "group";
                if (v === "group" && !formTarget) setFormTarget(formPrice);
                if (v === "solo" && !formPrice) setFormPrice(formTarget);
                setFormType(v);
              }}
              className="w-full px-3 py-2 rounded-lg border border-[#1c1c1e]/15 bg-white"
            >
              <option value="solo">Подарить целиком</option>
              <option value="group">Скинуться вместе</option>
            </select>
          </div>
          {formType === "solo" ? (
            <Input label="Цена (₽)" type="number" step="0.01" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} />
          ) : (
            <Input label="Целевая сумма (₽)" type="number" step="0.01" value={formTarget} onChange={(e) => setFormTarget(e.target.value)} />
          )}
          <Input label="Картинка (URL)" value={formImage} onChange={(e) => setFormImage(e.target.value)} />
          <Input label="Описание (необязательно)" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={() => { setAddOpen(false); setEditId(null); resetForm(); }}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Сохраняю…" : editId ? "Сохранить" : "Добавить"}
            </Button>
          </div>
        </form>
      </Modal>

      {deleteConfirm && (
        <Modal
          open
          onClose={() => setDeleteConfirm(null)}
          title="Удалить позицию?"
        >
          {deleteConfirm.hasContrib ? (
            <p className="text-charcoal/80 text-sm mb-4">
              На этот подарок уже скидываются друзья. Если удалишь — они увидят уведомление. Уверен?
            </p>
          ) : (
            <p className="text-charcoal/80 text-sm mb-4">Удалить эту позицию из списка?</p>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Отмена</Button>
            <Button variant="primary" onClick={() => deleteItem(deleteConfirm.id)} className="bg-red-600 hover:bg-red-700">
              Всё равно удалить
            </Button>
          </div>
        </Modal>
      )}

      {savedMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] py-3 px-5 rounded-lg bg-[#8BAF8B] text-white font-sans font-medium shadow-lg" role="status">
          Сохранено
        </div>
      )}

      <ul className="space-y-4">
        {items.map((item, index) => (
          <li key={item.id}>
            <Card
              className={`p-4 flex gap-4 flex-wrap sm:flex-nowrap transition-all duration-300 ${
                highlightItemId === item.id ? "ring-2 ring-[#E8604A] ring-offset-2 ring-offset-[#faf7f2]" : ""
              }`}
            >
              {item.image_url && (
                <img src={item.image_url} alt="" className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-charcoal">{item.title}</span>
                  <Badge variant={item.type === "group" ? "sage" : "default"}>
                    {item.type === "group" ? "Скинуться" : "Целиком"}
                  </Badge>
                </div>
                {item.price != null && (
                  <p className="text-sm text-charcoal/70 mt-0.5">{Number(item.price).toLocaleString("ru-RU")} ₽</p>
                )}
                {item.type === "solo" && item.reservation_count > 0 && (
                  <p className="text-sm text-sage mt-1">Зарезервировано</p>
                )}
                {item.type === "group" && item.target_amount != null && (
                  <div className="mt-2">
                    <ProgressBar
                      value={Number(item.contribution_total) || 0}
                      max={Number(item.target_amount)}
                      showLabel
                    />
                    <p className="text-xs text-charcoal/60 mt-0.5">
                      Собрано {Number(item.contribution_total || 0).toLocaleString("ru-RU")} ₽ из {Number(item.target_amount).toLocaleString("ru-RU")} ₽
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => reorder(index, -1)}
                  disabled={index === 0}
                  className="p-2 text-charcoal/60 hover:text-charcoal disabled:opacity-30"
                  aria-label="Поднять"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => reorder(index, 1)}
                  disabled={index === items.length - 1}
                  className="p-2 text-charcoal/60 hover:text-charcoal disabled:opacity-30"
                  aria-label="Опустить"
                >
                  ↓
                </button>
                <Button variant="ghost" onClick={() => openEdit(item)}>Изменить</Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setDeleteConfirm({
                      id: item.id,
                      hasContrib: Number(item.contribution_total) > 0,
                    })
                  }
                >
                  Удалить
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
      {items.length === 0 && (
        <p className="text-charcoal/60 font-sans py-8 text-center">
          Пока нет позиций. Нажми «Добавить позицию» и вставь ссылку на подарок — можно заполнить автоматически.
        </p>
      )}
    </>
  );
}
