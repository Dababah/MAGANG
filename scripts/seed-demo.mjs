import { promisify } from "node:util";
import { randomBytes, scrypt } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const scryptAsync = promisify(scrypt);
const prisma = new PrismaClient();
const demoPassword = process.env.DEMO_PASSWORD;

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scryptAsync(password, salt, 64);
  return `scrypt:${salt}:${key.toString("hex")}`;
}

async function upsertEmployee(data) {
  return prisma.employee.upsert({
    where: { nipp: data.nipp },
    update: data,
    create: data,
  });
}

async function upsertDemoUser(employee, role, email, passwordHash) {
  return prisma.user.upsert({
    where: { employeeId: employee.id },
    update: {
      email,
      passwordHash,
      role,
      aktif: true,
      failedAttempts: 0,
      lockedUntil: null,
    },
    create: {
      employeeId: employee.id,
      email,
      passwordHash,
      role,
    },
  });
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL belum diatur.");
  if (!demoPassword) {
    throw new Error("Atur DEMO_PASSWORD sebelum menjalankan seed demo.");
  }

  const hostname = new URL(databaseUrl).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) {
    throw new Error("Seed demo hanya boleh dijalankan ke database localhost.");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Seed demo tidak boleh dijalankan pada NODE_ENV=production.",
    );
  }
  if (demoPassword.length < 8) {
    throw new Error("DEMO_PASSWORD harus memiliki minimal 8 karakter.");
  }

  const businessArea = await prisma.businessArea.upsert({
    where: { kode: "DEMO" },
    update: { nama: "Area Demo Lokal", aktif: true },
    create: { kode: "DEMO", nama: "Area Demo Lokal" },
  });

  const manager = await upsertEmployee({
    nipp: "90000002",
    namaLengkap: "Atasan Demo",
    jabatan: "Kepala Unit",
    tempatKedudukan: "Bandung",
    businessAreaId: businessArea.id,
    atasanId: null,
    aktif: true,
  });
  const worker = await upsertEmployee({
    nipp: "90000001",
    namaLengkap: "Pekerja Demo",
    jabatan: "Staf Operasional",
    tempatKedudukan: "Bandung",
    businessAreaId: businessArea.id,
    atasanId: manager.id,
    aktif: true,
  });
  const adminTi = await upsertEmployee({
    nipp: "90000003",
    namaLengkap: "Admin TI Demo",
    jabatan: "Administrator TI",
    tempatKedudukan: "Bandung",
    businessAreaId: businessArea.id,
    atasanId: null,
    aktif: true,
  });
  const superAdmin = await upsertEmployee({
    nipp: "90000004",
    namaLengkap: "Super Admin Demo",
    jabatan: "Administrator Sistem",
    tempatKedudukan: "Bandung",
    businessAreaId: businessArea.id,
    atasanId: null,
    aktif: true,
  });

  const passwordHash = await hashPassword(demoPassword);
  await Promise.all([
    upsertDemoUser(
      worker,
      "PEKERJA",
      "pekerja.demo@example.test",
      passwordHash,
    ),
    upsertDemoUser(manager, "ATASAN", "atasan.demo@example.test", passwordHash),
    upsertDemoUser(
      adminTi,
      "ADMIN_TI",
      "admin.ti.demo@example.test",
      passwordHash,
    ),
    upsertDemoUser(
      superAdmin,
      "SUPER_ADMIN",
      "super.admin.demo@example.test",
      passwordHash,
    ),
  ]);

  const existingForm = await prisma.formVersion.findFirst({
    where: { nomorDokumen: "DEMO-LOCAL-001" },
  });
  if (existingForm) {
    await prisma.formVersion.update({
      where: { id: existingForm.id },
      data: {
        versi: "DEMO",
        tanggalTerbit: new Date("2026-01-01T00:00:00.000Z"),
        teksKetentuan: "Formulir uji lokal. Data ini hanya untuk demonstrasi.",
        aktif: true,
      },
    });
  } else {
    await prisma.formVersion.create({
      data: {
        nomorDokumen: "DEMO-LOCAL-001",
        versi: "DEMO",
        tanggalTerbit: new Date("2026-01-01T00:00:00.000Z"),
        teksKetentuan: "Formulir uji lokal. Data ini hanya untuk demonstrasi.",
        aktif: true,
      },
    });
  }

  console.log("Akun demo lokal siap. NIPP untuk setiap role:");
  console.log("Pekerja      90000001");
  console.log("Atasan       90000002");
  console.log("Admin TI     90000003");
  console.log("Super Admin  90000004");
  console.log("Password demo disetel melalui DEMO_PASSWORD.");
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
