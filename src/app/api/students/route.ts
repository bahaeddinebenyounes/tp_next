import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { requireRole } from "@/app/lib/auth";
import { registerSchema } from "@/app/lib/validation";
import { publicStudentSelect, isUniqueError } from "@/app/lib/students";

export async function GET() {
  const auth = await requireRole(["ADMIN", "ENSEIGNANT", "ETUDIANT"]);
  if (!auth.ok) return auth.response;

  // Un étudiant ne voit que lui-même
  if (auth.user.role === "ETUDIANT") {
    const me = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: publicStudentSelect,
    });
    return NextResponse.json(me ? [me] : []);
  }

  const students = await prisma.user.findMany({
    where: { role: "ETUDIANT" },
    select: publicStudentSelect,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(students);
}

export async function POST(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }
  const { name, email, password } = parsed.data;

  try {
    const student = await prisma.user.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(password, 10),
        role: "ETUDIANT", // forcé côté serveur
      },
      select: publicStudentSelect,
    });
    return NextResponse.json(student, { status: 201 });
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