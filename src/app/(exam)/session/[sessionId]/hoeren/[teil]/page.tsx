import { TeilPage } from "@/components/exam/TeilPage";

export default async function HoerenTeilPage({
  params,
}: {
  params: Promise<{ sessionId: string; teil: string }>;
}) {
  const { sessionId, teil } = await params;
  return <TeilPage sessionId={sessionId} sectionId="hoeren" teil={teil} />;
}
