import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { getSession } from "@/app/lib/session";
import type { Role } from "@/app/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import StudentsPanel from "@/components/StudentsPanel";

const ROLE_INFO: Record<Role, { label: string; actions: string[] }> = {
  ADMIN: {
    label: "Administrateur",
    actions: [
      "Lister les étudiants",
      "Créer un étudiant",
      "Modifier un étudiant",
      "Supprimer un étudiant",
    ],
  },
  ENSEIGNANT: {
    label: "Enseignant",
    actions: ["Lister les étudiants", "Modifier le nom d'un étudiant"],
  },
  ETUDIANT: {
    label: "Étudiant",
    actions: ["Consulter son propre profil"],
  },
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) redirect("/login");

  const role = user.role as Role;
  const info = ROLE_INFO[role] ?? ROLE_INFO.ETUDIANT;

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bonjour, {user.name}</h1>
          <p className="text-sm text-gray-500">
            {user.email} ·{" "}
            <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-800">
              {info.label}
            </span>
          </p>
        </div>
        <LogoutButton />
      </header>

      <section className="rounded border p-4">
        <h2 className="mb-2 font-semibold">Vos actions disponibles</h2>
        <ul className="list-disc pl-5 text-sm">
          {info.actions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </section>

      <StudentsPanel role={role} />
    </main>
  );
}