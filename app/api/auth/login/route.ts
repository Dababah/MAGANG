import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators/auth";

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data login tidak valid" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findFirst({
    where: { employee: { nipp: parsed.data.nipp } },
    include: { employee: true },
  });
  const now = new Date();

  if (!user || !user.aktif || !user.employee.aktif) {
    return NextResponse.json(
      { error: "NIPP atau kata sandi tidak sesuai" },
      { status: 401 },
    );
  }
  if (user.lockedUntil && user.lockedUntil > now) {
    return NextResponse.json(
      {
        error:
          "Akun Anda sementara terkunci karena terlalu banyak percobaan login yang gagal.",
      },
      { status: 423 },
    );
  }

  const validPassword = await verifyPassword(
    parsed.data.password,
    user.passwordHash,
  );
  if (!validPassword) {
    await prisma.$transaction(async (transaction) => {
      const currentTime = new Date();
      const updated = await transaction.user.updateMany({
        where: {
          id: user.id,
          OR: [{ lockedUntil: null }, { lockedUntil: { lte: currentTime } }],
        },
        data: { failedAttempts: { increment: 1 } },
      });
      if (!updated.count) return;

      const latestUser = await transaction.user.findUnique({
        where: { id: user.id },
        select: { failedAttempts: true },
      });
      if (latestUser && latestUser.failedAttempts >= MAX_ATTEMPTS) {
        await transaction.user.update({
          where: { id: user.id },
          data: {
            failedAttempts: 0,
            lockedUntil: new Date(Date.now() + LOCK_DURATION_MS),
          },
        });
      }
    });
    return NextResponse.json(
      { error: "NIPP atau kata sandi tidak sesuai" },
      { status: 401 },
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null },
  });
  await createSession(user.id);
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      aksi: "LOGIN",
      entitas: "User",
      entitasId: String(user.id),
    },
  });

  return NextResponse.json({ ok: true, redirectTo: "/" });
}
