import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getAttachmentAccessScope } from "@/lib/auth/scope";

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

  // Get all attachments for this statement
  const attachments = await prisma.attachment.findMany({
    where: { statementId },
    select: {
      id: true,
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

  // Can only upload if statement is DRAFT or DIAJUKAN
  if (statement.status !== "DRAFT" && statement.status !== "DIAJUKAN") {
    return NextResponse.json(
      {
        error:
          "Hanya dapat mengunggah file untuk pernyataan dalam status draf atau diajukan",
      },
      { status: 409 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "File tidak ditemukan dalam permintaan" },
        { status: 400 },
      );
    }

    // Validate file
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_MIME_TYPES = [
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

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads", "statements");
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${timestamp}-${randomStr}-${sanitizedName}`;
    const filePath = join(uploadsDir, filename);

    // Save file
    const buffer = await file.arrayBuffer();
    await import("node:fs/promises").then((fs) =>
      fs.writeFile(filePath, Buffer.from(buffer)),
    );

    // Store attachment record in database
    const attachment = await prisma.attachment.create({
      data: {
        statementId,
        namaFile: file.name,
        tipeMime: file.type,
        ukuran: file.size,
        filePath: `/uploads/statements/${filename}`,
        uploadedBy: user.id,
      },
      select: {
        id: true,
        namaFile: true,
        tipeMime: true,
        ukuran: true,
        createdAt: true,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        aksi: "UNGGAH_LAMPIRAN",
        entitas: "Attachment",
        entitasId: String(attachment.id),
        dataSesudah: {
          namaFile: file.name,
          ukuran: file.size,
          statementId,
        },
      },
    });

    return NextResponse.json({ data: attachment }, { status: 201 });
  } catch (error) {
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
