import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  StatementList,
  PageHeading,
  BackToDashboard,
} from "@/components/statement-list";

export default async function StatementsPage() {
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
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <main className="data-page">
      <BackToDashboard />
      <PageHeading
        eyebrow="PENGELOLAAN DOKUMEN"
        title="Pernyataan"
        description="Daftar pengajuan pernyataan dalam cakupan akses Anda."
        action={
          user.role === "PEKERJA" ? (
            <a className="primary-button" href="/statements/new">
              + Buat pernyataan
            </a>
          ) : undefined
        }
      />
      <section className="data-panel">
        <div className="data-panel-top">
          <strong>Semua pengajuan</strong>
          <span>{statements.length} pernyataan</span>
        </div>
        <StatementList
          statements={statements}
          emptyMessage="Belum ada pernyataan yang tercatat."
        />
      </section>
    </main>
  );
}
