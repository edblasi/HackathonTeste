export type StatusBadgeColor = "green" | "blue" | "amber" | "red";

interface StatusBadgeProps {
  label: string;
  color: StatusBadgeColor;
}

const colorClasses: Record<StatusBadgeColor, string> = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
};

const dotClasses: Record<StatusBadgeColor, string> = {
  green: "bg-emerald-500",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export function StatusBadge({ label, color }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${colorClasses[color]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotClasses[color]}`} />
      {label}
    </span>
  );
}