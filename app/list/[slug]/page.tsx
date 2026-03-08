import Link from "next/link";
import { notFound } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Item = {
  id: number;
  title: string;
  url: string | null;
  price: number | null;
  image_url: string | null;
  description: string | null;
  type: string;
  target_amount: number | null;
  position: number;
  reservation_count: number;
  contribution_total: number;
  contribution_percentage: number | null;
};

type PublicWishlist = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  event_date: string | null;
  items: Item[];
};

export default async function PublicListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let data: PublicWishlist;
  try {
    const res = await fetch(`${API_URL}/api/public/${slug}`, { cache: "no-store" });
    if (!res.ok) {
      if (res.status === 404) notFound();
      throw new Error("Failed to load");
    }
    data = await res.json();
  } catch {
    notFound();
  }

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{data.title}</h1>
          {data.event_date && (
            <p className="text-gray-500 mt-1">
              {new Date(data.event_date).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </header>

        {data.items.length === 0 ? (
          <p className="text-gray-600">
            Список пока пуст — именинник скоро добавит желания 🎁
          </p>
        ) : (
          <ul className="space-y-4">
            {data.items.map((item) => (
              <li
                key={item.id}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
              >
                <div className="flex gap-4">
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt=""
                      className="w-20 h-20 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="font-medium text-gray-900">{item.title}</h2>
                    {item.price != null && (
                      <p className="text-sm text-gray-600">
                        {item.price.toLocaleString("ru-RU")} ₽
                      </p>
                    )}
                    {item.type === "group" && item.target_amount != null && (
                      <p className="text-sm text-gray-500 mt-1">
                        Собрано {item.contribution_total.toLocaleString("ru-RU")} ₽ из{" "}
                        {item.target_amount.toLocaleString("ru-RU")} ₽
                        {item.contribution_percentage != null &&
                          ` (${item.contribution_percentage}%)`}
                      </p>
                    )}
                    {item.reservation_count > 0 && item.type === "solo" && (
                      <p className="text-sm text-amber-600 mt-1">Уже зарезервировано</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-8 text-center text-sm text-gray-500">
          <Link href="/" className="text-indigo-600 hover:underline">
            Создать свой вишлист
          </Link>
        </p>
      </div>
    </main>
  );
}
