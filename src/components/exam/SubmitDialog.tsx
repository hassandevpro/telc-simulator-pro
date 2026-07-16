"use client";

import { Button, Modal } from "@/components/ui";

export interface SubmitDialogProps {
  open: boolean;
  answeredCount: number;
  itemCount: number;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation de remise (ARCHITECTURE.md §2) — modale BLOQUANTE :
 * ni Échap ni clic extérieur, la décision doit être explicite.
 * La remise est définitive, comme au centre d'examen.
 */
export function SubmitDialog({
  open,
  answeredCount,
  itemCount,
  submitting,
  onCancel,
  onConfirm,
}: SubmitDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title="Prüfung abgeben" blocking>
      <p className="text-[13px]">
        Sie haben <span className="font-semibold">{answeredCount}</span> von{" "}
        <span className="font-semibold">{itemCount}</span> Aufgaben
        beantwortet.
      </p>
      <p className="mt-2 text-[13px] text-muted">
        Nach der Abgabe können Sie Ihre Antworten nicht mehr ändern. Diese
        Aktion kann nicht rückgängig gemacht werden.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Zurück zur Prüfung
        </Button>
        <Button variant="primary" onClick={onConfirm} disabled={submitting}>
          {submitting ? "Wird abgegeben…" : "Endgültig abgeben"}
        </Button>
      </div>
    </Modal>
  );
}
