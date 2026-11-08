# Portal Pernyataan KAI

Portal internal untuk pengajuan pernyataan pekerja, persetujuan berjenjang, verifikasi dokumen, dan arsip. Dibangun dengan Next.js App Router, Prisma, dan MySQL; UI Figma berada di aplikasi Next yang sama.

## Menjalankan aplikasi

1. Salin `.env.example` menjadi `.env` dan isi `DATABASE_URL` serta rahasia sesi.
2. Instal dependency dengan `npm install`.
3. Siapkan database sesuai [panduan lokal](docs/PANDUAN-LOKAL.md).
4. Jalankan `npm run dev`, kemudian buka `http://localhost:3000`.

## Perintah

- `npm run dev` menjalankan server development.
- `npm run build` membuat build produksi.
- `npm run start` menjalankan build produksi.
- `npm run lint` menjalankan ESLint.
- `npm run db:generate` membuat Prisma Client.
- `npm run db:setup-local` menyiapkan data/configurasi lokal.

## Struktur

- `app/`: halaman, API routes, layout, dan stylesheet aplikasi.
- `components/`: komponen UI dan workflow.
- `lib/`: Prisma, autentikasi, scope akses, dan validasi.
- `prisma/`: schema dan dukungan database.
- `public/assets/`: aset visual.

Semua route aplikasi memakai pemeriksaan sesi dan scope role di server. Lihat [PRD](prd.md), [panduan lokal](docs/PANDUAN-LOKAL.md), dan [panduan deployment](docs/DEPLOY-VERCEL-MYSQL.md) untuk detail.
