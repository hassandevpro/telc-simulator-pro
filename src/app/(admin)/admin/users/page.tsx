import { UsersManager } from "@/components/admin";

export default function AdminUsersPage() {
  return (
    <section>
      <h1 className="text-xl font-semibold">Utilisateurs</h1>
      <div className="mt-4">
        <UsersManager />
      </div>
    </section>
  );
}
