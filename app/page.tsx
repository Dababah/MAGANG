import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const navigation = [
  { label: "Ringkasan", icon: "grid", active: true, href: "/" },
  { label: "Pernyataan saya", icon: "file", href: "/statements" },
  { label: "Persetujuan", icon: "check", count: "3", href: "/approvals" },
  { label: "Arsip", icon: "archive", href: "/archive" },
];

function Icon({ name }: { name: string }) {
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

export default async function Home() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN_TI" || user.role === "SUPER_ADMIN";
  const statementScope =
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
  const pendingScope =
    user.role === "ATASAN"
      ? { pekerja: { atasanId: user.employeeId }, status: "DIAJUKAN" as const }
      : user.role === "ADMIN_TI" || user.role === "SUPER_ADMIN"
        ? { status: "DISETUJUI_ATASAN" as const }
        : { id: -1 };
  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  );

  const [
    totalStatements,
    pendingCount,
    approvedThisMonth,
    employeesCount,
    recentStatements,
    pendingStatements,
  ] = await Promise.all([
    prisma.statement.count({ where: statementScope }),
    prisma.statement.count({
      where: {
        ...statementScope,
        status: { in: ["DIAJUKAN", "DISETUJUI_ATASAN"] },
      },
    }),
    prisma.statement.count({
      where: {
        ...statementScope,
        status: "DISETUJUI_TI",
        updatedAt: { gte: monthStart },
      },
    }),
    isAdmin
      ? prisma.employee.count({ where: { aktif: true } })
      : Promise.resolve(0),
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
    DITOLAK: "Ditolak",
  };
  const statusTone: Record<string, string> = {
    DRAFT: "revision",
    DIAJUKAN: "review",
    DISETUJUI_ATASAN: "approved",
    DISETUJUI_TI: "complete",
    DITOLAK: "revision",
  };

  return (
    <div className="workspace">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Pernyataan KAI, beranda">
          <span className="brand-mark">K</span>
          <span className="brand-copy">
            <strong>pernyataan</strong>
            <small>KERETA API INDONESIA</small>
          </span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <div className="area-switcher">
          <span className="area-dot" />
          <span>
            <strong>{user.employee.businessArea.nama}</strong>
            <small>Wilayah operasional</small>
          </span>
          <span className="switcher-caret">⌄</span>
        </div>
        <div className="nav-label">MENU UTAMA</div>
        <nav className="side-nav" aria-label="Menu utama">
          {navigation.map((item) => (
            <a
              className={`nav-item${item.active ? " active" : ""}`}
              href={item.href}
              key={item.label}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.count && <span className="nav-count">{item.count}</span>}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="secure-note">
            <span className="secure-icon">●</span>
            <span>
              <strong>Ruang kerja aman</strong>
              <small>Data terlindungi</small>
            </span>
          </div>
          <button className="profile-button" type="button">
            <span className="avatar">AP</span>
            <span className="profile-copy">
              <strong>{user.employee.namaLengkap}</strong>
              <small>{user.role.replaceAll("_", " ")}</small>
            </span>
            <span className="profile-more">···</span>
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <Icon name="chevron" />
            <strong>Ringkasan</strong>
          </div>
          <div className="topbar-actions">
            <button
              className="icon-button search-button"
              type="button"
              aria-label="Cari">
              <Icon name="search" />
            </button>
            <button
              className="icon-button notification-button"
              type="button"
              aria-label="Notifikasi">
              <Icon name="bell" />
              <i />
            </button>
            <span className="topbar-divider" />
            <span className="today">
              {new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(
                new Date(),
              )}
            </span>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow">
                <span /> PORTAL PERNYATAAN PEKERJA
              </div>
              <h1>
                Selamat datang, {user.employee.namaLengkap.split(" ")[0]}.
              </h1>
              <p>
                Pantau pengajuan dan persetujuan pernyataan dalam satu tempat.
              </p>
            </div>
            {user.role === "PEKERJA" && (
              <a className="primary-button" href="/statements/new">
                <Icon name="plus" /> Buat pernyataan
              </a>
            )}
          </section>

          <section className="metrics" aria-label="Ringkasan pengajuan">
            <article className="metric-card metric-total">
              <div className="metric-top">
                <span>Total pernyataan</span>
                <span className="metric-icon">
                  <Icon name="file" />
                </span>
              </div>
              <div className="metric-value">
                {totalStatements.toLocaleString("id-ID")}
              </div>
              <div className="metric-foot">
                <span className="metric-note">Dalam cakupan akses Anda</span>
              </div>
            </article>
            <article className="metric-card">
              <div className="metric-top">
                <span>Menunggu persetujuan</span>
                <span className="metric-icon amber">
                  <Icon name="clock" />
                </span>
              </div>
              <div className="metric-value">
                {pendingCount.toLocaleString("id-ID")}
              </div>
              <div className="metric-foot">
                <span className="metric-note">Pengajuan belum selesai</span>
              </div>
            </article>
            <article className="metric-card">
              <div className="metric-top">
                <span>Disetujui bulan ini</span>
                <span className="metric-icon green">
                  <Icon name="check" />
                </span>
              </div>
              <div className="metric-value">
                {approvedThisMonth.toLocaleString("id-ID")}
              </div>
              <div className="metric-foot">
                <span className="metric-note">Persetujuan tahap akhir</span>
              </div>
            </article>
            <article className="metric-card">
              <div className="metric-top">
                <span>{isAdmin ? "Pekerja terdaftar" : "Wilayah kerja"}</span>
                <span className="metric-icon coral">
                  <Icon name="users" />
                </span>
              </div>
              <div className="metric-value">
                {isAdmin ? employeesCount.toLocaleString("id-ID") : "1"}
              </div>
              <div className="metric-foot">
                <span className="metric-note">
                  {user.employee.businessArea.nama}
                </span>
              </div>
            </article>
          </section>

          <section className="content-grid">
            <div className="activity-panel">
              <div className="section-heading">
                <div>
                  <h2>Pengajuan terbaru</h2>
                  <p>Aktivitas pernyataan dari seluruh wilayah</p>
                </div>
                <a className="text-link" href="/statements">
                  Lihat semua <Icon name="arrow" />
                </a>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>PEKERJA</th>
                      <th>NOMOR REFERENSI</th>
                      <th>STATUS</th>
                      <th>TANGGAL</th>
                      <th aria-label="Detail" />
                    </tr>
                  </thead>
                  <tbody>
                    {recentStatements.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="employee-cell">
                            <span className="employee-avatar">
                              {item.namaLengkap
                                .split(" ")
                                .map((part) => part[0])
                                .slice(0, 2)
                                .join("")}
                            </span>
                            <span>
                              <strong>{item.namaLengkap}</strong>
                              <small>{item.businessArea}</small>
                            </span>
                          </div>
                        </td>
                        <td className="ref-cell">
                          {item.noRef ?? `DRAF-${item.id}`}
                        </td>
                        <td>
                          <span
                            className={`status-pill ${statusTone[item.status]}`}>
                            <i />
                            {statusText[item.status]}
                          </span>
                        </td>
                        <td className="time-cell">
                          {item.updatedAt.toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                          })}
                        </td>
                        <td>
                          <a
                            className="row-link"
                            href="/statements"
                            aria-label={`Buka ${item.noRef ?? item.id}`}>
                            <Icon name="chevron" />
                          </a>
                        </td>
                      </tr>
                    ))}
                    {recentStatements.length === 0 && (
                      <tr>
                        <td className="empty-table" colSpan={5}>
                          Belum ada pengajuan pernyataan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="table-footer">
                <span>
                  Menampilkan <strong>{recentStatements.length}</strong>{" "}
                  pengajuan terbaru
                </span>
                <a href="/statements">
                  Buka daftar pernyataan <Icon name="arrow" />
                </a>
              </div>
            </div>

            <aside className="right-column">
              <section className="approval-panel">
                <div className="section-heading compact">
                  <div>
                    <h2>Perlu persetujuan</h2>
                    <p>Antrian yang menunggu tindakan Anda</p>
                  </div>
                  <span className="approval-number">
                    {pendingStatements.length}
                  </span>
                </div>
                <div className="approval-list">
                  {pendingStatements.map((item, index) => (
                    <a
                      href="/approvals"
                      className="approval-item"
                      key={item.id}>
                      <span
                        className={`approval-avatar ${["blue", "yellow", "mint"][index % 3]}`}>
                        {item.pekerja.namaLengkap
                          .split(" ")
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <span className="approval-copy">
                        <strong>{item.pekerja.namaLengkap}</strong>
                        <small>{item.noRef ?? "Pernyataan baru"}</small>
                      </span>
                      <Icon name="chevron" />
                    </a>
                  ))}
                  {pendingStatements.length === 0 && (
                    <p className="empty-approvals">
                      Tidak ada persetujuan yang menunggu.
                    </p>
                  )}
                </div>
                <a className="approval-link" href="/approvals">
                  Buka kotak persetujuan <Icon name="arrow" />
                </a>
              </section>
              <section className="notice-panel">
                <div className="notice-symbol">i</div>
                <div>
                  <strong>Formulir versi terbaru</strong>
                  <p>Gunakan formulir versi 2.4 untuk setiap pengajuan baru.</p>
                  <a href="/statements/new">
                    Lihat ketentuan <Icon name="arrow" />
                  </a>
                </div>
              </section>
            </aside>
          </section>
          <footer className="page-footer">
            <span>PT Kereta Api Indonesia (Persero)</span>
            <span>
              Portal Pernyataan <i /> Sistem internal
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}
