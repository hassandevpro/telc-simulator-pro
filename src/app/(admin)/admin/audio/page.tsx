import { AudioLibrary } from "@/components/admin";

export default function AdminAudioPage() {
  return (
    <section>
      <h1 className="text-xl font-semibold">Audio</h1>
      <p className="mt-1 text-[13px] text-muted">
        Fichiers pour les Teile Hören. v1 : stockage local (public/uploads) —
        sur Vercel, brancher Vercel Blob ou S3.
      </p>
      <div className="mt-4">
        <AudioLibrary />
      </div>
    </section>
  );
}
