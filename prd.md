# PRD dan Panduan Lengkap Portal Pernyataan KAI

Dokumen ini menjelaskan tujuan produk, perilaku aplikasi yang tersedia, struktur teknis, cara menyiapkan lingkungan lokal, serta tutorial penggunaan dari login sampai logout. Isi dokumen merujuk pada implementasi repository saat ini. Fitur yang belum tersedia di antarmuka atau masih berupa model/endpoint ditandai secara khusus agar tidak disalahartikan sebagai fitur yang sudah selesai.

## 1. Ringkasan Produk

Portal Pernyataan KAI adalah aplikasi internal untuk mengelola pengajuan pernyataan pekerja dan persetujuan berjenjang. Pekerja mengisi keterangan, atasan langsung meninjau pengajuan, lalu Admin TI menyelesaikan tahap persetujuan berikutnya. Pengajuan yang disetujui di tahap TI atau ditolak masuk ke arsip.

Produk menggunakan Next.js App Router untuk antarmuka dan API, Prisma ORM untuk akses MySQL, serta sistem sesi berbasis cookie. Akun dibuat dan dikelola di database, bukan melalui pendaftaran mandiri.

### Tujuan

- Menyediakan satu alur digital untuk pengajuan dan persetujuan pernyataan pekerja.
- Membatasi data dan tindakan sesuai role, status dokumen, serta hubungan atasan-bawahan.
- Menyimpan snapshot identitas pekerja pada dokumen agar data pengajuan tetap konsisten dengan keadaan saat dokumen dibuat.
- Mencatat tindakan penting pada audit log.
- Menyediakan identitas dokumen berupa nomor referensi bulanan.

### Pengguna

- Pekerja yang mengajukan dan memantau pernyataan sendiri.
- Atasan yang meninjau pengajuan pekerja yang menjadi bawahan langsung.
- Admin TI yang memproses tahap persetujuan TI.
- Super Admin yang dapat memproses tahap atasan atau TI, dengan batasan status dan pemeriksaan otorisasi yang sama.

## 2. Cakupan dan Status Fitur

| Area                                                            | Status implementasi saat ini                                                     |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Login menggunakan NIPP dan kata sandi                           | Tersedia                                                                         |
| Sesi login berbasis cookie, masa berlaku 8 jam                  | Tersedia                                                                         |
| Penguncian setelah 5 percobaan kata sandi gagal selama 15 menit | Tersedia                                                                         |
| Ringkasan dan daftar pernyataan                                 | Tersedia                                                                         |
| Pengajuan baru oleh pekerja                                     | Tersedia melalui halaman dan API                                                 |
| Kotak daftar pengajuan menunggu tindakan                        | Tersedia                                                                         |
| Endpoint keputusan persetujuan/penolakan                        | Tersedia di API                                                                  |
| Tombol aksi persetujuan/penolakan di antarmuka                  | Tersedia pada antrean `/approvals` sesuai role dan status                        |
| Arsip untuk dokumen selesai atau ditolak                        | Tersedia                                                                         |
| Pencatatan audit login, logout, pengajuan, dan keputusan        | Tersedia di API                                                                  |
| Halaman admin pegawai dan halaman audit                         | Tersedia; hanya Super Admin yang dapat mengakses                                 |
| Pengunduhan PDF pernyataan                                      | Tersedia sebagai salinan digital berdasarkan snapshot dan versi formulir terkait |
| Lupa kata sandi otomatis                                        | Belum tersedia; tautan menghubungi email administrator                           |
| Pendaftaran mandiri                                             | Tidak tersedia                                                                   |
| Pencarian, notifikasi, atau pengubah area kerja di dashboard    | Belum berfungsi sebagai alur aplikasi pada implementasi yang diperiksa           |

Dokumen ini tidak menganggap fitur yang hanya muncul sebagai model database, direktori kosong, teks UI, atau dependency sebagai fitur siap pakai.

## 3. Istilah dan Status Dokumen

Status yang didefinisikan di database:

| Status teknis      | Arti                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `DRAFT`            | Draf. Status tersedia di skema, tetapi pembuatan draf terpisah belum menjadi alur aktif; pengajuan melalui formulir langsung dikirim. |
| `DIAJUKAN`         | Pengajuan telah dikirim dan menunggu tahap atasan.                                                                                    |
| `DISETUJUI_ATASAN` | Tahap atasan selesai disetujui dan dokumen menunggu Admin TI.                                                                         |
| `DISETUJUI_TI`     | Tahap akhir disetujui; dokumen dianggap selesai dan masuk arsip.                                                                      |
| `DITOLAK`          | Pengajuan ditolak pada salah satu tahap; dokumen masuk arsip.                                                                         |

Pada setiap penolakan, catatan wajib disertakan. Catatan persetujuan bersifat opsional.

## 4. Matriks Role dan Akses

