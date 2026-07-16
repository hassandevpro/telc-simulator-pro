import { redirect } from "next/navigation";
import { requireCenterAdmin } from "@/lib/admin-guard";
import { CenterManager } from "@/components/center/CenterManager";

/** Espace de gestion d'un centre — CENTER_ADMIN ou propriétaire d'un centre. */
export default async function CenterPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const session = await requireCenterAdmin();
  if (!session) {
    redirect("/dashboard");
  }
  const { payment } = await searchParams;

  return (
    <section>
      <h1 className="text-xl font-semibold">Mein Zentrum</h1>
      <p className="mt-1 text-[13px] text-muted">
        Verwalten Sie Ihre Studierenden und deren Zugang.
      </p>
      <div className="mt-4">
        <CenterManager paymentSuccess={payment === "success"} />
      </div>
    </section>
  );
}
