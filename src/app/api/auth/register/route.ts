import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";
import { registerSchema } from "../../../lib/validation";
import { createSession } from "../../../lib/session";
import { isValidGroup } from "../../../lib/groups";
 
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }
  const { name, email, password } = parsed.data;

  // NEW: server-side validation of the group
  const groupe = body?.groupe;
  if (!isValidGroup(groupe)) {
    return NextResponse.json({ error: "Groupe invalide" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { email },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Cet email est déjà utilisé" },
      { status: 409 }
    );
  }

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    // NEW: groupe saved; role is NOT read from the client, so it stays "ETUDIANT"
    data: { name, email, password: hash, groupe },
  });

  await createSession(user.id);
  return NextResponse.json(
    { id: user.id, name: user.name, email: user.email },
    { status: 201 }
  );
}