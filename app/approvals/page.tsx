import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  StatementList,
  PageHeading,
  BackToDashboard,
} from "@/components/statement-list";

export const instant = false;

export default async function ApprovalsPage() {
  const user = await requireUser();
  const scope: Prisma.StatementWhereInput =
    user.role === "ATASAN"
      ? { status: "DIAJUKAN" as const, pekerja: { atasanId: user.employeeId } }
      : user.role === "ADMIN_TI"
        ? { status: "DISETUJUI_ATASAN" as const }
        : user.role === "SUPER_ADMIN"
          ? { status: { in: ["DIAJUKAN", "DISETUJUI_ATASAN"] } }
          : { id: -1 };
  const statements = await prisma.statement.findMany({
    where: scope,
    include: {
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
        <StatementList
          statements={statements}
          emptyMessage="Tidak ada pengajuan yang menunggu persetujuan Anda."
        />
      </section>
    </main>
  );
}
