import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { getSession } from "./session";

export const ROLES = ["ADMIN", "ENSEIGNANT", "ETUDIANT"] as const;
export type Role = (typeof ROLES)[number];

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
};

type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; response: NextResponse };

function fail(error: string, status: number): AuthResult {
  return { ok: false, response: NextResponse.json({ error }, { status }) };
}

export async function requireRole(
  rolesAutorises: readonly Role[]
): Promise<AuthResult> {
  // 1. Session JWT valide ?
  const session = await getSession();
  if (!session) return fail("Non authentifié", 401);

  // 2. Le rôle vient de la base, jamais du client
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) return fail("Non authentifié", 401); // compte supprimé

  // 3. Rôle valide et autorisé ?
  const role = user.role as Role;
  if (!ROLES.includes(role) || !rolesAutorises.includes(role)) {
    return fail("Accès interdit", 403);
  }

  return { ok: true, user: { ...user, role } };
}