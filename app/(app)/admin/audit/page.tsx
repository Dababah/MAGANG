import { redirect } from "next/navigation";
import { BackToDashboard, PageHeading } from "@/components/statement-list";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { formatJakartaDate } from "@/lib/jakarta-time";

export const instant = false;

export default async function AdminAuditPage() {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/");

  const events = await prisma.auditLog.findMany({
    include: {
      user: {
        include: { employee: { select: { namaLengkap: true, nipp: true } } },
      },
    },
    orderBy: { waktu: "desc" },
    take: 200,
  });

  return (
    <main className="data-page">
      <BackToDashboard />
      <PageHeading
        eyebrow="KEAMANAN DAN KEPATUHAN"
        title="Audit aktivitas"
        description="Catatan login, pengajuan, dan keputusan yang direkam aplikasi."
      />
      <section className="data-panel">
        <div className="data-panel-top">
          <strong>{events.length} aktivitas terbaru</strong>
          <span>Hanya Super Admin</span>
        </div>
        <div className="statement-table-wrap">
          <table className="statement-table">
            <thead>
              <tr>
                <th>WAKTU</th>
                <th>PENGGUNA</th>
                <th>AKSI</th>
                <th>ENTITAS</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id.toString()}>
                  <td className="time-cell">
                    {formatJakartaDate(event.waktu, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td>
                    {event.user
                      ? `${event.user.employee.namaLengkap} · ${event.user.employee.nipp}`
                      : "Pengguna tidak tersedia"}
                  </td>
                  <td>{event.aksi}</td>
                  <td>{event.entitas}</td>
                  <td>{event.entitasId ?? "-"}</td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td className="empty-table" colSpan={5}>
                    Belum ada aktivitas yang tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
