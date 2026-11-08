import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { canUserApproveStatement } from "@/lib/auth/scope";
import { approvalDecisionSchema } from "@/lib/validators/approval";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { error: "Silakan masuk untuk melanjutkan" },
      { status: 401 },
    );

  const { id: rawId } = await params;
  const statementId = Number(rawId);
  if (!Number.isSafeInteger(statementId) || statementId < 1) {
    return NextResponse.json(
      { error: "Nomor pernyataan tidak valid" },
      { status: 400 },
    );
  }

  const parsed = approvalDecisionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Keputusan tidak valid" },
      { status: 400 },
    );
  }

  const permission = await canUserApproveStatement(user, statementId, prisma);
  if (!permission.canApprove) {
    if (permission.reason === "Statement not found") {
      return NextResponse.json(
        { error: "Pernyataan tidak ditemukan" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "Anda tidak berwenang memproses pernyataan ini" },
      { status: 403 },
    );
  }
  const stage = permission.stage;
  if (!stage) {
    return NextResponse.json(
      { error: "Tahap persetujuan tidak dapat ditentukan" },
      { status: 409 },
    );
  }
  const expectedStatus = stage === 1 ? "DIAJUKAN" : "DISETUJUI_ATASAN";

  const nextStatus =
    parsed.data.keputusan === "TOLAK"
      ? "DITOLAK"
      : stage === 1
        ? "DISETUJUI_ATASAN"
        : "MENUNGGU_TANDA_TANGAN";

  try {
    const updated = await prisma.$transaction(
      async (transaction: Prisma.TransactionClient) => {
        const changed = await transaction.statement.updateMany({
          where: { id: statementId, status: expectedStatus },
          data: { status: nextStatus },
        });
        if (!changed.count) throw new Error("ALREADY_PROCESSED");

        const decision = await transaction.approval.create({
          data: {
            statementId,
            tahap: stage,
            approverId: user.employeeId,
            keputusan: parsed.data.keputusan,
            catatan: parsed.data.catatan || null,
          },
        });
        await transaction.auditLog.create({
          data: {
            userId: user.id,
            aksi:
              parsed.data.keputusan === "SETUJU"
                ? "SETUJUI_PERNYATAAN"
                : "TOLAK_PERNYATAAN",
            entitas: "Statement",
            entitasId: String(statementId),
            dataSebelum: { status: expectedStatus },
            dataSesudah: { status: nextStatus, tahap: stage },
          },
        });
        return decision;
      },
    );

    return NextResponse.json({ data: updated, status: nextStatus });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_PROCESSED") {
      return NextResponse.json(
        { error: "Pernyataan sudah diproses pengguna lain" },
        { status: 409 },
      );
    }
    throw error;
  }
}
