import { type HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: CardProps) {
  return (
    <div
      className={`bg-mtg-white-900 border border-mtg-white-800 rounded-(--radius) p-6 ${className}`}
      {...props}
    />
  );
}
