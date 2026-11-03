import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getSession } from "../../../lib/session";
 
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Non authentifié" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true,
              createdAt: true },
  });
  if (!user) {
    return NextResponse.json(
      { error: "Introuvable" }, { status: 404 });
  }
  return NextResponse.json(user);
}