"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Modal, Input } from "@/components/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const EVENT_TYPES = [
  { value: "", label: "Другое", emoji: "✨" },
  { value: "День рождения", label: "День рождения", emoji: "🎂" },
  { value: "Новый год", label: "Новый год", emoji: "🎄" },
  { value: "Свадьба", label: "Свадьба", emoji: "💍" },
] as const;

export function CreateWishlistButton() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function closeModal() {
    setOpen(false);
    setTitle("");
    setEventType("");
    setEventDate("");
    setDescription("");
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
      const payload: { title: string; description?: string; event_date?: string } = {
        title: title.trim(),
      };
      const descParts = [description.trim(), eventType.trim()].filter(Boolean);
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
          <div>
            <label className="block text-sm font-medium text-[#1c1c1e]/80 mb-1">Повод</label>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map(({ value, label, emoji }) => (
                <button
                  key={value || "other"}
                  type="button"
                  onClick={() => setEventType(value)}
                  className={`px-3 py-2 rounded-lg border text-sm font-sans transition-colors ${
                    eventType === value
                      ? "border-[#E8604A] bg-[#E8604A]/10 text-[#1c1c1e]"
                      : "border-[#1c1c1e]/15 bg-white text-[#1c1c1e]/80 hover:border-[#1c1c1e]/30"
                  }`}
                >
                  {emoji} {label}
                </button>
              ))}
            </div>
          </div>
          <Input
            label="Дата (необязательно)"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            disabled={loading}
          />
          <Input
            label="Описание (необязательно)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Кратко о событии"
            disabled={loading}
          />
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
