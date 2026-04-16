type ProfileAvatarProps = {
  username: string;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  xs: "h-9 w-9 text-sm",
  sm: "h-12 w-12 text-lg",
  md: "h-20 w-20 text-2xl",
  lg: "h-28 w-28 text-3xl",
} as const;

export function ProfileAvatar({
  username,
  avatarUrl,
  size = "md",
  className = "",
}: ProfileAvatarProps) {
  const initials = username
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        className={`${sizeClasses[size]} ${className} rounded-full border border-[var(--border)] object-cover shadow-sm`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} ${className} flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 font-semibold text-white shadow-[var(--shadow-lg)]`}
      aria-label={username}
    >
      {initials}
    </div>
  );
}
