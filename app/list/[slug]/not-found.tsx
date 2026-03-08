import Link from "next/link";

export default function ListNotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <h1 className="text-xl font-bold text-gray-900 mb-2">
        Такой вишлист не найден
      </h1>
      <p className="text-gray-600 mb-6">
        Может, ссылка устарела или её скопировали с ошибкой.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
      >
        На главную
      </Link>
    </main>
  );
}
