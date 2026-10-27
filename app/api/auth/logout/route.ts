import { NextResponse } from "next/server";
import { destroySession, getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const user = await getCurrentUser();
  await destroySession();
  if (user) {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        aksi: "LOGOUT",
        entitas: "User",
        entitasId: String(user.id),
      },
    });
  }
  return NextResponse.json({ ok: true, redirectTo: "/login" });
}
