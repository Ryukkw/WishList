interface ProgressBarProps {
  value: number; // 0–100+
  max?: number;
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  className = "",
  showLabel = false,
}: ProgressBarProps) {
  const pct = max && max > 0 ? Math.max(0, (value / max) * 100) : 0;
  const capped = Math.min(100, pct);
  return (
    <div className={`w-full ${className}`}>
      <div className="h-2 bg-[#1c1c1e]/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#8BAF8B] rounded-full transition-all duration-300 ease-out"
          style={{ width: `${capped}%` }}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-xs text-[#1c1c1e]/60 font-sans">
          {pct >= 100 ? "100%+ 🎉" : `${Math.round(pct)}%`}
        </p>
      )}
    </div>
  );
}
