import Link from "next/link";

export default function ListNotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#faf7f2]">
      <h1 className="font-display text-2xl text-[#1c1c1e] mb-2">
        Такой вишлист не найден
      </h1>
      <p className="text-[#1c1c1e]/70 font-sans mb-6">
        Может, ссылка устарела или её скопировали с ошибкой.
      </p>
      <Link
        href="/"
        className="px-4 py-2 rounded-lg font-sans font-medium bg-[#E8604A] text-white hover:opacity-90 transition-opacity"
      >
        На главную
      </Link>
    </main>
  );
}
