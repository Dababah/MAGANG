# Panduan Akses Lokal

Panduan ini untuk menjalankan dan menguji Portal Pernyataan KAI di komputer lokal.

## Status Akun Login

Login menggunakan **NIPP** dan kata sandi akun pekerja yang sudah tersimpan di database. Aplikasi tidak menyediakan pendaftaran akun mandiri.

Untuk database lokal, tersedia seed akun demo. Jalankan `npm run db:seed-demo` setelah schema database siap. Seed hanya berjalan jika `DATABASE_URL` mengarah ke `localhost` dan tidak akan membuat atau mengubah akun pada database remote.

| Role          | NIPP       |
| ------------- | ---------- |
| `PEKERJA`     | `90000001` |
| `ATASAN`      | `90000002` |
| `ADMIN_TI`    | `90000003` |
| `SUPER_ADMIN` | `90000004` |

Akun pekerja sudah dihubungkan sebagai bawahan dari akun atasan. Seed juga menyiapkan business area dan formulir aktif agar pengajuan dapat diuji. Akun dan data ini hanya untuk pengembangan lokal; jangan gunakan di produksi. Seed mewajibkan password yang Anda pilih melalui environment variable `DEMO_PASSWORD`; password tersebut sama untuk semua akun demo. Jangan commit kredensial produksi atau `.env`.

## Menyiapkan Aplikasi

Prasyarat: Node.js/npm dan server MySQL lokal. Pengujian online bukan keharusan untuk pengembangan dan laporan magang. Jika nanti ingin deploy, gunakan penyedia MySQL cloud; Supabase Database tidak kompatibel karena menggunakan PostgreSQL.

1. Dari PowerShell, masuk ke folder proyek:

   ```powershell
   Set-Location "D:\MAGANG KAI"
   ```

2. Salin konfigurasi contoh jika file `.env` belum ada:

   ```powershell
   Copy-Item .env.example .env
   ```

   Sesuaikan `DATABASE_URL` di `.env` dengan connection string MySQL Anda. Untuk deployment online, ikuti `docs/DEPLOY-VERCEL-MYSQL.md`. Jangan membagikan isi `.env`.

3. Pastikan MySQL dapat dijangkau, lalu buat tabel dari skema Prisma dan siapkan Prisma Client:

   ```powershell
   npx prisma db push --schema prisma/schema.prisma
   npm run db:generate
   npm run db:seed-demo
   ```

   `db push` menerapkan skema. `db:seed-demo` hanya berjalan jika hostname database adalah localhost dan `NODE_ENV` bukan production; script ini sengaja tidak dapat menulis akun demo ke database remote. Sebelum seed, atur password demo di PowerShell:

   ```powershell
   $env:DEMO_PASSWORD = "PilihPasswordLokalYangKuat!"
   npm run db:seed-demo
   Remove-Item Env:DEMO_PASSWORD
   ```

4. Jalankan server pengembangan:

   ```powershell
   npm run dev
   ```

5. Buka [http://localhost:3000/login](http://localhost:3000/login), lalu masuk dengan salah satu NIPP demo dan kata sandinya.

## Jika Belum Bisa Masuk

- **NIPP atau kata sandi tidak sesuai:** jalankan `npm run db:seed-demo` pada database lokal, lalu gunakan NIPP dan kata sandi di tabel akun demo.
- **Akun terkunci sementara:** lima kali percobaan kata sandi salah mengunci akun selama 15 menit. Tunggu, lalu coba lagi atau hubungi administrator.
- **Halaman menampilkan error database:** pastikan MySQL berjalan, connection string benar, lalu jalankan kembali `npx prisma db push --schema prisma/schema.prisma` dan `npm run db:generate`.
- **Pengajuan baru gagal karena data belum tersedia:** akun perlu memiliki data pekerja dan business area; pengajuan juga memerlukan formulir aktif (`FormVersion`). `db push` hanya membuat struktur tabel.
- Tautan **Lupa kata sandi?** dan **Hubungi administrator wilayah** mengarah ke email `admin@kai.id`; pastikan alamat itu sesuai dengan lingkungan pengujian Anda.

## Fitur dan Hak Akses

Semua halaman kerja meminta pengguna untuk login. Data yang terlihat dibatasi berdasarkan role akun.

| Role          | Cakupan fitur                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PEKERJA`     | Ringkasan, melihat pernyataan sendiri, mengajukan pernyataan baru, dan melihat arsip sendiri.                                                          |
| `ATASAN`      | Ringkasan, melihat pernyataan sendiri dan bawahan langsung, serta menyetujui atau menolak pengajuan bawahan yang berstatus menunggu atasan.            |
| `ADMIN_TI`    | Melihat data pernyataan lintas pekerja, meninjau pengajuan yang sudah disetujui atasan, dan memberi keputusan tahap TI.                                |
| `SUPER_ADMIN` | Cakupan data lintas pekerja dan akses keputusan tahap atasan maupun TI. Keputusan tetap mengikuti status pengajuan dan pemeriksaan otorisasi aplikasi. |

Menu/halaman yang tersedia:

| URL               | Fungsi                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------- |
| `/`               | Ringkasan sesuai role dan cakupan akun.                                                      |
| `/statements`     | Daftar pernyataan yang terlihat oleh akun. Pekerja dapat memulai pengajuan dari halaman ini. |
| `/statements/new` | Membuat dan mengirim pengajuan (role `PEKERJA`).                                             |
| `/approvals`      | Kotak pengajuan yang menunggu tindakan role terkait.                                         |
| `/archive`        | Pengajuan yang disetujui TI atau ditolak.                                                    |
| `/login`          | Masuk menggunakan NIPP dan kata sandi.                                                       |

Halaman administrasi pegawai dan audit (`/admin/employees` dan `/admin/audit`) belum tersedia di versi proyek ini, walaupun role admin dan model audit sudah ada di skema database.

## Alur Pernyataan

1. Pekerja mengirim formulir dengan alasan/keterangan. Pengajuan baru memerlukan data pekerja dan versi formulir aktif.
2. Status menjadi `DIAJUKAN` dan masuk ke kotak persetujuan atasan langsung.
3. Atasan dapat menyetujui sehingga status menjadi `DISETUJUI_ATASAN`, atau menolak sehingga status menjadi `DITOLAK`.
4. `ADMIN_TI` meninjau status `DISETUJUI_ATASAN`; jika disetujui, status menjadi `DISETUJUI_TI`, dan jika ditolak, status menjadi `DITOLAK`.
5. `SUPER_ADMIN` dapat memproses tahap atasan atau tahap TI sesuai status saat ini.
6. Pengajuan berstatus `DISETUJUI_TI` atau `DITOLAK` muncul di arsip.

## Sesi dan Keluar

Sesi login berlaku selama delapan jam. Endpoint keluar aplikasi adalah `POST /api/auth/logout`; gunakan tombol keluar di antarmuka bila tersedia. Setelah keluar atau sesi berakhir, halaman kerja akan meminta login kembali.
