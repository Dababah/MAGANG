import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  StatementList,
  PageHeading,
  BackToDashboard,
} from "@/components/statement-list";

export const instant = false;

export default async function ArchivePage() {
  const user = await requireUser();
  const scope =
    user.role === "PEKERJA"
      ? { pekerjaId: user.employeeId }
      : user.role === "ATASAN"
        ? {
            OR: [
              { pekerjaId: user.employeeId },
              { pekerja: { atasanId: user.employeeId } },
            ],
          }
        : {};
  const statements = await prisma.statement.findMany({
    where: { ...scope, status: { in: ["DISETUJUI_TI", "DITOLAK"] } },
    include: {
      pekerja: {
        select: {
          namaLengkap: true,
          nipp: true,
          businessArea: { select: { nama: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <main className="data-page">
      <BackToDashboard />
      <PageHeading
        eyebrow="DOKUMEN SELESAI"
        title="Arsip pernyataan"
        description="Pengajuan yang telah selesai atau ditolak."
      />
      <section className="data-panel">
        <div className="data-panel-top">
          <strong>Dokumen terarsip</strong>
          <span>{statements.length} pernyataan</span>
        </div>
        <StatementList
          statements={statements}
          emptyMessage="Arsip masih kosong."
        />
      </section>
    </main>
  );
}