| Role          | Cakupan data utama                      | Aksi yang diizinkan                                                                                                                                                |
| ------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PEKERJA`     | Pernyataan milik sendiri                | Melihat ringkasan, daftar sendiri, arsip sesuai query, dan mengirim pengajuan baru.                                                                                |
| `ATASAN`      | Pernyataan sendiri dan bawahan langsung | Melihat ringkasan/list dalam cakupan; API dapat memproses tahap 1 untuk bawahan langsung. Tidak dapat memproses dokumen sendiri.                                   |
| `ADMIN_TI`    | Data lintas pekerja                     | Melihat ringkasan/list; API dapat memproses dokumen berstatus `DISETUJUI_ATASAN` pada tahap TI.                                                                    |
| `SUPER_ADMIN` | Data lintas pekerja                     | Melihat ringkasan/list; API dapat memproses tahap 1 untuk status `DIAJUKAN`, atau tahap TI untuk status `DISETUJUI_ATASAN`. Tidak dapat memproses dokumen sendiri. |

Catatan cakupan:

- Halaman `/approvals` menampilkan detail pengajuan dan kontrol Setujui/Tolak; API tetap memeriksa role, tahap, relasi atasan, dan larangan menyetujui dokumen sendiri.
- Halaman pegawai dan audit tersedia dan dapat diakses hanya oleh Super Admin melalui URL langsung atau link di sidebar; otorisasi ditegakkan di server.
- Data untuk `ADMIN_TI`/`SUPER_ADMIN` pada halaman daftar pernyataan tidak dibatasi ke satu business area. Pekerja dan atasan memiliki filter khusus sesuai role.

## 5. Peta Halaman dan API

### Halaman

| URL                | Fungsi                                                                 |
| ------------------ | ---------------------------------------------------------------------- |
| `/login`           | Form login dengan NIPP dan kata sandi.                                 |
| `/`                | Dashboard ringkasan sesuai sesi dan role.                              |
| `/statements`      | Daftar pengajuan sesuai cakupan role.                                  |
| `/statements/new`  | Form pengajuan baru; halaman dan API hanya mengizinkan role `PEKERJA`. |
| `/approvals`       | Daftar dokumen yang menunggu tindakan sesuai role.                     |
| `/archive`         | Daftar dokumen berstatus `DISETUJUI_TI` atau `DITOLAK`.                |
| `/admin/employees` | Daftar pegawai dengan role dan status; hanya Super Admin.              |
| `/admin/audit`     | Catatan audit event hingga 200 terakhir; hanya Super Admin.            |

Halaman kerja memerlukan sesi. Jika sesi tidak ada atau tidak valid, halaman server mengarahkan pengguna ke `/login`.

### API

| Method dan URL                 | Tujuan                                                                      | Respons penting                                                                  |
| ------------------------------ | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `POST /api/auth/login`         | Memvalidasi kredensial, mencatat login, dan membuat sesi.                   | `200`, `400`, `401`, atau `423` saat akun terkunci.                              |
| `POST /api/auth/logout`        | Menghapus sesi dan cookie, kemudian mencatat logout bila pengguna dikenali. | JSON berisi `ok` dan `redirectTo: "/login"`.                                     |
| `GET /api/statements`          | Mengambil daftar dokumen dengan filter status opsional.                     | Maksimal 100 data; `401` jika belum login, `400` jika status tidak valid.        |
| `POST /api/statements`         | Membuat dan langsung mengirim pernyataan.                                   | `201`; `400`, `401`, `403`, atau `409` untuk kondisi yang sesuai.                |
| `GET /api/statements/{id}/pdf` | Mengunduh salinan digital PDF sesuai cakupan akses pengguna.                | `200` PDF; `400`, `401`, atau `404` bila dokumen di luar cakupan/tidak tersedia. |
| `POST /api/approvals/{id}`     | Menyetujui atau menolak dokumen sesuai role dan status.                     | `200`; `400`, `401`, `403`, `404`, atau `409`.                                   |

Halaman admin pegawai (`/admin/employees`) menampilkan daftar semua pekerja aktif yang terdaftar di database, lengkap dengan role akun, status, dan hubungan atasan. Halaman audit (`/admin/audit`) menampilkan hingga 200 event terakhir dengan detail waktu, pengguna, aksi, dan entitas. Keduanya hanya dapat diakses oleh Super Admin; role lain akan diarahkan ke halaman utama.

Tidak ada endpoint edit, hapus, atau pembacaan audit yang dapat diakses publik. PDF adalah salinan digital yang disusun dari snapshot dan data `FormVersion`; kesesuaian visual dan legalnya dengan formulir resmi harus ditinjau unit terkait sebelum digunakan sebagai dokumen resmi.

## 6. Alur Kerja Utama

### 6.1 Login

1. Pengguna membuka `/login`.
2. Pengguna memasukkan NIPP dan kata sandi.
3. Browser mengirim `POST /api/auth/login` dengan JSON `{ "nipp": "...", "password": "..." }`.
4. Server memvalidasi format, mencari user melalui NIPP pekerja, dan memeriksa status aktif user serta pekerja.
5. Password diverifikasi terhadap hash `scrypt`; password mentah tidak disimpan di database.
6. Jika benar, penghitung kegagalan direset, sesi dibuat, cookie sesi dikirim, dan audit `LOGIN` dicatat.
7. Browser diarahkan ke `/`.

Perlindungan login:

- Lima kata sandi salah pada NIPP terdaftar dan aktif mengunci akun sementara; NIPP tidak terdaftar tidak memiliki penghitung percobaan.
- Penguncian berlangsung 15 menit.
- Pesan kredensial salah tidak membedakan apakah NIPP ada, untuk mengurangi kebocoran informasi akun.
- User atau pekerja yang tidak aktif tidak dapat login.

### 6.2 Membaca Dashboard

Dashboard menampilkan ringkasan seperti jumlah pernyataan, jumlah yang menunggu persetujuan, jumlah persetujuan tahap akhir pada bulan berjalan, dan pengajuan terbaru. Data query mengikuti role.

Elemen visual pencarian/notifikasi atau angka contoh yang tampak pada antarmuka tidak selalu berarti fungsi terkait tersedia. Gunakan daftar halaman sebagai sumber data operasional dan perhatikan batasan fitur pada bagian 2.

### 6.3 Membuat dan Mengirim Pernyataan

1. Login sebagai `PEKERJA`.
2. Buka `/statements/new` atau gunakan tombol pembuatan dari ringkasan/daftar.
3. Periksa identitas snapshot dan ketentuan pada versi formulir aktif, lalu isi alasan atau keterangan dengan panjang 10 sampai 5.000 karakter.
4. Periksa kembali isi karena pengiriman langsung membuat pengajuan; tidak ada penyimpanan draf terpisah di form ini.
5. Kirim formulir.
6. API memastikan sesi aktif dan role `PEKERJA`.
7. API memuat data pekerja aktif, business area aktif, dan versi formulir aktif. Jika salah satunya tidak tersedia, request gagal dengan `409`.
8. Nomor referensi dibuat dalam transaksi dengan format `PST-YYYY-MM-NNNN`, menggunakan counter per tahun dan bulan Asia/Jakarta.
9. Snapshot identitas (nama, NIPP, jabatan, tempat kedudukan, dan business area), alasan, versi formulir, tanggal, status `DIAJUKAN`, dan waktu pengajuan disimpan.
10. Audit `AJUKAN_PERNYATAAN` dicatat. Browser mengarahkan pengguna kembali ke daftar, tempat salinan PDF dapat diunduh.

Alasan tidak boleh berisi kata sandi atau informasi rahasia. Pengajuan yang sudah dibuat tidak memiliki fitur edit atau pembatalan pada UI/API yang diperiksa.

### 6.4 Meninjau dan Memutuskan Pengajuan

Alur status:

```text
DIAJUKAN
  ├─ Setuju tahap atasan -> DISETUJUI_ATASAN -> Setuju Admin TI -> DISETUJUI_TI
  └─ Tolak tahap atasan  -> DITOLAK

