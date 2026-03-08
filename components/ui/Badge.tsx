type Variant = "default" | "coral" | "sage" | "muted";

interface BadgeProps {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  default: "bg-charcoal/10 text-charcoal",
  coral: "bg-coral/15 text-coral",
  sage: "bg-sage/20 text-charcoal",
  muted: "bg-charcoal/5 text-charcoal/70",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
