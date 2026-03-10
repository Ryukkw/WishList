import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "../../../api/auth/[...nextauth]/auth-options";
import { WishlistEditorClient } from "./WishlistEditorClient";
import { Button } from "@/components/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default async function WishlistEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin?callbackUrl=/dashboard");
  const token = (session as { backend_token?: string }).backend_token;
  if (!token) redirect("/auth/signin?callbackUrl=/dashboard");

  const { id } = await params;
  const [wlRes, itemsRes] = await Promise.all([
    fetch(`${API_URL}/api/wishlists/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }),
    fetch(`${API_URL}/api/wishlists/${id}/items`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }),
  ]);
  if (!wlRes.ok) {
    if (wlRes.status === 404) notFound();
    redirect("/dashboard");
  }
  const wishlist = (await wlRes.json()) as {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    event_date: string | null;
    show_owner: boolean;
    show_reserved_to_owner: boolean;
    show_reserved_to_guests: boolean;
  };
  const items = itemsRes.ok
    ? ((await itemsRes.json()) as {
        id: number;
        title: string;
        url: string | null;
        price: number | string | null;
        image_url: string | null;
        type: string;
        target_amount: number | string | null;
        position: number;
        status: string;
        reservation_count: number;
        reserved_by?: string | null;
        contribution_total: number | string | null;
        contribution_percentage: number | null;
      }[])
    : [];

  return (
    <main className="min-h-screen bg-cream">
      <header className="border-b border-charcoal/8 bg-white/80 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-coral hover:underline font-sans text-sm">
            ← Дашборд
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/settings" className="text-sm text-charcoal/60 hover:text-charcoal font-sans">
              Настройки
            </Link>
            <span className="text-sm text-charcoal/60 font-sans">{session.user?.email}</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <WishlistEditorClient
          wishlistId={wishlist.id}
          slug={wishlist.slug}
          initialTitle={wishlist.title}
          initialDescription={wishlist.description ?? ""}
          initialEventDate={wishlist.event_date ?? ""}
          initialShowOwner={wishlist.show_owner}
          initialShowReservedToOwner={wishlist.show_reserved_to_owner}
          initialShowReservedToGuests={wishlist.show_reserved_to_guests}
          initialItems={items}
          token={token}
        />
      </div>
    </main>
  );
}