DISETUJUI_ATASAN
  ├─ Setuju Admin TI -> DISETUJUI_TI
  └─ Tolak Admin TI  -> DITOLAK
```

- Atasan hanya dapat memproses pengajuan bawahan langsung, ketika status `DIAJUKAN`.
- Admin TI hanya dapat memproses status `DISETUJUI_ATASAN`.
- Super Admin dapat memproses tahap yang sesuai status, baik tahap atasan maupun TI.
- Pengguna tidak dapat memproses dokumen miliknya sendiri.
- `SETUJU` mengubah status ke tahap berikutnya; `TOLAK` mengubah status ke `DITOLAK`.
- Catatan maksimal 2.000 karakter. Jika keputusan `TOLAK`, catatan wajib diisi.
- Keputusan dan perubahan status disimpan secara transaksional; kondisi balapan menghasilkan `409` jika dokumen sudah diproses pengguna lain.
- API membuat baris `Approval` dan audit `SETUJUI_PERNYATAAN` atau `TOLAK_PERNYATAAN`.

**Di halaman `/approvals` (untuk Atasan, Admin TI, Super Admin):**

1. Halaman menampilkan daftar pengajuan yang menunggu tindakan sesuai role dan status.
2. Buka kartu pengajuan untuk membaca identitas pekerja dan alasan detail.
3. Tambahkan catatan bila diperlukan (maksimal 2.000 karakter); catatan wajib diisi saat menolak.
4. Tekan **Setujui** untuk melanjutkan status ke tahap berikutnya, atau **Tolak** untuk mengakhiri pengajuan sebagai ditolak.
5. Sistem menampilkan error dengan pesan yang jelas bila server menolak keputusan (misal, tidak berwenang, dokumen sudah diproses orang lain, catatan kurang).
6. Setelah keputusan berhasil, antrean diperbarui dan item hilang dari list (karena status berubah atau tahap berbeda).

### 6.5 Melihat Arsip

Arsip mengembalikan pengajuan berstatus `DISETUJUI_TI` atau `DITOLAK`, diurutkan berdasarkan waktu perubahan terbaru, dengan batas 100 data. Pekerja melihat data sendiri, atasan melihat data sendiri dan bawahan langsung, sedangkan role admin memiliki cakupan lintas pekerja.

### 6.7 Admin: Melihat Data Pegawai dan Audit

**Halaman `/admin/employees` (Super Admin saja):**

1. Daftar menampilkan semua pekerja terdaftar dengan kolom nama, NIPP, jabatan, area kerja, atasan langsung, role akun, dan status aktif.
2. Data diurutkan berdasarkan area kerja, kemudian nama.
3. Pekerja tanpa akun user menampilkan "Belum ada" pada kolom akun.
4. Status aktif menunjukkan kombinasi: akun dan pekerja harus sama-sama aktif untuk dianggap `Aktif`.
5. Halaman ini tidak menyediakan edit atau delete; gunakan metode administrasi lain untuk perubahan data pekerja.

**Halaman `/admin/audit` (Super Admin saja):**

1. Tabel menampilkan hingga 200 event audit terbaru dengan kolom waktu, pengguna, aksi, entitas, dan ID entitas.
2. Event diurutkan berdasarkan waktu terbaru terlebih dahulu.
3. Event yang tercatat mencakup: `LOGIN`, `LOGOUT`, `AJUKAN_PERNYATAAN`, `SETUJUI_PERNYATAAN`, `TOLAK_PERNYATAAN`.
4. Pengguna ditampilkan sebagai nama dan NIPP. Jika akun dihapus, tampil "Pengguna tidak tersedia".
5. Halaman ini bersifat read-only; tidak ada aksi edit atau hapus event.
6. Untuk keperluan analisis atau compliance, export/download data audit mungkin diperlukan di tahap operasional lanjutan.

Sesi disimpan di database dengan ID berupa hash SHA-256 token acak. Cookie `pernyataan_session` bersifat `httpOnly`, `sameSite=lax`, ber-path `/`, dan kedaluwarsa setelah 8 jam. Pada produksi, cookie diberi atribut `secure`.

Endpoint keluar adalah `POST /api/auth/logout`. Endpoint menghapus record sesi dan cookie, lalu mencatat audit `LOGOUT` bila sesi pengguna masih dapat dikenali. Sesi yang kedaluwarsa atau terkait akun nonaktif dibersihkan ketika sesi dibaca.

Gunakan tombol **Keluar** pada sidebar dashboard. Tombol memanggil `POST /api/auth/logout`, menghapus sesi, dan mengarahkan pengguna ke `/login`.

### 6.8 Mengunduh PDF Pernyataan

**Endpoint `/api/statements/{id}/pdf`:**

1. Pengguna atau pekerja dapat mengunduh PDF untuk dokumen yang berada dalam cakupan akses mereka.
2. Pekerja dapat mengunduh untuk dokumen miliknya sendiri; atasan untuk dokumen sendiri atau bawahan langsung; admin untuk semua.
3. PDF hanya dapat diunduh setelah dokumen berstatus `DIAJUKAN` atau lebih lanjut (tidak dalam draf).
4. Respons berisi file PDF dengan nama `PST-{nomor_referensi}.pdf`, misal `PST-2026-11-0001.pdf`.
5. PDF berisi snapshot identitas pekerja, alasan pengajuan, nomor referensi, tanggal, dan format dokumen formal.
6. Kesesuaian visual dan legalitas PDF dengan formulir resmi harus ditinjau unit terkait sebelum penggunaan sebagai dokumen resmi.

## 7. Data dan Model Database

Database MySQL didefinisikan dalam `prisma/schema.prisma` dan diakses server-side melalui Prisma Client.

| Model          | Tanggung jawab                                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| `BusinessArea` | Kode, nama, dan status aktif area kerja.                                                                       |
| `Employee`     | NIPP, nama, jabatan, tempat kedudukan, business area, atasan langsung, dan status aktif.                       |
| `User`         | Hubungan ke pekerja, email opsional, hash password, role, status aktif, percobaan gagal, dan waktu penguncian. |
| `Session`      | Hash token sesi, user, waktu dibuat, dan kedaluwarsa.                                                          |
| `FormVersion`  | Nomor dokumen, versi, tanggal terbit, teks ketentuan, status aktif.                                            |
| `Statement`    | Snapshot identitas, referensi, tanggal, alasan, status, versi formulir, dan waktu pengajuan/perubahan.         |
| `Approval`     | Tahap, approver, keputusan, catatan, dan waktu keputusan.                                                      |
| `AuditLog`     | User, aksi, entitas, data sebelum/sesudah opsional, IP opsional, dan waktu.                                    |
| `RefCounter`   | Counter nomor referensi berdasarkan tahun dan bulan.                                                           |

Relasi penting: setiap pekerja mempunyai satu user opsional; pekerja dapat memiliki atasan yang juga merupakan pekerja; setiap statement terkait pekerja dan versi formulir; approval mengaitkan statement dan approver; session terkait user; audit log dapat tetap ada jika user dihapus karena relasinya mengatur `SetNull`.

## 8. Teknologi dan Struktur Repository

- Next.js 16 App Router dan React 19: halaman server/client serta route handler API.
- TypeScript: pemeriksaan tipe aplikasi.
- Prisma 6 dan MySQL: skema serta akses data. Database dapat berjalan lokal atau melalui penyedia MySQL cloud.
- Zod: validasi input request.
- Node.js `crypto` (`scrypt`, `randomBytes`, SHA-256): password dan sesi.
- ESLint 9: lint.
- Tailwind CSS 4 melalui konfigurasi Turbopack serta CSS aplikasi di `app/globals.css`.

Folder penting:

| Lokasi                    | Isi                                                      |
| ------------------------- | -------------------------------------------------------- |
| `app/`                    | Halaman, layout, dan API route.                          |
| `app/api/`                | Endpoint autentikasi, statement, dan approval.           |
| `components/`             | Komponen tampilan daftar dan heading.                    |
| `lib/auth/`               | Password dan manajemen sesi.                             |
| `lib/validators/`         | Skema validasi Zod untuk login, statement, dan approval. |
| `lib/prisma.ts`           | Client Prisma bersama.                                   |
| `prisma/schema.prisma`    | Model dan relasi database.                               |
| `scripts/setup-local.mjs` | Menyiapkan akun placeholder khusus database lokal.       |
| `docs/PANDUAN-LOKAL.md`   | Petunjuk lokal ringkas.                                  |

## 9. Persiapan Lingkungan Lokal

### Prasyarat

- Node.js versi yang kompatibel dengan Next.js 16 dan npm.
- Server MySQL yang dapat dijangkau. Untuk uji online, gunakan penyedia MySQL cloud; untuk pengembangan offline, gunakan MySQL lokal.
- PowerShell di Windows (contoh perintah di bawah mengikuti workspace ini).

### Instalasi dan konfigurasi

1. Buka PowerShell pada direktori proyek:

   ```powershell
   Set-Location "D:\MAGANG KAI"
   ```

2. Pasang dependency jika belum tersedia:

   ```powershell
   npm install
   ```

3. Siapkan file konfigurasi jika `.env` belum ada:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Edit `DATABASE_URL` dalam `.env` agar cocok dengan MySQL yang digunakan. Untuk deployment Vercel, ikuti [panduan deploy](docs/DEPLOY-VERCEL-MYSQL.md). Jangan commit URL asli:

   ```dotenv
   DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DATABASE_NAME"
   NODE_ENV="development"
   ```

   Jangan menyalin kredensial contoh ke server produksi atau membagikan isi `.env`.

5. Untuk pengembangan tanpa data resmi, buat database lokal terpisah bernama `pernyataan_kai_local`, lalu siapkan tabel dan akun placeholder:

   ```powershell
   npm run db:generate
   npx prisma db push --schema prisma/schema.prisma
   $env:LOCAL_APP_PASSWORD = "PasswordLokalYangKuat!"
   npm run db:setup-local
   Remove-Item Env:LOCAL_APP_PASSWORD
   ```

   Set `DATABASE_URL` ke host localhost dan database `pernyataan_kai_local` sebelum perintah tersebut. `db:setup-local` membuat empat role, relasi atasan-bawahan, dan formulir contoh. Gunakan hanya untuk lokal; jangan jalankan di Preview atau Production.

6. Jalankan server pengembangan:

   ```powershell
   npm run dev
   ```

7. Buka `http://localhost:3000/login`.

