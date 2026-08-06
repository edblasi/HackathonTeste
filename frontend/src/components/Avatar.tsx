interface AvatarProps {
  initials: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-lg",
};

export function Avatar({ initials, size = "md" }: AvatarProps) {
  return (
    <div
      className={`${sizes[size]} rounded-full bg-primary text-primary-foreground font-semibold flex items-center justify-center flex-shrink-0`}
      aria-label={`Avatar for ${initials}`}
    >
      {initials}
    </div>
  );
}