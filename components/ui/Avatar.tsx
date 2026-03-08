interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-12 h-12 text-lg",
};

function initial(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function Avatar({ src, name, size = "md", className = "" }: AvatarProps) {
  const sizeClass = sizeClasses[size];
  if (src) {
    return (
      <img
        src={src}
        alt={name || ""}
        className={`rounded-full object-cover ${sizeClass} ${className}`}
      />
    );
  }
  return (
    <div
      className={`
        rounded-full bg-sage/30 text-charcoal font-sans font-medium
        flex items-center justify-center
        ${sizeClass}
        ${className}
      `}
    >
      {name ? initial(name) : "?"}
    </div>
  );
}
