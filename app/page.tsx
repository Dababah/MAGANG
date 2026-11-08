import type { ReactNode } from "react";
import { FigmaPortalShell } from "@/components/figma-portal-shell";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { formatJakartaDate, getJakartaMonthStart } from "@/lib/jakarta-time";
import {
  getStatementVisibilityScope,
  getApprovalQueueScope,
  getVerificationQueueScope,
} from "@/lib/auth/scope";

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h8" />
      </>
    ),
    check: (
      <>
        <path d="M9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </>
    ),
    archive: (
      <>
        <rect x="3" y="4" width="18" height="4" rx="1" />
        <path d="M5 8v12h14V8M10 12h4" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    arrow: (
      <>
        <path d="M7 17 17 7M7 7h10v10" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6M23 11h-6" />
      </>
    ),
    trend: (
      <>
        <path d="m3 17 6-6 4 4 8-8" />
        <path d="M15 7h6v6" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

export const instant = false;

export default async function Home() {
  const user = await requireUser();
  const statementScope = getStatementVisibilityScope(user);
  const pendingScope = getApprovalQueueScope(user);
  const verificationScope = getVerificationQueueScope(user);
  const monthStart = getJakartaMonthStart(new Date());

  const [
    totalStatements,
    pendingCount,
    verificationCount,
    approvedThisMonth,
    recentStatements,
    pendingStatements,
  ] = await Promise.all([
    prisma.statement.count({ where: statementScope }),
    prisma.statement.count({
      where: pendingScope,
    }),
    prisma.statement.count({ where: verificationScope }),
    prisma.statement.count({
      where: {
        ...statementScope,
        status: { in: ["DISETUJUI_TI", "SELESAI"] },
        updatedAt: { gte: monthStart },
      },
    }),
    prisma.statement.findMany({
      where: statementScope,
      include: {
        pekerja: {
          select: {
            namaLengkap: true,
            businessArea: { select: { nama: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
    prisma.statement.findMany({
      where: pendingScope,
      include: { pekerja: { select: { namaLengkap: true } } },
      orderBy: { submittedAt: "asc" },
      take: 3,
    }),
  ]);
  const statusText: Record<string, string> = {
    DRAFT: "Draf",
    DIAJUKAN: "Menunggu persetujuan",
    DISETUJUI_ATASAN: "Disetujui atasan",
    DISETUJUI_TI: "Disetujui TI",
    MENUNGGU_TANDA_TANGAN: "Menunggu tanda tangan",
    MENUNGGU_VERIFIKASI: "Menunggu verifikasi arsip",
    SELESAI: "Selesai",
    DITOLAK: "Ditolak",
  };
  const statusTone: Record<string, string> = {
    DRAFT: "revision",
    DIAJUKAN: "review",
    DISETUJUI_ATASAN: "approved",
    DISETUJUI_TI: "complete",
    MENUNGGU_TANDA_TANGAN: "approved",
    MENUNGGU_VERIFIKASI: "review",
    SELESAI: "complete",
    DITOLAK: "revision",
  };
  const latestStatus = recentStatements[0]?.status;
  const workflowStage: Record<string, number> = {
    DIAJUKAN: 1,
    DISETUJUI_ATASAN: 2,
    MENUNGGU_TANDA_TANGAN: 3,
    MENUNGGU_VERIFIKASI: 4,
    SELESAI: 5,
    DISETUJUI_TI: 3,
  };
  const currentStage = latestStatus ? (workflowStage[latestStatus] ?? 0) : 0;
  const isRejected = latestStatus === "DITOLAK";

  return (
    <FigmaPortalShell
      employee={{
        namaLengkap: user.employee.namaLengkap,
        nipp: user.employee.nipp,
        businessArea: user.employee.businessArea.nama,
      }}
      role={user.role}
      pendingCount={pendingCount + verificationCount}>
      <div className="fd-dashboard">
        <section className="welcome">
          <div>
            <div className="eyebrow">
              <span /> PORTAL INTERNAL PEKERJA
            </div>
            <h1>Selamat datang, {user.employee.namaLengkap.split(" ")[0]}.</h1>
            <p>Pantau seluruh proses pernyataan Anda dalam satu tempat.</p>
          </div>
          {user.role === "PEKERJA" && (
            <a className="primary-button" href="/statements/new">
              <Icon name="plus" size={19} /> Buat pernyataan
            </a>
          )}
        </section>

        <section className="hero-card">
          <div className="hero-content">
            <div className="hero-icon">
              <Icon name="check" />
            </div>
            <span>PROSES TERINTEGRASI</span>
            <h2>
              Pengajuan lebih ringkas.
              <br />
              Pelacakan lebih jelas.
            </h2>
            <p>
              Setiap tahapan tercatat dan dapat Anda pantau secara transparan.
            </p>
            <a href="/statements">
              Pelajari alur pengajuan <Icon name="arrow" />
            </a>
          </div>
          <div className="hero-visual">
            <div className="hero-logo">
              <img src="/assets/kai-logo-official.png" alt="" />
            </div>
            <div className="floating-card card-one">
              <span>01</span>
              <b>Ajukan</b>
            </div>
            <div className="floating-card card-two">
              <span>02</span>
              <b>Persetujuan</b>
            </div>
            <div className="floating-card card-three">
              <span>03</span>
              <b>Verifikasi</b>
            </div>
            <div className="hero-track">
              <i />
              <i />
            </div>
          </div>
        </section>

        <section className="stats-grid" aria-label="Ringkasan pengajuan">
          <article className="stat-card">
            <div className="stat-icon navy">
              <Icon name="file" />
            </div>
            <div>
              <span>Total pernyataan</span>
              <strong>{totalStatements.toLocaleString("id-ID")}</strong>
              <small>Dalam cakupan akses Anda</small>
            </div>
            <Icon name="chevron" />
          </article>
          <article className="stat-card">
            <div className="stat-icon orange">
              <Icon name="clock" />
            </div>
            <div>
              <span>Menunggu proses</span>
              <strong>
                {(pendingCount + verificationCount).toLocaleString("id-ID")}
              </strong>
              <small>Perlu ditindaklanjuti</small>
            </div>
            <Icon name="chevron" />
          </article>
          <article className="stat-card">
            <div className="stat-icon green">
              <Icon name="check" />
            </div>
            <div>
              <span>Telah disetujui</span>
              <strong>{approvedThisMonth.toLocaleString("id-ID")}</strong>
              <small>Bulan ini</small>
            </div>
            <Icon name="chevron" />
          </article>
        </section>

        <section className="content-grid">
          <div className="panel recent-panel">
            <div className="panel-heading">
              <div>
                <span>AKTIVITAS TERBARU</span>
                <h3>Pernyataan terbaru</h3>
              </div>
              <a href="/statements">
                Lihat semua <Icon name="arrow" size={15} />
              </a>
            </div>
            <div className="statement-list">
              {recentStatements.map((item) => (
                <a className="statement-row" href="/statements" key={item.id}>
                  <div className="document-icon">
                    <Icon name="file" size={20} />
                  </div>
                  <div className="statement-main">
                    <strong>{item.noRef ?? `DRAF-${item.id}`}</strong>
                    <span>
                      {item.pekerja.namaLengkap} ·{" "}
                      {formatJakartaDate(item.updatedAt, {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                  <span className={`status ${statusTone[item.status]}`}>
                    <i />
                    {statusText[item.status]}
                  </span>
                  <span className="row-action">
                    <Icon name="chevron" size={18} />
                  </span>
                </a>
              ))}
              {recentStatements.length === 0 && (
                <p className="fd-empty">Belum ada pengajuan pernyataan.</p>
              )}
            </div>
          </div>
          <div className="panel process-panel">
            <div className="panel-heading">
              <div>
                <span>ALUR PENGAJUAN</span>
                <h3>Status proses</h3>
              </div>
            </div>
            <div className="timeline">
              <div className="done">
                <b>
                  <Icon name="check" size={15} />
                </b>
                <div>
                  <strong>Pengajuan dibuat</strong>
                  <span>
                    {recentStatements[0]
                      ? formatJakartaDate(
                          recentStatements[0].submittedAt ??
                            recentStatements[0].tanggal,
                          { day: "numeric", month: "short", year: "numeric" },
                        )
                      : "Belum ada pengajuan"}
                  </span>
                </div>
              </div>
              <div
                className={
                  currentStage === 1
                    ? "current"
                    : currentStage > 1
                      ? "done"
                      : ""
                }>
                <b>
                  {currentStage > 1 ? <Icon name="check" size={15} /> : "2"}
                </b>
                <div>
                  <strong>Persetujuan atasan</strong>
                  <span>
                    {isRejected && latestStatus === "DITOLAK"
                      ? "Keputusan tercatat"
                      : currentStage === 1
                        ? "Menunggu peninjauan"
                        : currentStage > 1
                          ? "Selesai"
                          : "Belum dimulai"}
                  </span>
                </div>
              </div>
              <div
                className={
                  currentStage === 2
                    ? "current"
                    : currentStage > 2
                      ? "done"
                      : ""
                }>
                <b>
                  {currentStage > 2 ? <Icon name="check" size={15} /> : "3"}
                </b>
                <div>
                  <strong>Persetujuan TI</strong>
                  <span>
                    {currentStage === 2
                      ? "Menunggu peninjauan"
                      : currentStage > 2
                        ? "Selesai"
                        : isRejected
                          ? "Tidak dilanjutkan"
                          : "Menunggu tahap sebelumnya"}
                  </span>
                </div>
              </div>
              <div
                className={
                  currentStage === 3
                    ? "current"
                    : currentStage > 3
                      ? "done"
                      : ""
                }>
                <b>
                  {currentStage > 3 ? <Icon name="check" size={15} /> : "4"}
                </b>
                <div>
                  <strong>Tanda tangan pekerja</strong>
                  <span>
                    {latestStatus === "MENUNGGU_TANDA_TANGAN"
                      ? "Unduh PDF, tanda tangani, lalu unggah scan"
                      : currentStage > 3
                        ? "Scan sudah diunggah"
                        : isRejected
                          ? "Tidak dilanjutkan"
                          : "Menunggu persetujuan TI"}
                  </span>
                </div>
              </div>
              <div
                className={
                  currentStage === 4
                    ? "current"
                    : currentStage > 4
                      ? "done"
                      : ""
                }>
                <b>
                  {currentStage > 4 ? <Icon name="check" size={15} /> : "5"}
                </b>
                <div>
                  <strong>Verifikasi arsip</strong>
                  <span>
                    {currentStage === 4
                      ? "Menunggu pemeriksaan Admin TI"
                      : currentStage > 4
                        ? "Selesai"
                        : isRejected
                          ? "Tidak dilanjutkan"
                          : "Menunggu scan bertanda tangan"}
                  </span>
                </div>
              </div>
            </div>
            {pendingStatements.length > 0 && (
              <a className="approval-link" href="/approvals">
                {pendingStatements.length} pengajuan menunggu tindakan{" "}
                <Icon name="arrow" />
              </a>
            )}
          </div>
        </section>
      </div>
    </FigmaPortalShell>
  );
}
