import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getApprovalQueueScope } from "@/lib/auth/scope";
import { formatJakartaDate } from "@/lib/jakarta-time";
import { ApprovalQueue } from "@/components/approval-queue";
import { PageHeading, BackToDashboard } from "@/components/statement-list";

export const instant = false;

export default async function ApprovalsPage() {
  const user = await requireUser();
  const scope = getApprovalQueueScope(user);
  const statements = await prisma.statement.findMany({
    where: scope,
    select: {
      id: true,
      noRef: true,
      alasan: true,
      status: true,
      updatedAt: true,
      pekerja: {
        select: {
          namaLengkap: true,
          nipp: true,
          businessArea: { select: { nama: true } },
        },
      },
    },
    orderBy: { submittedAt: "asc" },
    take: 100,
  });

  return (
    <main className="data-page">
      <BackToDashboard />
      <PageHeading
        eyebrow="ALUR PERSETUJUAN"
        title="Kotak persetujuan"
        description="Tinjau pengajuan yang menunggu tindakan dari peran Anda."
      />
      <section className="data-panel">
        <div className="data-panel-top">
          <strong>Menunggu tindakan</strong>
          <span>{statements.length} pengajuan</span>
        </div>
        <ApprovalQueue
          items={statements.map((statement) => ({
            id: statement.id,
            noRef: statement.noRef,
            namaLengkap: statement.pekerja.namaLengkap,
            nipp: statement.pekerja.nipp,
            businessArea: statement.pekerja.businessArea.nama,
            alasan: statement.alasan,
            status: statement.status as "DIAJUKAN" | "DISETUJUI_ATASAN",
            tanggal: formatJakartaDate(statement.updatedAt, {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
          }))}
        />
      </section>
    </main>
  );
}
