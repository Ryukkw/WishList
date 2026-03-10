"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#faf7f2]">
      <h1 className="font-display text-2xl text-[#1c1c1e] mb-2">
        Что-то пошло не так
      </h1>
      <p className="text-[#1c1c1e]/70 font-sans mb-6 text-center max-w-sm">
        Попробуй обновить страницу или вернуться на главную.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg font-sans font-medium bg-[#8BAF8B] text-white hover:opacity-90"
        >
          Попробовать снова
        </button>
        <Link
          href="/"
          className="px-4 py-2 rounded-lg font-sans font-medium border border-[#1c1c1e]/20 text-[#1c1c1e] hover:bg-[#1c1c1e]/5"
        >
          На главную
        </Link>
      </div>
    </main>
  );
}
