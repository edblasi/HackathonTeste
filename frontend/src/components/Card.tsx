import type { KeyboardEvent, ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  id?: string;
  onClick?: () => void;
  ariaLabel?: string;
}

export function Card({ children, className = "", id, onClick, ariaLabel }: CardProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      id={id}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      className={`bg-card rounded-xl border border-border shadow-sm ${onClick ? "cursor-pointer hover:border-primary/30 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/25" : ""} ${className}`}
      style={{
        boxShadow:
          "0 1px 4px rgba(0,86,172,0.06), 0 4px 16px rgba(0,86,172,0.06)",
      }}
    >
      {children}
    </div>
  );
}
