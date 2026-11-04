import { redirect } from "next/navigation";
import { BackToDashboard, PageHeading } from "@/components/statement-list";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const instant = false;

export default async function AdminEmployeesPage() {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/");

  const employees = await prisma.employee.findMany({
    include: {
      businessArea: { select: { nama: true } },
      atasan: { select: { namaLengkap: true } },
      user: { select: { role: true, aktif: true, email: true } },
    },
    orderBy: [{ businessArea: { nama: "asc" } }, { namaLengkap: "asc" }],
    take: 200,
  });

  return (
    <main className="data-page">
      <BackToDashboard />
      <PageHeading
        eyebrow="ADMINISTRASI"
        title="Data pegawai"
        description="Direktori pegawai dan hubungan atasan yang tercatat di portal."
      />
      <section className="data-panel">
        <div className="data-panel-top">
          <strong>{employees.length} pegawai ditampilkan</strong>
          <span>Hanya Super Admin</span>
        </div>
        <div className="statement-table-wrap">
          <table className="statement-table">
            <thead>
              <tr>
                <th>NAMA / NIPP</th>
                <th>JABATAN</th>
                <th>AREA</th>
                <th>ATASAN</th>
                <th>AKUN</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td>
                    <strong>{employee.namaLengkap}</strong>
                    <small className="admin-subtext">{employee.nipp}</small>
                  </td>
                  <td>{employee.jabatan}</td>
                  <td>{employee.businessArea.nama}</td>
                  <td>{employee.atasan?.namaLengkap ?? "-"}</td>
                  <td>
                    {employee.user
                      ? employee.user.role.replaceAll("_", " ")
                      : "Belum ada"}
                  </td>
                  <td>
                    {employee.aktif && employee.user?.aktif
                      ? "Aktif"
                      : "Nonaktif"}
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td className="empty-table" colSpan={6}>
                    Belum ada data pegawai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
