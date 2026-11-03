import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { requireRole } from "@/app/lib/auth";
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

  const body = await req.json().catch(() => null);
  const schema =
    auth.user.role === "ADMIN"
      ? updateStudentAdminSchema
      : updateStudentTeacherSchema;
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const target = await prisma.user.findFirst({
    where: { id, role: "ETUDIANT" },
    select: { id: true },
  });
  if (!target) return notFound();

  const data: { name?: string; email?: string; password?: string } = {
    ...parsed.data,
  };
  if (data.password) data.password = await bcrypt.hash(data.password, 10);

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