import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { requireRole } from "@/app/lib/auth";
import { isValidGroup } from "@/app/lib/groups";

import {
  updateStudentAdminSchema,
  updateStudentTeacherSchema,
} from "@/app/lib/validation";
import {
  publicStudentSelect,
  parseId,
  isUniqueError,
} from "@/app/lib/students";

type Ctx = { params: Promise<{ id: string }> };
const ROLES = ["ADMIN", "ENSEIGNANT", "ETUDIANT"] as const;
const isValidRole = (v: unknown): v is (typeof ROLES)[number] =>
  typeof v === "string" && (ROLES as readonly string[]).includes(v);
const badId = () =>
  NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
const notFound = () =>
  NextResponse.json({ error: "Étudiant introuvable" }, { status: 404 });

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireRole(["ADMIN", "ENSEIGNANT", "ETUDIANT"]);
  if (!auth.ok) return auth.response;

  const id = parseId((await params).id);
  if (!id) return badId();

  // Protection IDOR : un étudiant ne lit que son propre profil
  if (auth.user.role === "ETUDIANT" && auth.user.id !== id) {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }

  const student = await prisma.user.findFirst({
    where: { id, role: "ETUDIANT" },
    select: publicStudentSelect,
  });
  return student ? NextResponse.json(student) : notFound();
}

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireRole(["ADMIN", "ENSEIGNANT"]);
  if (!auth.ok) return auth.response;

  const id = parseId((await params).id);
  if (!id) return badId();

  const isAdmin = auth.user.role === "ADMIN";

  const raw = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const { role: rawRole, groupe: rawGroupe, ...rest } = raw ?? {};

  // Only an admin may change role or groupe (server-side rule)
  if (!isAdmin && (rawRole !== undefined || rawGroupe !== undefined)) {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }

  // The schema only sees the fields it knows
  const schema = isAdmin
    ? updateStudentAdminSchema
    : updateStudentTeacherSchema;
  const parsed = schema.safeParse(raw ? rest : null);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  let role: (typeof ROLES)[number] | undefined;
  let groupe: string | null | undefined;
  if (rawRole !== undefined) {
    if (!isValidRole(rawRole)) {
      return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
    }
    role = rawRole;
  }
  if (rawGroupe !== undefined) {
    if (rawGroupe !== null && !isValidGroup(rawGroupe)) {
      return NextResponse.json({ error: "Groupe invalide" }, { status: 400 });
    }
    groupe = rawGroupe;
  }

  const target = await prisma.user.findFirst({
    where: { id, role: "ETUDIANT" },
    select: { id: true },
  });
  if (!target) return notFound();

  const data: {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    groupe?: string | null;
  } = { ...parsed.data };
  if (data.password) data.password = await bcrypt.hash(data.password, 10);
  if (role !== undefined) data.role = role;
  if (groupe !== undefined) data.groupe = groupe;

  try {
    const updated = await prisma.user.update({
      where: { id },
      data,
      select: publicStudentSelect,
    });
    return NextResponse.json(updated);
  } catch (e) {
    if (isUniqueError(e)) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé" },
        { status: 409 }
      );
    }
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const id = parseId((await params).id);
  if (!id) return badId();

  const target = await prisma.user.findFirst({
    where: { id, role: "ETUDIANT" },
    select: { id: true },
  });
  if (!target) return notFound();

  await prisma.user.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}