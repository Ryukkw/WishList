import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "../../../api/auth/[...nextauth]/route";

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
  const res = await fetch(`${API_URL}/api/wishlists/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    if (res.status === 404) notFound();
    redirect("/dashboard");
  }
  const wishlist = (await res.json()) as {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    event_date: string | null;
  };

  return (
    <main className="min-h-screen p-6">
      <header className="flex justify-between items-center mb-6">
        <Link href="/dashboard" className="text-indigo-600 hover:underline">
          ← Дашборд
        </Link>
        <span className="text-sm text-gray-600">{session.user?.email}</span>
      </header>
      <h1 className="text-xl font-bold mb-2">{wishlist.title}</h1>
      <p className="text-sm text-gray-500 mb-4">
        Ссылка для друзей:{" "}
        <span className="font-mono text-gray-700">
          {process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/list/{wishlist.slug}
        </span>
      </p>
      <p className="text-gray-600">Здесь будет редактор позиций (добавление, перетаскивание).</p>
    </main>
  );
}
