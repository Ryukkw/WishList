import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = "", hover, ...props }: CardProps) {
  return (
    <div
      className={`
        bg-white rounded-xl border border-charcoal/8 shadow-card
        transition-all duration-200 ease-out
        ${hover ? "hover:shadow-card-hover hover:-translate-y-0.5" : ""}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
