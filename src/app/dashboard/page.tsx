import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { getSession } from "@/app/lib/session";
import { getDashboardData } from "@/app/lib/dashboard";
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

const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border p-4">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      groupe: true,
      createdAt: true,
    },
  });
  if (!user) redirect("/login");

  const role = user.role as Role;
  const info = ROLE_INFO[role] ?? ROLE_INFO.ETUDIANT;

  let data: Awaited<ReturnType<typeof getDashboardData>> | null = null;
  try {
    data = await getDashboardData({
      id: user.id,
      role,
      groupe: user.groupe,
    });
  } catch (e) {
    console.error("Dashboard error:", e);
  }

  const max = data ? Math.max(1, ...data.distribution.map((d) => d.count)) : 1;

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bonjour, {user.name}</h1>
          <p className="text-sm text-gray-600">
            {user.email} ·{" "}
            <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-800">
              {info.label}
            </span>
            {user.groupe && <> · Groupe {user.groupe}</>}
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

      {!data && (
        <p role="alert" className="rounded border border-red-300 bg-red-50 p-4 text-red-800">
          Impossible de charger les indicateurs. Veuillez réessayer plus tard.
        </p>
      )}

      {data && role === "ETUDIANT" && (
        <section className="rounded border p-4">
          <h2 className="mb-2 font-semibold">Mon profil</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-gray-600">Nom</dt>
            <dd>{user.name}</dd>
            <dt className="text-gray-600">Email</dt>
            <dd>{user.email}</dd>
            <dt className="text-gray-600">Groupe</dt>
            <dd>{user.groupe ?? "Non défini"}</dd>
            <dt className="text-gray-600">Inscrit le</dt>
            <dd>{fmt(user.createdAt)}</dd>
          </dl>
        </section>
      )}

      {data && role !== "ETUDIANT" && (
        <>
          <section
            aria-label="Indicateurs"
            className="grid grid-cols-1 gap-4 sm:grid-cols-3"
          >
            <KpiCard label="Total étudiants" value={data.total} />
            <KpiCard label="Nouveaux (30 derniers jours)" value={data.recentCount} />
            <KpiCard label="Nombre de groupes" value={data.distribution.length} />
          </section>

          <section className="rounded border p-4">
            <h2 className="mb-3 font-semibold">Répartition par groupe</h2>
            {data.distribution.length === 0 ? (
              <p className="text-sm text-gray-600">Aucune donnée à afficher.</p>
            ) : (
              <ul className="space-y-2">
                {data.distribution.map((d) => (
                  <li key={d.groupe} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0">{d.groupe}</span>
                    <div className="h-4 flex-1 rounded bg-gray-200">
                      <div
                        className="h-4 rounded bg-blue-700"
                        style={{ width: `${(d.count / max) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 text-right font-medium">{d.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded border p-4">
            <h2 className="mb-3 font-semibold">Derniers étudiants</h2>
            {data.latest.length === 0 ? (
              <p className="text-sm text-gray-600">Aucun étudiant trouvé.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-gray-600">
                      <th className="py-2 pr-4">Nom</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Groupe</th>
                      <th className="py-2">Créé le</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.latest.map((s) => (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">{s.name}</td>
                        <td className="py-2 pr-4">{s.email}</td>
                        <td className="py-2 pr-4">{s.groupe ?? "—"}</td>
                        <td className="py-2">{fmt(s.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <StudentsPanel role={role} />
    </main>
  );
}