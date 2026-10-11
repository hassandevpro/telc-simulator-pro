import { notFound } from "next/navigation";
import { SessionsManager } from "@/components/admin";
import { requireAdmin } from "@/lib/admin-guard";

/** Support : sessions d'un candidat et remboursement manuel d'un crédit. */
export default async function AdminSessionsPage() {
  if (!(await requireAdmin())) notFound();
  return (
    <section>
      <h1 className="text-xl font-semibold">Sitzungen & Credit-Erstattung</h1>
      <p className="mt-1 max-w-2xl text-[13px] text-muted">
        Ein Credit wird beim Start der Prüfung abgebucht und nie automatisch
        erstattet. Hier kann er im Einzelfall (technisches Problem, Fehlstart)
        erstattet werden — einmal pro Sitzung, mit Begründung, protokolliert.
      </p>
      <div className="mt-4">
        <SessionsManager />
      </div>
    </section>
  );
}
