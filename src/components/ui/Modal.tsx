"use client";

import { useEffect, useRef, type ReactNode } from "react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Pied de modale : boutons de confirmation (Button du design system). */
  footer?: ReactNode;
  /**
   * Modale bloquante : ni Échap ni clic extérieur ne ferment
   * (ex. confirmation de remise, test audio obligatoire).
   */
  blocking?: boolean;
}

/**
 * Modale du design system : panneau blanc, bordure 1 px, aucune ombre,
 * voile neutre. Utilisée pour les confirmations (remise, audio).
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  blocking = false,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || blocking) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, blocking, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4"
      onMouseDown={(event) => {
        if (blocking) return;
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md border border-border bg-background rounded-sm"
      >
        <div className="border-b border-border px-4 py-2.5">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide">
            {title}
          </h2>
        </div>
        <div className="px-4 py-3">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-border px-4 py-2.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