NIPP akun lokal: `LOCAL-PEKERJA-01`, `LOCAL-ATASAN-01`, `LOCAL-ADMIN-TI-01`, dan `LOCAL-SUPER-ADMIN-01`. Password semua akun adalah nilai `LOCAL_APP_PASSWORD` yang dipilih. Placeholder ini hanya untuk menguji logika, bukan data KAI. Untuk deployment resmi, gunakan provisioning dan formulir yang disetujui.

## 10. Tutorial Pengujian Manual dari Awal sampai Akhir

### A. Pastikan aplikasi siap

1. Pastikan MySQL berjalan atau database cloud dapat dijangkau, serta `.env` menunjuk ke database yang benar.
2. Pastikan `.env` menunjuk ke database yang memang disiapkan untuk pengembangan, lalu jalankan `npx prisma db push --schema prisma/schema.prisma` dan `npm run db:generate`. Pastikan administrator telah menyiapkan akun dan data yang diizinkan.
3. Jalankan `npm run dev` dan buka `/login`.

### B. Uji login pekerja

1. Masuk dengan NIPP dan password akun pekerja yang telah disiapkan administrator.
2. Pastikan diarahkan ke dashboard.
3. Pastikan nama pekerja, role, area, serta ringkasan tampil.
4. Buka `/statements` untuk melihat data dalam cakupan akun.

