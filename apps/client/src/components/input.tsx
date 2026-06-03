import { type InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      className={`w-full px-4 py-3 rounded-(--radius) bg-mtg-white-900 border border-mtg-white-800 text-mtg-white-200 placeholder:text-mtg-white-500 outline-none focus:border-mtg-green-500 transition-colors ${className}`}
      {...props}
    />
  );
}
