import { type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const base =
  "inline-flex items-center justify-center rounded-(--radius) font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-mtg-green-500 text-mtg-white-950 hover:bg-mtg-green-400 px-5 py-2.5",
  secondary:
    "bg-mtg-white-900 text-mtg-white-200 border border-mtg-white-800 hover:bg-mtg-white-800 px-5 py-2.5",
  ghost:
    "text-mtg-white-400 hover:text-mtg-white-200 px-3 py-1.5",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props} />
  );
}
