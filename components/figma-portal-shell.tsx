"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type PortalShellProps = {
  children: ReactNode;
  employee: { namaLengkap: string; nipp: string; businessArea: string };
  role: string;
  pendingCount: number;
};

const navigation = [
  { href: "/", label: "Ringkasan", icon: "grid" },
  { href: "/statements", label: "Pernyataan Saya", icon: "file" },
  { href: "/approvals", label: "Persetujuan", icon: "check" },
  { href: "/archive", label: "Arsip Dokumen", icon: "archive" },
];

function Icon({ name, size = 19 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6M8 13h8M8 17h6" />
      </>
    ),
    check: (
      <>
        <path d="m9 11 3 3L22 4" />
        <path d="M21 12a9 9 0 1 1-5.3-8.2" />
      </>
    ),
    archive: (
      <>
        <path d="M3 6h18M5 6v15h14V6M3 3h18v3H3zM9 11h6" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
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
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function FigmaPortalShell({
  children,
  employee,
  role,
  pendingCount,
}: PortalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = [
    ...navigation.filter(
      (item) => item.href !== "/approvals" || role !== "PEKERJA",
    ),
    ...(role === "SUPER_ADMIN"
      ? [
          { href: "/admin/employees", label: "Data Pegawai", icon: "file" },
          { href: "/admin/audit", label: "Audit Aktivitas", icon: "archive" },
        ]
      : []),
  ];
  const pageName =
    items.find((item) => item.href === pathname)?.label ?? "Portal Pernyataan";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="portal-shell">
      {mobileOpen && (
        <button
          className="sidebar-scrim"
          onClick={() => setMobileOpen(false)}
          aria-label="Tutup navigasi"
        />
      )}
      <aside className={`sidebar ${mobileOpen ? "is-open" : ""}`}>
        <Link className="brand brand-light" href="/">
          <img
            src="/assets/kai-logo-official.png"
            alt="PT Kereta Api Indonesia"
          />
          <span>
            <strong>PORTAL</strong> PERNYATAAN
          </span>
        </Link>
        <nav aria-label="Menu utama">
          <span className="nav-label">MENU UTAMA</span>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={pathname === item.href ? "active" : ""}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.href === "/approvals" && pendingCount > 0 && (
                <b>{pendingCount}</b>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-info">
          <span className="online-dot" />
          <div>
            <strong>Sistem operasional</strong>
            <small>Data tersinkron dengan portal</small>
          </div>
        </div>
        <div className="sidebar-user">
          <div className="avatar">{initials(employee.namaLengkap)}</div>
          <div>
            <strong>{employee.namaLengkap}</strong>
            <span>
              {role.replaceAll("_", " ")} · NIPP {employee.nipp}
            </span>
          </div>
          <button onClick={logout} title="Keluar" aria-label="Keluar">
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>
      <div className="portal-main">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setMobileOpen(true)}
            aria-label="Buka navigasi">
            <Icon name="menu" />
          </button>
          <form className="topbar-search" action="/statements">
            <Icon name="search" size={18} />
            <input
              name="search"
              placeholder="Cari nomor pernyataan..."
              aria-label="Cari nomor pernyataan"
            />
          </form>
          <div className="topbar-right">
            <div className="location">
              <span>AREA KERJA</span>
              <strong>{employee.businessArea}</strong>
            </div>
            {role !== "PEKERJA" && (
              <Link
                className="notification"
                href="/approvals"
                aria-label={`Kotak persetujuan, ${pendingCount} menunggu`}>
                <Icon name="bell" size={20} />
                {pendingCount > 0 && <i />}
              </Link>
            )}
            <div className="top-avatar">{initials(employee.namaLengkap)}</div>
          </div>
        </header>
        <main className="page-content">
          <div className="portal-page-heading">
            <span>WORKSPACE</span>
            <strong>{pageName}</strong>
          </div>
          {children}
          <footer className="portal-footer">
            <span>© PT Kereta Api Indonesia (Persero)</span>
            <span>Portal Pernyataan · Internal Use Only</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
