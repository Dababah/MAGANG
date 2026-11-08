import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { NewStatementForm } from "@/components/new-statement-form";

export const instant = false;

export default async function NewStatementPage() {
  const user = await requireUser();
  if (user.role !== "PEKERJA") redirect("/statements");

  const [employee, formVersion] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: user.employeeId },
      include: { businessArea: true },
    }),
    prisma.formVersion.findFirst({
      where: { aktif: true },
      orderBy: { tanggalTerbit: "desc" },
    }),
  ]);

  const unavailable =
    !employee ||
    !employee.aktif ||
    !employee.businessArea.aktif ||
    !formVersion;

  return (
    <NewStatementForm
      employee={
        employee
          ? {
              namaLengkap: employee.namaLengkap,
              nipp: employee.nipp,
              jabatan: employee.jabatan,
              tempatKedudukan: employee.tempatKedudukan,
              businessArea: employee.businessArea.nama,
            }
          : null
      }
      formVersion={
        formVersion
          ? {
              nomorDokumen: formVersion.nomorDokumen,
              versi: formVersion.versi,
              tanggalTerbit: new Intl.DateTimeFormat("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "Asia/Jakarta",
              }).format(formVersion.tanggalTerbit),
              teksKetentuan: formVersion.teksKetentuan,
              id: formVersion.id,
            }
          : null
      }
      unavailable={unavailable}
    />
  );
}
