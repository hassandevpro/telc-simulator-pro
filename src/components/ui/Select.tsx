import type { SelectHTMLAttributes } from "react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  options: SelectOption[];
  /** Libellé de l'option vide ("Bitte wählen…"). */
  placeholder?: string;
}

/**
 * Le dropdown officiel du simulateur — base de tous les Teile à menus
 * (Lesen Teil 1 et 3, Sprachbausteine Teil 1).
 * Élément <select> natif volontairement : fidélité aux logiciels d'examen
 * institutionnels, accessibilité clavier native, comportement identique
 * sur tous les postes de centre d'examen.
 */
export function Select({
  options,
  placeholder = "Bitte wählen…",
  className = "",
  ...props
}: SelectProps) {
  return (
    <select
      className={
        "border border-border bg-background text-foreground rounded-sm " +
        "px-2 py-1 text-[13px] transition-colors duration-100 " +
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent " +
        "disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted " +
        className
      }
      {...props}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          disabled={option.disabled}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}
