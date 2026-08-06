import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-card rounded-xl border border-border shadow-sm ${className}`}
      style={{
        boxShadow:
          "0 1px 4px rgba(0,86,172,0.06), 0 4px 16px rgba(0,86,172,0.06)",
      }}
    >
      {children}
    </div>
  );
}