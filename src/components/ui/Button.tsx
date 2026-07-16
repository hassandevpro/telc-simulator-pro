import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

/**
 * Bouton du design system — logiciel d'examen officiel :
 * bordure 1 px, coins 2 px, aucune ombre, aucun dégradé,
 * transition 100 ms limitée aux états hover/focus.
 */
const base =
  "inline-flex items-center justify-center gap-2 border px-4 py-1.5 " +
  "text-[13px] font-medium rounded-sm transition-colors duration-100 " +
  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "border-accent bg-accent text-white hover:bg-[#1e40af]",
  secondary: "border-border bg-background text-foreground hover:bg-surface",
  ghost: "border-transparent bg-transparent text-foreground hover:bg-surface",
  danger: "border-danger bg-background text-danger hover:bg-[#fef2f2]",
};

export function Button({
  variant = "secondary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
