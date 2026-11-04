import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getAttachmentAccessScope } from "@/lib/auth/scope";

type RouteContext = { params: Promise<{ id: string; attachmentId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Silakan masuk untuk melanjutkan" },
      { status: 401 },
    );
  }

  const { id: rawId, attachmentId: rawAttachmentId } = await params;
  const statementId = Number(rawId);
  const attachmentIdNum = Number(rawAttachmentId);

  if (
    !Number.isSafeInteger(statementId) ||
    statementId < 1 ||
    !Number.isSafeInteger(attachmentIdNum) ||
    attachmentIdNum < 1
  ) {
    return NextResponse.json(
      { error: "Parameter tidak valid" },
      { status: 400 },
    );
  }

  // Check if user has access to this statement
  const scope = getAttachmentAccessScope(user);
  const statement = await prisma.statement.findFirst({
    where: { id: statementId, ...scope },
    select: { id: true },
  });

  if (!statement) {
    return NextResponse.json(
      { error: "Pernyataan tidak ditemukan atau Anda tidak memiliki akses" },
      { status: 404 },
    );
  }

  // Get attachment
  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentIdNum, statementId },
  });

  if (!attachment) {
    return NextResponse.json(
      { error: "Lampiran tidak ditemukan" },
      { status: 404 },
    );
  }

  try {
    // Read file from filesystem
    const filePath = join(process.cwd(), "public", attachment.filePath);
    const buffer = await readFile(filePath);

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        aksi: "UNDUH_LAMPIRAN",
        entitas: "Attachment",
        entitasId: String(attachment.id),
      },
    });

    return new Response(buffer, {
      headers: {
        "Content-Type": attachment.tipeMime,
        "Content-Disposition": `attachment; filename="${attachment.namaFile}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("File download error:", error);
    return NextResponse.json(
      { error: "Gagal mengunduh file" },
      { status: 500 },
    );
  }
}
