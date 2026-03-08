import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { CreateWishlistButton } from "./CreateWishlistButton";
import { ShareListButton } from "./ShareListButton";
import { Button, Card, Avatar } from "@/components/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin?callbackUrl=/dashboard");
  const token = (session as { backend_token?: string }).backend_token;
  if (!token) redirect("/auth/signin?callbackUrl=/dashboard");

  let wishlists: { id: number; title: string; slug: string; event_date: string | null; item_count: number; reserved_count: number }[] = [];
  try {
    const res = await fetch(`${API_URL}/api/wishlists`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) wishlists = await res.json();
  } catch {
    // ignore
  }

  return (
    <main className="min-h-screen bg-cream">
      <header className="border-b border-charcoal/8 bg-white/80 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="font-display text-xl text-charcoal">Дашборд</h1>
          <div className="flex items-center gap-3">
            <Avatar name={session.user?.name || session.user?.email || ""} size="sm" />
            <span className="text-sm text-charcoal/70 font-sans hidden sm:inline">
              {session.user?.email}
            </span>
            <a
              href="/api/auth/signout"
              className="text-sm text-coral hover:underline font-sans"
            >
              Выйти
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {wishlists.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto rounded-full bg-sage/20 flex items-center justify-center text-5xl mb-6">
              🎁
            </div>
            <h2 className="font-display text-2xl text-charcoal">
              Создай свой первый список
            </h2>
            <p className="mt-3 text-charcoal/70 font-sans max-w-sm mx-auto">
              На день рождения, свадьбу или просто так. Добавь ссылки на подарки — друзья смогут зарезервировать или скинуться.
            </p>
            <div className="mt-8">
              <CreateWishlistButton />
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-2">
              <p className="text-charcoal/70 font-sans">
                Создай новый или открой существующий список.
              </p>
              <CreateWishlistButton />
            </div>
            <p className="text-sm text-charcoal/60 font-sans mb-6">
              Друзья резервируют подарки по ссылке — нажми «Поделиться» на карточке и отправь им ссылку. Они откроют её и смогут забрать подарок или скинуться.
            </p>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {wishlists.map((wl) => (
                <li key={wl.id}>
                  <Link href={`/dashboard/lists/${wl.id}`} className="block">
                    <Card hover className="p-5 flex flex-col gap-3">
                      <div>
                        <span className="font-display text-lg text-charcoal">{wl.title}</span>
                        <span className="block text-sm text-charcoal/60 mt-1 font-sans">
                          {wl.item_count} позиций · зарезервировано {wl.reserved_count}
                        </span>
                      </div>
                      <ShareListButton slug={wl.slug} />
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
