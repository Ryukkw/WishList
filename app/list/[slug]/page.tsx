import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { PublicListClient } from "./PublicListClient";
import { authOptions } from "../../api/auth/[...nextauth]/route";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Item = {
  id: number;
  title: string;
  url: string | null;
  price: number | null;
  image_url: string | null;
  type: string;
  target_amount: number | null;
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

  let isOwner = false;
  const session = await getServerSession(authOptions);
  const token = (session as { backend_token?: string } | null)?.backend_token;
  if (token) {
    try {
      const ownerRes = await fetch(`${API_URL}/api/public/${slug}/check-owner`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (ownerRes.ok) {
        const ownerData = (await ownerRes.json()) as { is_owner?: boolean };
        isOwner = ownerData.is_owner === true;
      }
    } catch {
      // ignore
    }
  }

  return (
    <main className="min-h-screen bg-cream py-8 px-4">
      <PublicListClient
        slug={data.slug}
        title={data.title}
        eventDate={data.event_date}
        items={data.items}
        isOwner={isOwner}
      />
    </main>
  );
}
