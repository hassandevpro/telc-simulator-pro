import { db } from "@/lib/db";
import { JoinCenter } from "@/components/center/JoinCenter";

/** Adhésion à un centre via un lien d'invitation contenant la clé. */
export default async function JoinByCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const center = await db.center
    .findUnique({ where: { inviteCode: code }, select: { name: true } })
    .catch(() => null);

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      {center ? (
        <JoinCenter code={code} centerName={center.name} />
      ) : (
        <p className="text-[13px] text-danger">
          Ungültiger oder abgelaufener Einladungslink.
        </p>
      )}
    </div>
  );
}