### C. Buat pengajuan

1. Pilih **Buat pernyataan** dari ringkasan atau buka `/statements/new`.
2. Masukkan keterangan minimal 10 karakter dan maksimal 5.000 karakter.
3. Kirim pengajuan dan pastikan kembali ke `/statements`.
4. Pastikan record memiliki status `DIAJUKAN` serta nomor yang bentuknya seperti `PST-2026-10-0001` (tahun/bulan mengikuti tanggal lokal server).
5. Catat bahwa nomor bertambah berdasarkan counter tahun-bulan; jangan mengasumsikan nomor selalu berakhiran `0001` jika database sudah pernah digunakan.

### D. Uji visibilitas atasan

1. Keluar melalui endpoint sesi sebagaimana bagian 6.6, atau gunakan sesi browser terpisah.
2. Login sebagai akun atasan yang terkait dengan pekerja tersebut.
3. Buka `/approvals` dan pastikan pengajuan bawahan muncul.
4. Buka kartu pengajuan, lalu uji **Setujui**. Setelah berhasil, status berubah menjadi `DISETUJUI_ATASAN` dan item tidak lagi berada pada antrean atasan.

### E. Uji penolakan dari antarmuka

1. Buat pengajuan lain sebagai pekerja.
2. Login sebagai atasan dan buka `/approvals`.
3. Coba menolak tanpa catatan; UI harus meminta catatan dan tidak mengirim keputusan.
4. Isi alasan penolakan lalu pilih **Tolak**; status harus berubah menjadi `DITOLAK`.

