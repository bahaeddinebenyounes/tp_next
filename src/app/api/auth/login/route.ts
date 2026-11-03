import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";
import { loginSchema } from "../../../lib/validation";
import { createSession } from "../../../lib/session";
 
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email },
  });
    // Même message pour email inconnu ou mauvais mot de passe
  const ok = user
    ? await bcrypt.compare(password, user.password)
    : false;
  if (!user || !ok) {
    return NextResponse.json(
      { error: "Identifiants invalides" },
      { status: 401 }
    );
  }
 
  await createSession(user.id);
  return NextResponse.json({
    id: user.id, name: user.name, email: user.email,
  });
}