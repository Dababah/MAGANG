import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { formatJakartaDate } from "@/lib/jakarta-time";
import { StatementActions } from "@/components/statement-actions";

type StatementRecord = Prisma.StatementGetPayload<{
  include: {
    pekerja: {
      select: {
        namaLengkap: true;
        nipp: true;
        businessArea: { select: { nama: true } };
      };
    };
  };
}>;

const labels: Record<string, string> = {
  DRAFT: "Draf",
  DIAJUKAN: "Menunggu persetujuan",
  DISETUJUI_ATASAN: "Disetujui atasan",
  DISETUJUI_TI: "Disetujui TI",
  MENUNGGU_TANDA_TANGAN: "Menunggu tanda tangan",
  MENUNGGU_VERIFIKASI: "Menunggu verifikasi arsip",
  SELESAI: "Selesai",
  DITOLAK: "Ditolak",
};

const tones: Record<string, string> = {
  DRAFT: "red",
  DIAJUKAN: "amber",
  DISETUJUI_ATASAN: "blue",
  DISETUJUI_TI: "blue",
  MENUNGGU_TANDA_TANGAN: "blue",
  MENUNGGU_VERIFIKASI: "amber",
  SELESAI: "green",
  DITOLAK: "red",
};

export function StatementList({
  statements,
  emptyMessage,
}: {
  statements: StatementRecord[];
  emptyMessage: string;
}) {
  if (!statements.length)
    return <div className="list-empty">{emptyMessage}</div>;

  return (
    <div className="table-card">
      <div className="table-head">
        <span>Dokumen</span>
        <span>Tanggal pengajuan</span>
        <span>Status</span>
        <span>Aksi</span>
      </div>
      {statements.map((statement) => (
        <article className="table-row" key={statement.id}>
          <div className="table-document">
            <div className="document-icon" aria-hidden="true">
              ▤
            </div>
            <div>
              <strong>{statement.noRef ?? `DRAF-${statement.id}`}</strong>
              <span>
                {statement.pekerja.namaLengkap} ·{" "}
                {statement.pekerja.businessArea.nama}
              </span>
              <span className="table-reason">{statement.alasan}</span>
            </div>
          </div>
          <span className="table-date">
            {formatJakartaDate(statement.tanggal, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
          <span className={`status ${tones[statement.status]}`}>
            <i />
            {labels[statement.status]}
          </span>
          <div className="table-actions">
            <StatementActions
              statementId={statement.id}
              noRef={statement.noRef}
              status={statement.status}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="data-page-heading">
      <div>
        <div className="eyebrow">
          <span /> {eyebrow}
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div>{action}</div>}
    </header>
  );
}

export function BackToDashboard() {
  return (
    <Link className="data-back" href="/">
      ← Kembali ke ringkasan
    </Link>
  );
}
