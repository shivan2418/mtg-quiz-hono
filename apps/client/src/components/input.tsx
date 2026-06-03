import { forwardRef, type InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className = "", ...props }, ref) {
    return (
      <input
        ref={ref}
        className={`w-full px-4 py-3 rounded-(--radius) bg-mtg-white-900 border border-mtg-white-800 text-mtg-white-200 placeholder:text-mtg-white-500 outline-none focus:border-mtg-green-500 transition-colors ${className}`}
        {...props}
      />
    );
  },
);
