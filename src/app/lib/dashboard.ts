import { prisma } from "@/app/lib/prisma";
import type { Role } from "@/app/lib/auth";
import type { Prisma } from "@prisma/client";

export type DashboardUser = {
  id: number;
  role: Role;
  groupe: string | null;
};

// Permissions are applied here, before any query.
function getScope(user: DashboardUser): Prisma.UserWhereInput {
  switch (user.role) {
    case "ADMIN":
      return { role: "ETUDIANT" };
    case "ENSEIGNANT":
      // No group assigned: match nothing instead of everything.
      return user.groupe
        ? { role: "ETUDIANT", groupe: user.groupe }
        : { id: -1 };
    default:
      return { id: user.id, role: "ETUDIANT" };
  }
}

// password is never selected.
const studentSelect = {
  id: true,
  name: true,
  email: true,
  groupe: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export async function getTotalStudents(where: Prisma.UserWhereInput) {
  return prisma.user.count({ where });
}

export async function getRecentStudentsCount(
  where: Prisma.UserWhereInput,
  days = 30
) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return prisma.user.count({
    where: { ...where, createdAt: { gte: since } },
  });
}

export async function getLatestStudents(
  where: Prisma.UserWhereInput,
  limit = 5
) {
  return prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: studentSelect,
  });
}

export async function getGroupDistribution(where: Prisma.UserWhereInput) {
  const rows = await prisma.user.groupBy({
    by: ["groupe"],
    where,
    _count: { _all: true },
  });
  return rows
    .map((r) => ({ groupe: r.groupe ?? "Sans groupe", count: r._count._all }))
    .sort((a, b) => b.count - a.count);
}

export async function getDashboardData(user: DashboardUser) {
  const where = getScope(user);
  const [total, recentCount, latest, distribution] = await Promise.all([
    getTotalStudents(where),
    getRecentStudentsCount(where),
    getLatestStudents(where),
    getGroupDistribution(where),
  ]);
  return { total, recentCount, latest, distribution };
}