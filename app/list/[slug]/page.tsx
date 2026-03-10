import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { PublicListClient } from "./PublicListClient";
import { authOptions } from "../../api/auth/[...nextauth]/auth-options";
import { resolveImageUrl } from "@/lib/imageUrl";

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
  reserved_by?: string | null;
};

type PublicWishlist = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  event_date: string | null;
  items: Item[];
  owner_name?: string | null;
  owner_avatar_url?: string | null;
  show_reserved_to_guests?: boolean;
};

async function fetchList(slug: string): Promise<PublicWishlist | null> {
  try {
    const res = await fetch(`${API_URL}/api/public/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await fetchList(slug);
  if (!data) {
    return { title: "Вишлист не найден | WishList" };
  }
  const title = `${data.title} | WishList`;
  const description = data.description || `Вишлист: ${data.title}. Выбери подарок или скинься с друзьями.`;
  const ogImageRaw = data.items.find((i) => i.image_url)?.image_url;
  const ogImage = resolveImageUrl(ogImageRaw ?? null, API_URL);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(ogImage && { images: [{ url: ogImage, width: 1200, height: 630 }] }),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PublicListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await fetchList(slug);
  if (!data) notFound();

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
        description={data.description ?? null}
        eventDate={data.event_date}
        items={data.items}
        isOwner={isOwner}
        ownerName={data.owner_name ?? null}
        ownerAvatarUrl={data.owner_avatar_url ?? null}
        showReservedToGuests={data.show_reserved_to_guests ?? false}
      />
    </main>
  );
}
