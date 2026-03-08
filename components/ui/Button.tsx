import { ButtonHTMLAttributes, CSSProperties, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[#E8604A] text-white hover:bg-[#E8604A]/90 active:scale-[0.98] shadow-sm",
  secondary:
    "bg-[#8BAF8B] text-[#1C1C1E] hover:bg-[#8BAF8B]/90 active:scale-[0.98] border border-[#1C1C1E]/10",
  ghost:
    "bg-transparent text-[#1C1C1E] hover:bg-[#1C1C1E]/5 active:scale-[0.98]",
};

const variantStyles: Record<Variant, CSSProperties> = {
  primary: { backgroundColor: "#E8604A", color: "#ffffff" },
  secondary: { backgroundColor: "#8BAF8B", color: "#1C1C1E" },
  ghost: {},
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", children, className = "", disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      style={variantStyles[variant]}
      className={`
        inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-lg font-sans font-medium
        transition-all duration-150 ease-out
        disabled:opacity-50 disabled:pointer-events-none
        ${variantClasses[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  )
);
Button.displayName = "Button";
