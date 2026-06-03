import { Link as RouterLink, type LinkProps } from "react-router-dom";

type LinkVariant = "default" | "card";

const variants: Record<LinkVariant, string> = {
  default: "text-mtg-green-400 hover:text-mtg-green-300",
  card: "block p-4 bg-mtg-white-900 border border-mtg-white-800 rounded-(--radius) hover:border-mtg-white-700 transition-colors",
};

interface Props extends LinkProps {
  variant?: LinkVariant;
}

export function Link({ variant = "default", className = "", ...props }: Props) {
  return (
    <RouterLink
      className={`${variants[variant]} ${className}`}
      {...props}
    />
  );
}
