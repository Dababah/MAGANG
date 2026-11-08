import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  getApprovalQueueScope,
  getVerificationQueueScope,
} from "@/lib/auth/scope";
import { formatJakartaDate } from "@/lib/jakarta-time";
import { ApprovalQueue } from "@/components/approval-queue";
import { FinalVerificationQueue } from "@/components/final-verification-queue";
import { PageHeading, BackToDashboard } from "@/components/statement-list";

export const instant = false;

export default async function ApprovalsPage() {
  const user = await requireUser();
  if (user.role === "PEKERJA") redirect("/statements");
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
  const verificationStatements =
    user.role === "ADMIN_TI" || user.role === "SUPER_ADMIN"
      ? await prisma.statement.findMany({
          where: getVerificationQueueScope(user),
          select: {
            id: true,
            noRef: true,
            alasan: true,
            updatedAt: true,
            pekerja: {
              select: {
                namaLengkap: true,
                nipp: true,
                businessArea: { select: { nama: true } },
              },
            },
          },
          orderBy: { updatedAt: "asc" },
          take: 100,
        })
      : [];

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
      {(user.role === "ADMIN_TI" || user.role === "SUPER_ADMIN") && (
        <section className="data-panel">
          <div className="data-panel-top">
            <strong>Verifikasi dokumen bertanda tangan</strong>
            <span>{verificationStatements.length} dokumen</span>
          </div>
          <FinalVerificationQueue
            items={verificationStatements.map((statement) => ({
              id: statement.id,
              noRef: statement.noRef,
              alasan: statement.alasan,
              namaLengkap: statement.pekerja.namaLengkap,
              nipp: statement.pekerja.nipp,
              businessArea: statement.pekerja.businessArea.nama,
              tanggal: formatJakartaDate(statement.updatedAt, {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
            }))}
          />
        </section>
      )}
    </main>
  );
}