### F. Uji keputusan melalui API (opsional untuk pengembang)

API membutuhkan cookie sesi yang sama dari browser. Body keputusan yang valid:

```json
{
  "keputusan": "SETUJU",
  "catatan": "Ditinjau dan disetujui."
}
```

Untuk penolakan:

```json
{
  "keputusan": "TOLAK",
  "catatan": "Mohon lengkapi keterangan yang diperlukan."
}
```

Kirim `POST /api/approvals/{id}` dengan `Content-Type: application/json` dan cookie sesi pengguna yang sesuai. Atasan harus memiliki hubungan bawahan langsung; Admin TI harus menggunakan dokumen berstatus `DISETUJUI_ATASAN`; Super Admin harus menggunakan status yang sesuai tahapnya. Jangan menaruh token/cookie produksi ke log, chat, atau repositori.

### G. Uji tahap TI dan arsip

1. Jika atasan menyetujui, status menjadi `DISETUJUI_ATASAN`.
2. Login sebagai Admin TI atau Super Admin yang telah disiapkan.
3. Buka `/approvals`; dokumen dengan status `DISETUJUI_ATASAN` akan tampil dengan label "TAHAP TI".
4. Proses keputusan tahap berikutnya melalui halaman atau API.
5. Jika disetujui, status menjadi `DISETUJUI_TI`; jika ditolak, status `DITOLAK`.
6. Buka `/archive` dan pastikan dokumen selesai/ditolak terlihat sesuai cakupan role.

### H. Uji unduh PDF

1. Setelah pengajuan dibuat (status `DIAJUKAN`), buka halaman `/statements`.
2. Cari baris dengan nomor referensi (misal `PST-2026-11-0001`) dan klik tombol **Unduh PDF**.
3. Browser harus mengunduh file PDF dengan nama `PST-2026-11-0001.pdf`.
4. Buka PDF dengan viewer dan verifikasi:
   - Header berisi logo KAI dan informasi dokumen.
   - Metadata termasuk nomor referensi, tanggal, identitas pekerja snapshot.
   - Alasan pengajuan ditampilkan.
   - Tanda tangan/tempat kosong untuk ditandatangani (jika relevan untuk template).
5. Pastikan PDF dapat diunduh di berbagai status dokumen (minimal `DIAJUKAN` ke atas).

### I. Uji logout

1. Pilih **Keluar** dari sidebar dashboard.
2. Pastikan browser diarahkan ke `/login`.
3. Buka kembali `/`; server seharusnya meminta login kembali.
4. Untuk memastikan, panggil `GET /api/statements` setelah logout; API seharusnya menjawab `401`.

### J. Uji akses admin (Super Admin saja)

1. Login sebagai akun Super Admin.
2. Buka `/admin/employees` dan pastikan tabel pegawai dengan role dan status tampil.
3. Buka `/admin/audit` dan pastikan tabel event audit dengan login, logout, pengajuan, dan keputusan terlihat.
4. Logout lalu login sebagai role lain (pekerja, atasan, atau admin TI).
5. Coba akses `/admin/employees` atau `/admin/audit` secara langsung (URL bar).
6. Server seharusnya mengarahkan kembali ke `/` karena role tidak berwenang.

## 11. Validasi Input dan Respons Error

| Kondisi                                                                                 | Respons/hasil                                       |
| --------------------------------------------------------------------------------------- | --------------------------------------------------- |
| NIPP kosong atau data login malformed                                                   | `400` dengan pesan validasi.                        |
| NIPP/password salah, akun nonaktif                                                      | `401` dengan pesan generik kredensial tidak sesuai. |
| Akun terkunci                                                                           | `423`; tunggu 15 menit sebelum mencoba lagi.        |
| Sesi tidak ada pada API terlindungi                                                     | `401`.                                              |
| Role bukan pekerja mengirim statement                                                   | `403`.                                              |
| Alasan kurang dari 10 atau lebih dari 5.000 karakter                                    | `400`.                                              |
| Data pekerja atau formulir aktif tidak ditemukan                                        | `409`; siapkan data dasar/form version aktif.       |
| Keputusan bukan `SETUJU`/`TOLAK`, catatan terlalu panjang, atau penolakan tanpa catatan | `400`.                                              |
| Tidak berwenang berdasarkan role, hubungan, status, atau dokumen sendiri                | `403`.                                              |
| Dokumen tidak ditemukan                                                                 | `404`.                                              |
| Dokumen sudah diproses request lain                                                     | `409`.                                              |

## 12. Keamanan dan Operasional

