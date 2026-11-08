# Deployment Portal Pernyataan KAI dengan MySQL

Aplikasi menggunakan Next.js dan Prisma dengan MySQL. Vercel menjalankan aplikasi, sedangkan database MySQL disediakan terpisah. `db:setup-local` hanya untuk database lokal `pernyataan_kai_local`; database Preview/Production harus memakai provisioning berizin.

## 1. Siapkan Repository

Periksa perubahan dan pastikan file rahasia tidak masuk Git:

```powershell
git status --short
git diff --check
git status --ignored --short -- .env .env.local
```

Jangan commit `.env`, URL database, password, atau data pribadi pegawai.

Jangan jalankan `npm run db:setup-local` di Vercel. Command tersebut hanya menerima host localhost dan database `pernyataan_kai_local`.

## 2. Siapkan MySQL

1. Buat database MySQL untuk Preview dan Production secara terpisah.
2. Buat user database dengan hak minimum yang diperlukan.
3. Pastikan koneksi serverless Vercel didukung oleh provider, termasuk TLS dan aturan jaringan.
4. Simpan connection string hanya sebagai environment variable server-side `DATABASE_URL` di Vercel. Jangan memakai prefix `NEXT_PUBLIC_`.

Format connection string:

```text
mysql://USER:URL_ENCODED_PASSWORD@HOST:PORT/DATABASE_NAME
```

Encode karakter khusus di bagian username/password sesuai format URL. Jangan kirim string yang berisi kredensial ke chat atau commit.

## 3. Terapkan Schema

Untuk database baru atau Preview, jalankan dari lingkungan yang dapat mengakses database tersebut:

```powershell
npm install
npm run db:generate
npx prisma validate --schema prisma/schema.prisma
npx prisma db push --schema prisma/schema.prisma
```

`db push` membuat struktur tabel, bukan data pegawai atau akun. Untuk Production yang sudah berisi data penting, siapkan backup dan migrasi versioned yang sudah ditinjau sebelum perubahan schema.

## 4. Masukkan Data dan Akun

Aplikasi tidak menyediakan pendaftaran mandiri. Provisioning resmi memerlukan `BusinessArea`, `Employee`, `User`, relasi atasan, dan minimal satu `FormVersion` aktif. Gunakan hanya data yang Anda berwenang kelola dan prosedur resmi organisasi. Jangan mengunggah data placeholder lokal ke server.

Password harus disimpan sebagai hash `scrypt` dengan format helper aplikasi di `lib/auth/password.ts`, bukan teks mentah. Jangan membuat NIPP atau ketentuan formulir karangan lalu menganggapnya data resmi. Jangan menyalin data produksi ke Preview tanpa persetujuan.

## 5. Deploy ke Vercel

1. Import repository GitHub ke Vercel dan pilih root repository.
2. Tambahkan `DATABASE_URL` pada scope Preview dan Production, masing-masing menunjuk database terpisah.
3. Buat Vercel Blob store privat, lalu tambahkan `BLOB_READ_WRITE_TOKEN` pada scope Preview dan Production. Upload akan gagal dengan aman jika token ini tidak tersedia.
4. Deploy Preview terlebih dahulu.
5. Pastikan build lulus dan route `/login` dapat dimuat.
6. Setelah data akun disiapkan melalui provisioning yang berizin, uji login serta alur tiap role di Preview.
7. Setelah Preview diterima, deploy ke Production dan lakukan smoke test terbatas dengan akun resmi.

## 6. Checklist Alur

- Pekerja login dan mengirim pengajuan.
- Atasan langsung melihat dan memutuskan pengajuan bawahan.
- Admin TI menyetujui tahap TI; pekerja mengunduh PDF, menandatangani secara fisik, lalu mengunggah scan PDF/foto.
- Admin TI memeriksa dokumen bertanda tangan dan memverifikasi arsip hingga status selesai.
- Super Admin memproses tahap yang diizinkan, tanpa memutuskan dokumennya sendiri.
- Penolakan wajib memiliki catatan.
- Status selesai dan ditolak terlihat di arsip; PDF mengikuti snapshot dan metadata formulir terkait.
- Logout menghapus sesi; akses tanpa sesi ditolak.
- PDF dan halaman hanya dapat diakses dalam cakupan role yang berhak.

PDF dari aplikasi harus ditinjau oleh pihak berwenang sebelum digunakan sebagai dokumen resmi. Gunakan aset logo dan isi formulir yang memang disetujui untuk lingkungan tersebut.

## Troubleshooting

| Gejala                             | Pemeriksaan                                                                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Build gagal terkait `DATABASE_URL` | Pastikan variable tersedia pada scope Vercel yang benar, kemudian redeploy.                                      |
| Prisma tidak terhubung             | Periksa host, port, user, password ter-encode, TLS, firewall, dan batas koneksi provider.                        |
| Tabel belum ada                    | Jalankan `npx prisma db push --schema prisma/schema.prisma` pada database yang benar.                            |
| Login tidak berhasil               | Pastikan User dan Employee ada serta aktif, role tepat, NIPP cocok, dan password di-hash dengan format aplikasi. |
| Pengajuan gagal                    | Pastikan BusinessArea pekerja aktif, relasi data sesuai, FormVersion aktif, dan alasan memenuhi validasi.        |
| Unggah lampiran gagal di Vercel    | Pastikan Blob store privat tersedia dan `BLOB_READ_WRITE_TOKEN` sudah diatur pada scope deployment terkait.     |
