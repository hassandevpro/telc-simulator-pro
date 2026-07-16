import { TeilPage } from "@/components/exam/TeilPage";

export default async function LesenTeilPage({
  params,
}: {
  params: Promise<{ sessionId: string; teil: string }>;
}) {
  const { sessionId, teil } = await params;
  return <TeilPage sessionId={sessionId} sectionId="lesen" teil={teil} />;
}
