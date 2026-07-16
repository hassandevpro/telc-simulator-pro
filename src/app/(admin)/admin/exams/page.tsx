import { ExamsManager } from "@/components/admin";

export default function AdminExamsPage() {
  return (
    <section>
      <h1 className="text-xl font-semibold">Examens</h1>
      <p className="mt-1 text-[13px] text-muted">
        La structure officielle (Teile, barème) est dérivée automatiquement —
        vous ne créez que le contenu.
      </p>
      <div className="mt-4">
        <ExamsManager />
      </div>
    </section>
  );
}
