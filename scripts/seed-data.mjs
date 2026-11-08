import { promisify } from "node:util";
import { randomBytes, scrypt } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const scryptAsync = promisify(scrypt);
const password = process.env.LOCAL_APP_PASSWORD || "TesPassword123!";

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
  if (process.env.NODE_ENV === "production") {
    throw new Error("Setup lokal tidak boleh berjalan di production.");
  }

  console.log("🔄 Memulai seed database...");

  // Create or update BusinessArea
  const area = await prisma.businessArea.upsert({
    where: { kode: "TEST-AREA-01" },
    update: { nama: "Test Area - Area Operasional", aktif: true },
    create: { kode: "TEST-AREA-01", nama: "Test Area - Area Operasional" },
  });
  console.log("✓ BusinessArea created:", area.kode);

  // Create or update Employees
  const manager = await upsertEmployee({
    nipp: "TEST-ATASAN-01",
    namaLengkap: "Test - Atasan 01",
    jabatan: "Test - Atasan Unit",
    tempatKedudukan: "Test Location",
    businessAreaId: area.id,
    atasanId: null,
    aktif: true,
  });
  console.log("✓ Manager Employee created:", manager.nipp);

  const worker = await upsertEmployee({
    nipp: "TEST-PEKERJA-01",
    namaLengkap: "Test - Pekerja 01",
    jabatan: "Test - Staf Operasional",
    tempatKedudukan: "Test Location",
    businessAreaId: area.id,
    atasanId: manager.id,
    aktif: true,
  });
  console.log("✓ Worker Employee created:", worker.nipp);

  const itAdmin = await upsertEmployee({
    nipp: "TEST-ADMIN-TI-01",
    namaLengkap: "Test - Admin TI 01",
    jabatan: "Test - Administrator TI",
    tempatKedudukan: "Test Location",
    businessAreaId: area.id,
    atasanId: null,
    aktif: true,
  });
  console.log("✓ IT Admin Employee created:", itAdmin.nipp);

  const superAdmin = await upsertEmployee({
    nipp: "TEST-SUPER-ADMIN-01",
    namaLengkap: "Test - Super Admin 01",
    jabatan: "Test - Administrator Sistem",
    tempatKedudukan: "Test Location",
    businessAreaId: area.id,
    atasanId: null,
    aktif: true,
  });
  console.log("✓ Super Admin Employee created:", superAdmin.nipp);

  // Create Users with hashed passwords
  const passwordHash = await hashPassword(password);
  console.log("🔐 Password hash created");

  await Promise.all([
    upsertUser(
      worker.id,
      "PEKERJA",
      "pekerja.test@example.invalid",
      passwordHash,
    ),
    upsertUser(
      manager.id,
      "ATASAN",
      "atasan.test@example.invalid",
      passwordHash,
    ),
    upsertUser(
      itAdmin.id,
      "ADMIN_TI",
      "admin-ti.test@example.invalid",
      passwordHash,
    ),
    upsertUser(
      superAdmin.id,
      "SUPER_ADMIN",
      "super-admin.test@example.invalid",
      passwordHash,
    ),
  ]);
  console.log("✓ All users created");

  // Create or update FormVersion
  const formData = {
    nomorDokumen: "TEST-SAMPLE-001",
    versi: "TEST-1",
    tanggalTerbit: new Date("2026-01-01T00:00:00.000Z"),
    teksKetentuan:
      "TEST DATA - Teks simulasi untuk menjalankan aplikasi. Bukan formulir, ketentuan, atau dokumen resmi KAI. Ganti hanya menggunakan naskah yang telah disetujui sebelum deployment resmi.",
    aktif: true,
  };

  const existingForm = await prisma.formVersion.findFirst({
    where: { nomorDokumen: formData.nomorDokumen },
  });

  // Deactivate other forms
  await prisma.formVersion.updateMany({
    where: {
      aktif: true,
      ...(existingForm ? { id: { not: existingForm.id } } : {}),
    },
    data: { aktif: false },
  });

  if (existingForm) {
    await prisma.formVersion.update({
      where: { id: existingForm.id },
      data: formData,
    });
    console.log("✓ FormVersion updated:", existingForm.id);
  } else {
    await prisma.formVersion.create({ data: formData });
    console.log("✓ FormVersion created");
  }

  console.log("\n✅ Database seed selesai!\n");
  console.log("📝 Akun Test yang tersedia:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Role          │ NIPP              │ Password");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`PEKERJA       │ TEST-PEKERJA-01   │ ${password}`);
  console.log(`ATASAN        │ TEST-ATASAN-01    │ ${password}`);
  console.log(`ADMIN_TI      │ TEST-ADMIN-TI-01  │ ${password}`);
  console.log(`SUPER_ADMIN   │ TEST-SUPER-ADMIN-01 │ ${password}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((error) => {
    console.error("❌ Error:", error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
