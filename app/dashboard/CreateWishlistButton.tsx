"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Modal, Input } from "@/components/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function CreateWishlistButton() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [description, setDescription] = useState("");
  const [showOwner, setShowOwner] = useState(false);
  type ReservedVisibility = "none" | "owner" | "guests" | "all";
  const [reservedVisibility, setReservedVisibility] = useState<ReservedVisibility>("owner");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function reservedToPayload(): { show_reserved_to_owner: boolean; show_reserved_to_guests: boolean } {
    switch (reservedVisibility) {
      case "none": return { show_reserved_to_owner: false, show_reserved_to_guests: false };
      case "owner": return { show_reserved_to_owner: true, show_reserved_to_guests: false };
      case "guests": return { show_reserved_to_owner: false, show_reserved_to_guests: true };
      case "all": return { show_reserved_to_owner: true, show_reserved_to_guests: true };
    }
  }

  function closeModal() {
    setOpen(false);
    setTitle("");
    setEventType("");
    setEventDate("");
    setDescription("");
    setShowOwner(false);
    setReservedVisibility("owner");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const token = (session as { backend_token?: string })?.backend_token;
    if (!token) {
      setError("Сессия истекла. Войдите снова.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const reserved = reservedToPayload();
      const payload: {
        title: string;
        description?: string;
        event_date?: string;
        show_owner?: boolean;
        show_reserved_to_owner?: boolean;
        show_reserved_to_guests?: boolean;
      } = {
        title: title.trim(),
        show_owner: showOwner,
        show_reserved_to_owner: reserved.show_reserved_to_owner,
        show_reserved_to_guests: reserved.show_reserved_to_guests,
      };
      const descParts = [eventType.trim(), description.trim()].filter(Boolean);
      if (descParts.length) payload.description = descParts.join(" · ");
      if (eventDate.trim()) {
        const d = new Date(eventDate);
        if (!isNaN(d.getTime())) payload.event_date = d.toISOString().slice(0, 10);
      }
      const res = await fetch(`${API_URL}/api/wishlists`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { detail?: string }).detail || "Не удалось создать список");
        setLoading(false);
        return;
      }
      closeModal();
      router.refresh();
      router.push(`/dashboard/lists/${(data as { id: number }).id}`);
    } catch {
      setError("Ошибка сети");
    }
    setLoading(false);
  }

  if (status === "loading") return null;

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Создать вишлист
      </Button>
      <Modal open={open} onClose={() => !loading && closeModal()} title="Новый вишлист">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Название"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: День рождения 2025"
            autoFocus
            disabled={loading}
          />
          <Input
            label="Повод (необязательно)"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            placeholder="День рождения, свадьба, Новый год…"
            disabled={loading}
          />
          <Input
            label="Дата (необязательно)"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            disabled={loading}
          />
          <div>
            <span className="block text-sm font-medium text-[#1c1c1e]/80 mb-2">Видимость</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  checked={!showOwner}
                  onChange={() => setShowOwner(false)}
                  className="rounded-full border-[#1c1c1e]/20"
                />
                <span className="text-sm font-sans">Анонимно</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  checked={showOwner}
                  onChange={() => setShowOwner(true)}
                  className="rounded-full border-[#1c1c1e]/20"
                />
                <span className="text-sm font-sans">Публично</span>
              </label>
            </div>
          </div>
          {showOwner && (
            <div className="space-y-2">
              <span className="block text-sm font-medium text-[#1c1c1e]/80 mb-2">Кому видно, кто зарезервировал подарок</span>
              <div className="flex flex-col gap-2">
                {[
                  { value: "all" as const, label: "Всем" },
                  { value: "guests" as const, label: "Всем, кроме меня" },
                  { value: "owner" as const, label: "Только мне" },
                ].map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="reservedVisibility"
                      checked={reservedVisibility === value}
                      onChange={() => setReservedVisibility(value)}
                      disabled={loading}
                      className="rounded-full border-[#1c1c1e]/20"
                    />
                    <span className="text-sm font-sans">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <section className="border-t border-[#1c1c1e]/10 pt-4">
            <label className="block text-sm font-medium text-[#1c1c1e]/80 mb-1">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Кратко о событии (необязательно)"
              disabled={loading}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-[#1c1c1e]/15 bg-white text-[#1c1c1e] font-sans text-sm resize-y"
            />
          </section>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={() => !loading && closeModal()}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" disabled={loading || !title.trim()}>
              {loading ? "Создаём…" : "Создать"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
