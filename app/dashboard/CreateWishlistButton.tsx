"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function CreateWishlistButton() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      const res = await fetch(`${API_URL}/api/wishlists`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: title.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { detail?: string }).detail || "Не удалось создать список");
        setLoading(false);
        return;
      }
      setOpen(false);
      setTitle("");
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
      >
        Создать вишлист
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !loading && setOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Новый вишлист</h2>
            <form onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: День рождения 2025"
                className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                autoFocus
                disabled={loading}
              />
              {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => !loading && setOpen(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading || !title.trim()}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? "Создаём…" : "Создать"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
