"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Button, Modal } from "@/components/ui";
import { ShareListButton } from "./ShareListButton";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Wishlist = {
  id: number;
  title: string;
  slug: string;
  event_date: string | null;
  item_count: number;
  reserved_count: number;
};

type Props = { wl: Wishlist; token: string };

export function DashboardWishlistCard({ wl, token }: Props) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/wishlists/${wl.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDeleteOpen(false);
        setMenuOpen(false);
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card hover className="p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/dashboard/lists/${wl.id}`} className="block group flex-1 min-w-0">
            <div>
              <span className="font-display text-lg text-charcoal group-hover:text-coral transition-colors">
                {wl.title}
              </span>
              <span className="block text-sm text-charcoal/60 mt-1 font-sans">
                {wl.item_count} позиций · зарезервировано {wl.reserved_count}
              </span>
            </div>
          </Link>
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen((open) => !open);
              }}
              className="p-2 rounded-lg text-charcoal/60 hover:text-charcoal hover:bg-charcoal/10 transition-colors"
              aria-label="Ещё"
              aria-expanded={menuOpen}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <circle cx="12" cy="6" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="18" r="1.5" />
              </svg>
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1 py-1 min-w-[140px] rounded-lg bg-white border border-charcoal/10 shadow-lg z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(false);
                    setDeleteOpen(true);
                  }}
                  className="w-full text-left px-4 py-2 text-sm font-sans text-red-600 hover:bg-red-50 rounded-none first:rounded-t-lg"
                >
                  Удалить
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ShareListButton slug={wl.slug} />
        </div>
      </Card>

      <Modal
        open={deleteOpen}
        onClose={() => !deleting && setDeleteOpen(false)}
        title="Удалить список?"
      >
        <p className="text-charcoal/80 font-sans text-sm mb-4">
          Список «{wl.title}» будет удалён безвозвратно. Все позиции и резервы пропадут. Продолжить?
        </p>
        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setDeleteOpen(false)}
            disabled={deleting}
          >
            Отмена
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleting ? "Удаляю…" : "Удалить"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
