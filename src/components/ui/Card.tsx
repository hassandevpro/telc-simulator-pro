import type { HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Surface gris très clair (#fafafa) au lieu du fond blanc. */
  muted?: boolean;
}

/**
 * Conteneur du design system : bordure fine 1 px, fond blanc,
 * AUCUNE ombre (ARCHITECTURE.md §8).
 */
export function Card({ muted = false, className = "", ...props }: CardProps) {
  return (
    <div
      className={
        `border border-border rounded-sm ${muted ? "bg-surface" : "bg-background"} ` +
        className
      }
      {...props}
    />
  );
}
