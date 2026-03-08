interface SpinnerProps {
  size?: "sm" | "md";
  className?: string;
}

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  const sizeClass = size === "sm" ? "w-5 h-5 border-2" : "w-8 h-8 border-2";
  return (
    <div
      className={`
        rounded-full border-charcoal/20 border-t-coral animate-spin
        ${sizeClass}
        ${className}
      `}
    />
  );
}
