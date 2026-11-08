import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getVerificationQueueScope } from "@/lib/auth/scope";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Silakan masuk untuk melanjutkan" },
      { status: 401 },
    );
  }
  if (user.role !== "ADMIN_TI" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Hanya Admin TI yang dapat memverifikasi dokumen" },
      { status: 403 },
    );
  }

  const { id: rawId } = await params;
  const statementId = Number(rawId);
  if (!Number.isSafeInteger(statementId) || statementId < 1) {
    return NextResponse.json(
      { error: "Nomor pernyataan tidak valid" },
      { status: 400 },
    );
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const statement = await transaction.statement.findFirst({
        where: {
          ...getVerificationQueueScope(user),
          id: statementId,
        },
        select: { id: true },
      });
      if (!statement) throw new Error("VERIFICATION_NOT_ALLOWED");

      const signedDocument = await transaction.attachment.findFirst({
        where: { statementId, jenis: "DOKUMEN_TTD" },
        select: { id: true },
      });
      if (!signedDocument) throw new Error("SIGNED_DOCUMENT_MISSING");

      const changed = await transaction.statement.updateMany({
        where: { id: statementId, status: "MENUNGGU_VERIFIKASI" },
        data: { status: "SELESAI" },
      });
      if (!changed.count) throw new Error("VERIFICATION_ALREADY_PROCESSED");

      await transaction.auditLog.create({
        data: {
          userId: user.id,
          aksi: "VERIFIKASI_DOKUMEN_TTD",
          entitas: "Statement",
          entitasId: String(statementId),
          dataSebelum: { status: "MENUNGGU_VERIFIKASI" },
          dataSesudah: { status: "SELESAI", attachmentId: signedDocument.id },
        },
      });
    });

    return NextResponse.json({ ok: true, status: "SELESAI" });
  } catch (error) {
    if (error instanceof Error && error.message === "SIGNED_DOCUMENT_MISSING") {
      return NextResponse.json(
        { error: "Dokumen bertanda tangan belum tersedia" },
        { status: 409 },
      );
    }
    if (
      error instanceof Error &&
      error.message === "VERIFICATION_NOT_ALLOWED"
    ) {
      return NextResponse.json(
        {
          error:
            "Pernyataan tidak tersedia untuk verifikasi atau merupakan pengajuan Anda sendiri",
        },
        { status: 403 },
      );
    }
    if (
      error instanceof Error &&
      error.message === "VERIFICATION_ALREADY_PROCESSED"
    ) {
      return NextResponse.json(
        { error: "Pernyataan sudah diverifikasi pengguna lain" },
        { status: 409 },
      );
    }
    throw error;
  }
}
