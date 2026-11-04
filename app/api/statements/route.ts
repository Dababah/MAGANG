import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getJakartaDateParts } from "@/lib/jakarta-time";
import { getStatementVisibilityScope } from "@/lib/auth/scope";
import {
  createStatementSchema,
  statementStatusSchema,
} from "@/lib/validators/statement";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { error: "Silakan masuk untuk melanjutkan" },
      { status: 401 },
    );

  const { searchParams } = new URL(request.url);
  const rawStatus = searchParams.get("status");
  const parsedStatus = rawStatus
    ? statementStatusSchema.safeParse(rawStatus)
    : null;
  if (parsedStatus && !parsedStatus.success) {
    return NextResponse.json(
      { error: "Filter status tidak valid" },
      { status: 400 },
    );
  }

  const statements = await prisma.statement.findMany({
    where: {
      ...getStatementVisibilityScope(user),
      ...(parsedStatus?.success ? { status: parsedStatus.data } : {}),
    },
    include: {
      pekerja: {
        select: {
          namaLengkap: true,
          nipp: true,
          businessArea: { select: { nama: true } },
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 100,
  });

  return NextResponse.json({ data: statements });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { error: "Silakan masuk untuk melanjutkan" },
      { status: 401 },
    );
  if (user.role !== "PEKERJA") {
    return NextResponse.json(
      { error: "Hanya akun pekerja yang dapat mengajukan pernyataan" },
      { status: 403 },
    );
  }
  if (!user.employee.aktif || !user.employee.businessArea.aktif) {
    return NextResponse.json(
      { error: "Data pekerja atau wilayah kerja tidak aktif" },
      { status: 409 },
    );
  }

  const parsed = createStatementSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Data pernyataan tidak valid",
      },
      { status: 400 },
    );
  }

  const employee = await prisma.employee.findUnique({
    where: { id: user.employeeId },
    include: { businessArea: true },
  });
  const formVersion = await prisma.formVersion.findFirst({
    where: { id: parsed.data.formVersionId, aktif: true },
    orderBy: { tanggalTerbit: "desc" },
  });
  if (
    !employee ||
    !employee.aktif ||
    !employee.businessArea.aktif ||
    !formVersion
  ) {
    return NextResponse.json(
      { error: "Data pekerja atau formulir aktif belum tersedia" },
      { status: 409 },
    );
  }

  const now = new Date();
  const { year, month, day } = getJakartaDateParts(now);
  const statement = await prisma.$transaction(
    async (transaction: Prisma.TransactionClient) => {
      const counter = await transaction.refCounter.upsert({
        where: { tahun_bulan: { tahun: year, bulan: month } },
        create: { tahun: year, bulan: month, urutanTerakhir: 1 },
        update: { urutanTerakhir: { increment: 1 } },
      });
      const noRef = `PST-${year}-${String(month).padStart(2, "0")}-${String(counter.urutanTerakhir).padStart(4, "0")}`;
      const created = await transaction.statement.create({
        data: {
          noRef,
          tanggal: new Date(Date.UTC(year, month - 1, day)),
          pekerjaId: employee.id,
          formVersionId: formVersion.id,
          namaLengkap: employee.namaLengkap,
          nipp: employee.nipp,
          jabatan: employee.jabatan,
          tempatKedudukan: employee.tempatKedudukan,
          businessArea: employee.businessArea.nama,
          alasan: parsed.data.alasan,
          status: "DIAJUKAN",
          submittedAt: now,
        },
      });
      await transaction.auditLog.create({
        data: {
          userId: user.id,
          aksi: "AJUKAN_PERNYATAAN",
          entitas: "Statement",
          entitasId: String(created.id),
          dataSesudah: { noRef, status: created.status },
        },
      });
      return created;
    },
  );

  return NextResponse.json({ data: statement }, { status: 201 });
}