- Hash kata sandi dibuat dengan `scrypt`, salt acak, dan perbandingan `timingSafeEqual`.
- Token sesi acak tidak disimpan mentah dalam database; database menyimpan SHA-256 token.
- Cookie sesi `httpOnly` mencegah akses langsung oleh JavaScript halaman; `secure` aktif pada production.
- Endpoint yang melakukan perubahan memvalidasi sesi, role, status saat ini, dan relasi atasan-bawahan.
- Perubahan keputusan memakai transaksi database dan pemeriksaan status untuk mencegah pemrosesan ganda.
- Input divalidasi dengan Zod di server; validasi sisi browser tidak menggantikan pemeriksaan server.
- Tidak tersedia seed akun; data dan akun disiapkan melalui provisioning yang berizin.
- `AuditLog` mencatat login, logout, pengajuan, serta keputusan. Percobaan login gagal tidak dicatat sebagai event audit saat ini.
- `ip` tersedia sebagai kolom audit tetapi belum diisi oleh alur yang diperiksa.
- Pastikan backup database, kebijakan retensi, akses database, dan pengelolaan secret ditentukan sebelum produksi.
- Aplikasi memakai `db push` pada panduan lokal; strategi migrasi versioned perlu disepakati sebelum deployment produksi.

## 13. Perintah Pengembangan dan Pemeriksaan

| Perintah                                           | Tujuan                                                  |
| -------------------------------------------------- | ------------------------------------------------------- |
| `npm run dev`                                      | Menjalankan server pengembangan Next.js.                |
| `npm run build`                                    | Membuat build produksi dan memvalidasi prerender/build. |
| `npm run start`                                    | Menjalankan build produksi yang sudah dibuat.           |
| `npm run lint`                                     | Menjalankan ESLint.                                     |
| `npx tsc --noEmit`                                 | Memeriksa tipe TypeScript tanpa menghasilkan output.    |
| `npm run db:generate`                              | Menghasilkan Prisma Client dari schema.                 |
| `npx prisma db push --schema prisma/schema.prisma` | Menyelaraskan schema ke database lokal.                 |

Pemeriksaan build/lint/typecheck tidak menggantikan pengujian integrasi MySQL atau pengujian browser terhadap role dan alur sesi.

## 14. Pemecahan Masalah

### Login gagal

- Pastikan NIPP dan kata sandi sesuai akun di database.
- Pastikan administrator telah menyiapkan akun dan data employee yang aktif; aplikasi tidak membuat akun otomatis.
- Jika akun dikunci setelah lima kegagalan, tunggu 15 menit.
- Pastikan record User dan Employee sama-sama aktif.

### Error koneksi/database

- Pastikan MySQL hidup, database telah dibuat, dan `DATABASE_URL` tepat.
- Jalankan `npx prisma db push --schema prisma/schema.prisma` lalu `npm run db:generate`.
- Jangan meletakkan tanda kutip yang tidak semestinya atau password database yang belum di-URL-encode pada URL koneksi.

### Pengajuan tidak dapat dibuat

- Pastikan login sebagai `PEKERJA`.
- Pastikan alasan memiliki 10 sampai 5.000 karakter.
- Pastikan pekerja memiliki business area.
- Pastikan terdapat `FormVersion` aktif.
- Periksa log server untuk error database yang tidak dikembalikan sebagai respons validasi.

### Pengajuan tidak terlihat oleh atasan

- Pastikan `Employee.atasanId` pekerja menunjuk ke ID employee akun atasan.
- Pastikan status masih `DIAJUKAN`.
- Pastikan akun atasan aktif dan login menggunakan role `ATASAN` yang tepat.

### Tidak dapat mengeksekusi keputusan

- Pastikan request memakai sesi yang aktif dan JSON yang valid.
- Pastikan role, status statement, relasi atasan, dan tahap cocok.
- Penolakan harus menyertakan catatan.
- Ingat bahwa halaman approvals belum memiliki kontrol keputusan; API dapat dipanggil untuk pengujian, tetapi UI aksi perlu dikembangkan.

### Email bantuan

Tautan lupa kata sandi dan bantuan pada halaman login mengarah ke `admin@kai.id`. Alamat ini harus dikonfirmasi dan disesuaikan dengan kebijakan lingkungan sebelum digunakan untuk deployment.

## 15. Kebutuhan Fungsional Produk

Bagian ini merangkum kebutuhan produk yang dipenuhi implementasi sekarang dan kebutuhan lanjutan yang diperlukan agar alur operasional lengkap.

### Kebutuhan yang sudah dipenuhi

- Sistem mengautentikasi user aktif dengan NIPP dan password.
- Sistem membuat sesi dengan masa berlaku terbatas dan menyediakan endpoint logout.
- Sistem melindungi halaman kerja dan membatasi data berdasarkan role.
- Pekerja dapat mengirim alasan pernyataan yang tervalidasi.
- Sistem memberi nomor referensi bulanan dan menyimpan snapshot data pegawai/formulir.
- Atasan, Admin TI, atau Super Admin dapat memproses keputusan melalui API sesuai status dan kewenangan.
- Sistem menyimpan rekam keputusan, catatan, perubahan status, dan audit event utama.
- Daftar arsip menyajikan pengajuan yang ditolak atau disetujui tahap akhir.
- Super Admin dapat melihat daftar semua pegawai dengan role dan status aktif.
- Super Admin dapat melihat hingga 200 event audit terakhir dengan detail lengkap.
- Pengajuan yang disetujui kedua tahap dapat diunduh sebagai file PDF digital.

### Kebutuhan lanjutan yang disarankan

