import { promisify } from "node:util";
import { randomBytes, scrypt } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const scryptAsync = promisify(scrypt);
const password = process.env.LOCAL_APP_PASSWORD;

async function hashPassword(value) {
  const salt = randomBytes(16).toString("hex");
  const key = await scryptAsync(value, salt, 64);
  return `scrypt:${salt}:${key.toString("hex")}`;
}

async function upsertEmployee(data) {
  return prisma.employee.upsert({
    where: { nipp: data.nipp },
    update: data,
    create: data,
  });
}

async function upsertUser(employeeId, role, email, passwordHash) {
  return prisma.user.upsert({
    where: { employeeId },
    update: {
      email,
      passwordHash,
      role,
      aktif: true,
      failedAttempts: 0,
      lockedUntil: null,
    },
    create: { employeeId, email, passwordHash, role },
  });
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL belum diatur.");
  if (!password || password.length < 12 || password.length > 128) {
    throw new Error("LOCAL_APP_PASSWORD wajib diisi 12 sampai 128 karakter.");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Setup lokal tidak boleh berjalan di production.");
  }

  const url = new URL(databaseUrl);
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (
    !["localhost", "127.0.0.1", "::1"].includes(url.hostname) ||
    databaseName !== "pernyataan_kai_local"
  ) {
    throw new Error(
      "Setup hanya menerima database pernyataan_kai_local di localhost. Database lain tidak diubah.",
    );
  }

  const area = await prisma.businessArea.upsert({
    where: { kode: "LOCAL-AREA" },
    update: { nama: "Contoh Lokal - Area Operasional", aktif: true },
    create: { kode: "LOCAL-AREA", nama: "Contoh Lokal - Area Operasional" },
  });

  const manager = await upsertEmployee({
    nipp: "LOCAL-ATASAN-01",
    namaLengkap: "Contoh Lokal - Atasan 01",
    jabatan: "Contoh Lokal - Atasan Unit",
    tempatKedudukan: "Contoh Lokal",
    businessAreaId: area.id,
    atasanId: null,
    aktif: true,
  });
  const worker = await upsertEmployee({
    nipp: "LOCAL-PEKERJA-01",
    namaLengkap: "Contoh Lokal - Pekerja 01",
    jabatan: "Contoh Lokal - Staf Operasional",
    tempatKedudukan: "Contoh Lokal",
    businessAreaId: area.id,
    atasanId: manager.id,
    aktif: true,
  });
  const itAdmin = await upsertEmployee({
    nipp: "LOCAL-ADMIN-TI-01",
    namaLengkap: "Contoh Lokal - Admin TI 01",
    jabatan: "Contoh Lokal - Administrator TI",
    tempatKedudukan: "Contoh Lokal",
    businessAreaId: area.id,
    atasanId: null,
    aktif: true,
  });
  const superAdmin = await upsertEmployee({
    nipp: "LOCAL-SUPER-ADMIN-01",
    namaLengkap: "Contoh Lokal - Super Admin 01",
    jabatan: "Contoh Lokal - Administrator Sistem",
    tempatKedudukan: "Contoh Lokal",
    businessAreaId: area.id,
    atasanId: null,
    aktif: true,
  });

  const passwordHash = await hashPassword(password);
  await Promise.all([
    upsertUser(
      worker.id,
      "PEKERJA",
      "pekerja.local@example.invalid",
      passwordHash,
    ),
    upsertUser(
      manager.id,
      "ATASAN",
      "atasan.local@example.invalid",
      passwordHash,
    ),
    upsertUser(
      itAdmin.id,
      "ADMIN_TI",
      "admin-ti.local@example.invalid",
      passwordHash,
    ),
    upsertUser(
      superAdmin.id,
      "SUPER_ADMIN",
      "super-admin.local@example.invalid",
      passwordHash,
    ),
  ]);

  const formData = {
    nomorDokumen: "LOCAL-SAMPLE-001",
    versi: "LOCAL-1",
    tanggalTerbit: new Date("2026-01-01T00:00:00.000Z"),
    teksKetentuan:
      "CONTOH LOKAL - Teks simulasi untuk menjalankan aplikasi. Bukan formulir, ketentuan, atau dokumen resmi KAI. Ganti hanya menggunakan naskah yang telah disetujui sebelum deployment resmi.",
    aktif: true,
  };
  const localForm = await prisma.formVersion.findFirst({
    where: { nomorDokumen: formData.nomorDokumen },
  });
  await prisma.formVersion.updateMany({
    where: {
      aktif: true,
      ...(localForm ? { id: { not: localForm.id } } : {}),
    },
    data: { aktif: false },
  });
  if (localForm) {
    await prisma.formVersion.update({
      where: { id: localForm.id },
      data: formData,
    });
  } else {
    await prisma.formVersion.create({ data: formData });
  }

  console.log("Database lokal siap. Tidak ada data KAI asli yang digunakan.");
  console.log("Database: pernyataan_kai_local (localhost)");
  console.log("Password semua akun: password lokal yang Anda pilih");
  console.log("PEKERJA      LOCAL-PEKERJA-01");
  console.log("ATASAN       LOCAL-ATASAN-01");
  console.log("ADMIN_TI     LOCAL-ADMIN-TI-01");
  console.log("SUPER_ADMIN  LOCAL-SUPER-ADMIN-01");
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
