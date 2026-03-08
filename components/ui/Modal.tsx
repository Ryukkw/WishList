"use client";

import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className = "" }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: "rgba(28, 28, 30, 0.55)" }}
      onClick={onClose}
    >
      <div
        className={`
          rounded-2xl shadow-xl max-h-[90vh] overflow-auto
          w-full max-w-md
          ${className}
        `}
        style={{ backgroundColor: "#faf7f2", color: "#1c1c1e" }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 className="font-display text-xl px-6 pt-6 pb-2" style={{ color: "#1c1c1e" }}>
            {title}
          </h2>
        )}
        <div className="px-6 pb-6 pt-2">{children}</div>
      </div>
    </div>
  );
}