- Tambahkan detail histori persetujuan pada kartu pengajuan dengan daftar approver, tanggal, dan catatan setiap tahap.
- Tambahkan halaman detail dokumen yang menampilkan timeline lengkap dari pengajuan hingga pengarsipan.
- Tentukan apakah pekerja boleh melihat status penolakan dan catatan keputusan dari tahap atasan/TI.
- Tentukan kebutuhan edit/batal, penyimpanan draf, komentar internal, notifikasi email, pencarian lanjutan, filter tanggal, pagination, dan ekspor/cetak dokumen.
- Buat mekanisme pemulihan password yang aman dengan token email; jangan menganggap email mailto sebagai reset otomatis.
- Ganti angka/teks contoh pada UI dengan data aktual atau konfigurasi formulir yang bersumber dari database atau file konfigurasi terpisah.
- Tambahkan audit untuk kejadian gagal login dan pengisian IP address pengguna bila sesuai kebijakan privasi organisasi.
- Pertimbangkan fitur delegasi approval, workflow approval paralel, atau conditional routing berdasarkan jenis pengajuan.
- Implementasikan rate limiting pada endpoint login dan approval untuk mencegah brute force atau penyalahgunaan API.## 16. Kriteria Penerimaan End-to-End

1. User aktif dapat login; user tidak aktif tidak dapat login.
2. Lima password salah untuk NIPP yang dikenali dan akun aktif menyebabkan penguncian selama 15 menit; login sukses mereset penghitung. NIPP yang tidak dikenal tidak memiliki record untuk dikunci.
3. Cookie dan row sesi dibuat saat login, lalu invalid setelah logout atau kedaluwarsa.
4. Pengguna tanpa sesi tidak dapat membuka halaman terlindungi atau endpoint API terlindungi.
5. Pekerja dapat membuat statement hanya dengan alasan 10-5.000 karakter dan data dasar/form aktif tersedia.
6. Nomor referensi unik dan bertambah berdasarkan tahun serta bulan.
7. Pekerja hanya melihat cakupan sendiri; atasan hanya melihat cakupan diri dan bawahan langsung; admin lintas pekerja.
8. Keputusan hanya dapat dilakukan oleh role dan pada tahap yang tepat; pengguna tidak dapat menyetujui dokumen sendiri.
9. Penolakan tanpa catatan ditolak server; keputusan ganda menghasilkan konflik, bukan perubahan status yang tidak konsisten.
10. Status `DISETUJUI_TI` dan `DITOLAK` tampil pada arsip yang sesuai.
11. Login, logout, pengajuan, dan keputusan berhasil membuat audit event.
12. UI menyediakan aksi persetujuan dan logout yang dapat digunakan tanpa alat developer.
13. Super Admin dapat membuka halaman pegawai dan audit; role lain tidak dapat mengakses.
14. Daftar pegawai menampilkan semua pegawai dengan role akun dan status aktif.
15. Daftar audit menampilkan hingga 200 event terakhir dengan waktu, pengguna, aksi, dan entitas.
16. File PDF dapat diunduh untuk dokumen status `DIAJUKAN` dan lebih tinggi, dengan nama file mengikuti nomor referensi.
17. PDF berisi snapshot identitas pekerja, alasan, nomor referensi, dan metadata dokumen.
18. Akses PDF dibatasi sesuai role dan cakupan pekerja.

## 17. Sumber Kebenaran dan Pemeliharaan Dokumen

Dokumen ini menjelaskan perilaku yang ditemukan pada halaman `app/`, route `app/api/`, utilitas `lib/`, model `prisma/schema.prisma`, dan panduan `docs/PANDUAN-LOKAL.md`. Aplikasi tidak membuat akun atau data otomatis; seluruh data harus berasal dari provisioning yang berizin.

**Fitur yang sudah diimplementasikan dan diuji:**

- ✅ Login dengan NIPP dan password, dengan password hashing scrypt dan sesi berbasis cookie.
- ✅ Penguncian akun setelah 5 kali gagal selama 15 menit.
- ✅ Pembatasan akses per role (PEKERJA, ATASAN, ADMIN_TI, SUPER_ADMIN).
- ✅ Pengajuan pernyataan oleh pekerja dengan nomor referensi otomatis dan snapshot data.
- ✅ Persetujuan berjenjang: atasan tahap 1, Admin TI tahap 2.
- ✅ Penolakan dengan catatan wajib diisi.
- ✅ Arsip untuk dokumen selesai atau ditolak.
- ✅ Audit log untuk login, logout, pengajuan, dan keputusan.
- ✅ Halaman admin pegawai dan audit (Super Admin saja).
- ✅ Unduh PDF pernyataan dengan snapshot dan metadata dokumen.
- ✅ Logout dan penghapusan sesi.

**Jika implementasi berubah, perbarui:**

- Peta halaman dan API jika rute baru ditambahkan atau diubah.
- Matriks role dan batasan akses jika logic otorisasi berubah.
- Tutorial dan skenario pengujian jika alur user berubah.
- Kriteria penerimaan jika fitur dihapus atau dimodifikasi.
- Status fitur di bagian 2 jika implementasi baru diselesaikan.

Dokumen ini terakhir diperbarui pada 2026-11-04 setelah end-to-end testing menyeluruh dan build production berhasil.
