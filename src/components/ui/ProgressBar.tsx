export interface ProgressBarProps {
  /** Valeur courante. */
  value: number;
  /** Maximum (défaut : 100). */
  max?: number;
  /** Libellé accessible. */
  label?: string;
  /** Barre en rouge (ex. temps restant critique). */
  danger?: boolean;
}

/**
 * Barre de progression sobre : piste grise, remplissage plein,
 * aucune animation décorative.
 */
export function ProgressBar({
  value,
  max = 100,
  label,
  danger = false,
}: ProgressBarProps) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className="h-1.5 w-full border border-border bg-surface rounded-sm"
    >
      <div
        className={`h-full ${danger ? "bg-danger" : "bg-accent"}`}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}
