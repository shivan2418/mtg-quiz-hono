import { type HTMLAttributes } from "react";

type BadgeVariant = "default" | "success" | "error";

const variants: Record<BadgeVariant, string> = {
  default: "bg-mtg-white-800 text-mtg-white-300",
  success: "bg-mtg-green-900 text-mtg-green-400",
  error: "bg-mtg-red-900 text-mtg-red-400",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({
  variant = "default",
  className = "",
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-(--radius-sm) text-xs font-medium ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
