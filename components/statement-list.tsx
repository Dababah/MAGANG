import Link from "next/link";
import type { Prisma } from "@prisma/client";

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
  DITOLAK: "Ditolak",
};

const tones: Record<string, string> = {
  DRAFT: "revision",
  DIAJUKAN: "review",
  DISETUJUI_ATASAN: "approved",
  DISETUJUI_TI: "complete",
  DITOLAK: "revision",
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
    <div className="statement-table-wrap">
      <table className="statement-table">
        <thead>
          <tr>
            <th>PEKERJA</th>
            <th>NOMOR REFERENSI</th>
            <th>ALASAN</th>
            <th>STATUS</th>
            <th>TANGGAL</th>
          </tr>
        </thead>
        <tbody>
          {statements.map((statement) => (
            <tr key={statement.id}>
              <td>
                <div className="employee-cell">
                  <span className="employee-avatar">
                    {statement.pekerja.namaLengkap
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <span>
                    <strong>{statement.pekerja.namaLengkap}</strong>
                    <small>
                      {statement.pekerja.businessArea.nama} ·{" "}
                      {statement.pekerja.nipp}
                    </small>
                  </span>
                </div>
              </td>
              <td className="ref-cell">
                {statement.noRef ?? `DRAF-${statement.id}`}
              </td>
              <td className="statement-reason">{statement.alasan}</td>
              <td>
                <span className={`status-pill ${tones[statement.status]}`}>
                  <i />
                  {labels[statement.status]}
                </span>
              </td>
              <td className="time-cell">
                {statement.updatedAt.toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
