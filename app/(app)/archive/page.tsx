import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getArchiveScope } from "@/lib/auth/scope";
import { statementStatusSchema } from "@/lib/validators/statement";
import Link from "next/link";
import {
  StatementList,
  PageHeading,
  BackToDashboard,
} from "@/components/statement-list";

export const instant = false;

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const search = params.search?.trim() ?? "";
  const parsedStatus = params.status
    ? statementStatusSchema.safeParse(params.status)
    : null;
  const status = parsedStatus?.success ? parsedStatus.data : undefined;
  const statements = await prisma.statement.findMany({
    where: {
      AND: [
        getArchiveScope(user),
        ...(status ? [{ status }] : []),
        ...(search
          ? [
              {
                OR: [
                  { noRef: { contains: search } },
                  { alasan: { contains: search } },
                  { pekerja: { namaLengkap: { contains: search } } },
                ],
              },
            ]
          : []),
      ],
    },
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
        eyebrow="DOKUMEN SELESAI"
        title="Arsip pernyataan"
        description="Dokumen yang telah diverifikasi Admin TI atau ditolak."
      />
      <section className="page-section">
        <form className="filter-bar" action="/archive">
          <label className="filter-search">
            <span className="sr-only">Cari nomor atau keterangan</span>
            <input
              name="search"
              defaultValue={search}
              placeholder="Cari nomor atau judul dokumen..."
            />
          </label>
          <select
            name="status"
            defaultValue={status ?? ""}
            aria-label="Filter status">
            <option value="">Semua status</option>
            {["SELESAI", "DISETUJUI_TI", "DITOLAK"].map((value) => (
              <option value={value} key={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <button type="submit">Cari</button>
          {(search || status) && <Link href="/archive">Hapus filter</Link>}
        </form>
        <StatementList
          statements={statements}
          emptyMessage="Arsip masih kosong."
        />
      </section>
    </main>
  );
}
