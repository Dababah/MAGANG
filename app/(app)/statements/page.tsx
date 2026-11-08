import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getStatementVisibilityScope } from "@/lib/auth/scope";
import { statementStatusSchema } from "@/lib/validators/statement";
import {
  StatementList,
  PageHeading,
  BackToDashboard,
} from "@/components/statement-list";
import Link from "next/link";

export const instant = false;

type SearchParams = Promise<{ search?: string; status?: string }>;

export default async function StatementsPage({
  searchParams,
}: {
  searchParams: SearchParams;
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
        getStatementVisibilityScope(user),
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
      <section className="page-section">
        <form className="filter-bar" action="/statements">
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
            {statementStatusSchema.options.map((value) => (
              <option value={value} key={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <button type="submit">Cari</button>
          {(search || status) && <Link href="/statements">Hapus filter</Link>}
        </form>
        <StatementList
          statements={statements}
          emptyMessage="Belum ada pernyataan yang tercatat."
        />
      </section>
    </main>
  );
}
