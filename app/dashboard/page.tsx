import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { CreateWishlistButton } from "./CreateWishlistButton";

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
    <main className="min-h-screen p-6">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-xl font-bold">Дашборд</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{session.user?.email}</span>
          <a href="/api/auth/signout" className="text-sm text-indigo-600 hover:underline">
            Выйти
          </a>
        </div>
      </header>
      <p className="text-gray-600">
        Создай свой первый список — на день рождения, свадьбу или просто так.
      </p>
      <CreateWishlistButton />
      {wishlists.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">Мои вишлисты</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {wishlists.map((wl) => (
              <li key={wl.id}>
                <Link
                  href={`/dashboard/lists/${wl.id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:border-indigo-400 hover:bg-gray-50"
                >
                  <span className="font-medium">{wl.title}</span>
                  <span className="block text-sm text-gray-500 mt-1">
                    {wl.item_count} позиций · зарезервировано {wl.reserved_count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
