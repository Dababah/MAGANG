import { join } from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getAttachmentAccessScope } from "@/lib/auth/scope";
import {
  removePrivateAttachment,
  storePrivateAttachment,
} from "@/lib/services/attachment-storage";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Silakan masuk untuk melanjutkan" },
      { status: 401 },
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

  const requestedType = new URL(_request.url).searchParams.get("jenis");
  const attachmentType =
    requestedType === "PENDUKUNG" || requestedType === "DOKUMEN_TTD"
      ? requestedType
      : undefined;
  if (requestedType && !attachmentType) {
    return NextResponse.json(
      { error: "Jenis lampiran tidak valid" },
      { status: 400 },
    );
  }

  const attachments = await prisma.attachment.findMany({
    where: {
      statementId,
      ...(attachmentType ? { jenis: attachmentType } : {}),
    },
    select: {
      id: true,
      jenis: true,
      namaFile: true,
      tipeMime: true,
      ukuran: true,
      createdAt: true,
      uploader: {
        select: {
          employee: { select: { namaLengkap: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: attachments });
}

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Silakan masuk untuk melanjutkan" },
      { status: 401 },
    );
  }

  // Only PEKERJA can upload files
  if (user.role !== "PEKERJA") {
    return NextResponse.json(
      { error: "Hanya pekerja yang dapat mengunggah file" },
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

  // Verify statement exists and belongs to the user
  const statement = await prisma.statement.findUnique({
    where: { id: statementId },
  });

  if (!statement) {
    return NextResponse.json(
      { error: "Pernyataan tidak ditemukan" },
      { status: 404 },
    );
  }

  if (statement.pekerjaId !== user.employeeId) {
    return NextResponse.json(
      { error: "Anda tidak dapat mengunggah file untuk pernyataan orang lain" },
      { status: 403 },
    );
  }

  const isSignedDocument = statement.status === "MENUNGGU_TANDA_TANGAN";
  const canUploadSupporting =
    statement.status === "DRAFT" || statement.status === "DIAJUKAN";
  if (!isSignedDocument && !canUploadSupporting) {
    return NextResponse.json(
      {
        error:
          "Unggahan hanya tersedia pada tahap yang sesuai dengan status pernyataan",
      },
      { status: 409 },
    );
  }

  if (isSignedDocument) {
    const existingSignedDocument = await prisma.attachment.findFirst({
      where: { statementId, jenis: "DOKUMEN_TTD" },
      select: { id: true },
    });
    if (existingSignedDocument) {
      return NextResponse.json(
        { error: "Dokumen bertanda tangan sudah diunggah" },
        { status: 409 },
      );
    }
  }

  let savedStorageKey: string | null = null;
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "File tidak ditemukan dalam permintaan" },
        { status: 400 },
      );
    }

    // Validate file
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_MIME_TYPES = isSignedDocument
      ? ["application/pdf", "image/jpeg", "image/png", "image/webp"]
      : [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/webp",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/plain",
        ];

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `Ukuran file tidak boleh lebih dari ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Tipe file tidak didukung. Izinkan: ${ALLOWED_MIME_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const storedFile = Buffer.from(await file.arrayBuffer());
    const storageKey = await storePrivateAttachment(
      statementId,
      file.type,
      storedFile,
    );
    savedStorageKey = storageKey;

    const attachment = await prisma.$transaction(async (transaction) => {
      if (isSignedDocument) {
        const changed = await transaction.statement.updateMany({
          where: { id: statementId, status: "MENUNGGU_TANDA_TANGAN" },
          data: { status: "MENUNGGU_VERIFIKASI" },
        });
        if (!changed.count) throw new Error("SIGNED_DOCUMENT_STAGE_CHANGED");
      }

      const created = await transaction.attachment.create({
        data: {
          statementId,
          jenis: isSignedDocument ? "DOKUMEN_TTD" : "PENDUKUNG",
          namaFile: file.name,
          tipeMime: file.type,
          ukuran: file.size,
          filePath: storageKey,
          uploadedBy: user.id,
        },
        select: {
          id: true,
          jenis: true,
          namaFile: true,
          tipeMime: true,
          ukuran: true,
          createdAt: true,
        },
      });
      await transaction.auditLog.create({
        data: {
          userId: user.id,
          aksi: isSignedDocument ? "UNGGAH_DOKUMEN_TTD" : "UNGGAH_LAMPIRAN",
          entitas: "Attachment",
          entitasId: String(created.id),
          dataSesudah: {
            namaFile: file.name,
            ukuran: file.size,
            statementId,
            jenis: created.jenis,
          },
        },
      });
      return created;
    });

    return NextResponse.json({ data: attachment }, { status: 201 });
  } catch (error) {
    if (savedStorageKey) {
      try {
        await removePrivateAttachment(savedStorageKey);
      } catch (cleanupError) {
        console.error("Private attachment cleanup failed:", cleanupError);
      }
    }
    if (
      error instanceof Error &&
      error.message === "SIGNED_DOCUMENT_STAGE_CHANGED"
    ) {
      return NextResponse.json(
        {
          error:
            "Tahap unggah telah berubah. Muat ulang halaman dan periksa status dokumen.",
        },
        { status: 409 },
      );
    }
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "Gagal mengunggah file" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Silakan masuk untuk melanjutkan" },
      { status: 401 },
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

  const url = new URL(request.url);
  const attachmentId = url.searchParams.get("attachmentId");

  if (!attachmentId) {
    return NextResponse.json(
      { error: "ID lampiran tidak diberikan" },
      { status: 400 },
    );
  }

  // Verify attachment exists and belongs to this statement
  const attachment = await prisma.attachment.findFirst({
    where: {
      id: Number(attachmentId),
      statementId,
      uploadedBy: user.id,
    },
  });

  if (!attachment) {
    return NextResponse.json(
      { error: "Lampiran tidak ditemukan atau Anda tidak memiliki akses" },
      { status: 404 },
    );
  }

  // Verify statement still allows deletion (DRAFT or DIAJUKAN only)
  const statement = await prisma.statement.findUnique({
    where: { id: statementId },
  });

  if (
    !statement ||
    (statement.status !== "DRAFT" && statement.status !== "DIAJUKAN")
  ) {
    return NextResponse.json(
      {
        error:
          "Tidak dapat menghapus lampiran dari pernyataan yang sudah diproses",
      },
      { status: 409 },
    );
  }

  try {
    // Delete file from filesystem
    const filePath = join(process.cwd(), "public", attachment.filePath);
    await import("node:fs/promises").then((fs) =>
      fs.unlink(filePath).catch(() => {
        // Ignore if file doesn't exist
      }),
    );

    // Delete attachment record
    await prisma.attachment.delete({
      where: { id: Number(attachmentId) },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        aksi: "HAPUS_LAMPIRAN",
        entitas: "Attachment",
        entitasId: String(attachmentId),
        dataSebelum: {
          namaFile: attachment.namaFile,
          ukuran: attachment.ukuran,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("File deletion error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus lampiran" },
      { status: 500 },
    );
  }
}
