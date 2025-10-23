import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface UserAvatarProps {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function UserAvatar({ name, color, size = "md", className = "" }: UserAvatarProps) {
  const initials = name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sizeClasses = {
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-12 w-12 text-base",
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`} style={{ backgroundColor: color }}>
      <AvatarFallback className="text-white font-medium" style={{ backgroundColor: color }}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
