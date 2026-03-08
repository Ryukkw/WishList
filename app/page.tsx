import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">WishList</h1>
      <p className="mt-2 text-gray-600">Вишлисты, которые не портят сюрприз</p>
      <div className="mt-6">
        {session ? (
          <Link
            href="/dashboard"
            className="inline-block px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            В дашборд
          </Link>
        ) : (
          <Link
            href="/auth/register"
            className="inline-block px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Создать вишлист
          </Link>
        )}
      </div>
    </main>
  );
}
