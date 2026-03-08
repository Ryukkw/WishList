"use client";

import { useState } from "react";

type Props = { slug: string };

export function ShareListButton({ slug }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/list/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.open(url, "_blank");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-sm font-sans font-medium py-1.5 px-3 rounded-lg border border-[#1C1C1E]/15 bg-white/80 hover:bg-[#faf7f2] text-[#1c1c1e] transition-colors"
    >
      {copied ? "Скопировано" : "Поделиться"}
    </button>
  );
}
