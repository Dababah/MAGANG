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

| Area                                                            | Status implementasi saat ini                                                       |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Login menggunakan NIPP dan kata sandi                           | Tersedia                                                                           |
| Sesi login berbasis cookie, masa berlaku 8 jam                  | Tersedia                                                                           |
| Penguncian setelah 5 percobaan kata sandi gagal selama 15 menit | Tersedia                                                                           |
| Ringkasan dan daftar pernyataan                                 | Tersedia                                                                           |
| Pengajuan baru oleh pekerja                                     | Tersedia melalui halaman dan API                                                   |
| Kotak daftar pengajuan menunggu tindakan                        | Tersedia                                                                           |
| Endpoint keputusan persetujuan/penolakan                        | Tersedia di API                                                                    |
| Tombol aksi persetujuan/penolakan di antarmuka                  | Belum tersedia pada layar yang diperiksa                                           |
| Arsip untuk dokumen selesai atau ditolak                        | Tersedia                                                                           |
| Pencatatan audit login, logout, pengajuan, dan keputusan        | Tersedia di API                                                                    |
| Halaman admin pegawai dan halaman audit                         | Belum tersedia                                                                     |
| Pengunduhan atau pembuatan PDF                                  | Belum tersedia; dependency PDF ada tetapi belum digunakan pada alur yang diperiksa |
| Lupa kata sandi otomatis                                        | Belum tersedia; tautan menghubungi email administrator                             |
| Pendaftaran mandiri                                             | Tidak tersedia                                                                     |
| Pencarian, notifikasi, atau pengubah area kerja di dashboard    | Belum berfungsi sebagai alur aplikasi pada implementasi yang diperiksa             |

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

- Otorisasi untuk tindakan persetujuan ditegakkan di API, bukan hanya dengan menyembunyikan tombol.
- Pada implementasi halaman saat ini, menu persetujuan berisi daftar; API keputusan ada tetapi belum terhubung ke kontrol aksi di halaman yang diperiksa.
- Halaman pegawai dan audit belum tersedia, walaupun role admin, model `AuditLog`, dan folder route admin ada di repository.
- Data untuk `ADMIN_TI`/`SUPER_ADMIN` pada halaman daftar pernyataan tidak dibatasi ke satu business area. Pekerja dan atasan memiliki filter khusus sesuai role.

## 5. Peta Halaman dan API

### Halaman

| URL                | Fungsi                                                     |
| ------------------ | ---------------------------------------------------------- |
| `/login`           | Form login dengan NIPP dan kata sandi.                     |
| `/`                | Dashboard ringkasan sesuai sesi dan role.                  |
| `/statements`      | Daftar pengajuan sesuai cakupan role.                      |
| `/statements/new`  | Form pengajuan baru. API hanya mengizinkan role `PEKERJA`. |
| `/approvals`       | Daftar dokumen yang menunggu tindakan sesuai role.         |
| `/archive`         | Daftar dokumen berstatus `DISETUJUI_TI` atau `DITOLAK`.    |
| `/admin/employees` | Belum tersedia sebagai halaman aktif.                      |
| `/admin/audit`     | Belum tersedia sebagai halaman aktif.                      |

Halaman kerja memerlukan sesi. Jika sesi tidak ada atau tidak valid, halaman server mengarahkan pengguna ke `/login`.

### API

| Method dan URL             | Tujuan                                                                      | Respons penting                                                           |
| -------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `POST /api/auth/login`     | Memvalidasi kredensial, mencatat login, dan membuat sesi.                   | `200`, `400`, `401`, atau `423` saat akun terkunci.                       |
| `POST /api/auth/logout`    | Menghapus sesi dan cookie, kemudian mencatat logout bila pengguna dikenali. | JSON berisi `ok` dan `redirectTo: "/login"`.                              |
| `GET /api/statements`      | Mengambil daftar dokumen dengan filter status opsional.                     | Maksimal 100 data; `401` jika belum login, `400` jika status tidak valid. |
| `POST /api/statements`     | Membuat dan langsung mengirim pernyataan.                                   | `201`; `400`, `401`, `403`, atau `409` untuk kondisi yang sesuai.         |
| `POST /api/approvals/{id}` | Menyetujui atau menolak dokumen sesuai role dan status.                     | `200`; `400`, `401`, `403`, `404`, atau `409`.                            |

Tidak ada endpoint edit, hapus, ekspor PDF, administrasi pekerja, atau pembacaan audit yang ditemukan pada cakupan implementasi ini.

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
3. Isi alasan atau keterangan dengan panjang 10 sampai 5.000 karakter.
4. Periksa kembali isi karena pengiriman langsung membuat pengajuan; tidak ada penyimpanan draf terpisah di form ini.
5. Kirim formulir.
6. API memastikan sesi aktif dan role `PEKERJA`.
7. API memuat data pekerja, business area, dan versi formulir aktif. Jika salah satunya tidak tersedia, request gagal dengan `409`.
8. Nomor referensi dibuat dalam transaksi dengan format `PST-YYYY-MM-NNNN`, menggunakan counter per tahun dan bulan.
9. Snapshot identitas (nama, NIPP, jabatan, tempat kedudukan, dan business area), alasan, versi formulir, tanggal, status `DIAJUKAN`, dan waktu pengajuan disimpan.
10. Audit `AJUKAN_PERNYATAAN` dicatat. Browser mengarahkan pengguna kembali ke daftar.

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

**Batasan UI:** halaman `/approvals` saat ini menampilkan daftar dan tidak menyediakan tombol untuk mengirim keputusan. Endpoint API sudah tersedia tetapi belum menjadi alur interaktif bagi pengguna biasa. Untuk penggunaan operasional, integrasi UI dan uji end-to-end masih diperlukan.

### 6.5 Melihat Arsip

Arsip mengembalikan pengajuan berstatus `DISETUJUI_TI` atau `DITOLAK`, diurutkan berdasarkan waktu perubahan terbaru, dengan batas 100 data. Pekerja melihat data sendiri, atasan melihat data sendiri dan bawahan langsung, sedangkan role admin memiliki cakupan lintas pekerja.

### 6.6 Logout dan Sesi Berakhir

Sesi disimpan di database dengan ID berupa hash SHA-256 token acak. Cookie `pernyataan_session` bersifat `httpOnly`, `sameSite=lax`, ber-path `/`, dan kedaluwarsa setelah 8 jam. Pada produksi, cookie diberi atribut `secure`.

Endpoint keluar adalah `POST /api/auth/logout`. Endpoint menghapus record sesi dan cookie, lalu mencatat audit `LOGOUT` bila sesi pengguna masih dapat dikenali. Sesi yang kedaluwarsa atau terkait akun nonaktif dibersihkan ketika sesi dibaca.

**Batasan UI:** tombol logout belum ditemukan pada antarmuka aktif. Untuk uji lokal dari browser yang sudah login, request dapat dikirim melalui Developer Tools Console:

```js
await fetch("/api/auth/logout", { method: "POST" });
window.location.assign("/login");
```

Dalam produk siap pakai, tombol logout yang terlihat sebaiknya ditambahkan dan memanggil endpoint ini.

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

| Lokasi                  | Isi                                                      |
| ----------------------- | -------------------------------------------------------- |
| `app/`                  | Halaman, layout, dan API route.                          |
| `app/api/`              | Endpoint autentikasi, statement, dan approval.           |
| `components/`           | Komponen tampilan daftar dan heading.                    |
| `lib/auth/`             | Password dan manajemen sesi.                             |
| `lib/validators/`       | Skema validasi Zod untuk login, statement, dan approval. |
| `lib/prisma.ts`         | Client Prisma bersama.                                   |
| `prisma/schema.prisma`  | Model dan relasi database.                               |
| `scripts/seed-demo.mjs` | Seed akun dan data demonstrasi lokal.                    |
| `docs/PANDUAN-LOKAL.md` | Petunjuk lokal ringkas.                                  |

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

5. Buat tabel sesuai schema, generate Prisma Client, dan isi data demo:

   ```powershell
   npx prisma db push --schema prisma/schema.prisma
   npm run db:generate
   npm run db:seed-demo
   ```

   `db push` menerapkan model Prisma ke database tetapi tidak membuat data bisnis. Seed demo menyiapkan business area, empat pekerja/user, hubungan pekerja-at​​asan, dan satu versi formulir aktif; seed hanya bisa digunakan dengan database localhost dan memerlukan `DEMO_PASSWORD` yang Anda pilih. Jangan arahkan seed ke database remote.

6. Jalankan server pengembangan:

   ```powershell
   npm run dev
   ```

7. Buka `http://localhost:3000/login`.

### Akun demonstrasi lokal

| Role          | NIPP       | Kata sandi default             |
| ------------- | ---------- | ------------------------------ |
| `PEKERJA`     | `90000001` | Diatur melalui `DEMO_PASSWORD` |
| `ATASAN`      | `90000002` | Diatur melalui `DEMO_PASSWORD` |
| `ADMIN_TI`    | `90000003` | Diatur melalui `DEMO_PASSWORD` |
| `SUPER_ADMIN` | `90000004` | Diatur melalui `DEMO_PASSWORD` |

Akun tersebut hanya untuk development lokal. Seed menolak koneksi selain `localhost`, `127.0.0.1`, atau `::1`, menolak `NODE_ENV=production`, mewajibkan `DEMO_PASSWORD` minimal 8 karakter, dan tidak mencetak password ke output. Atur `DEMO_PASSWORD` di PowerShell sebelum menjalankan seed:

```powershell
$env:DEMO_PASSWORD = "PasswordLokalBaru!"
npm run db:seed-demo
Remove-Item Env:DEMO_PASSWORD
```

Jangan gunakan akun demo sebagai akun produksi. Seed memperbarui akun demo yang cocok berdasarkan NIPP/employee dan dapat mengganti hash password serta mengaktifkan kembali akun tersebut.

## 10. Tutorial Pengujian Manual dari Awal sampai Akhir

### A. Pastikan aplikasi siap

1. Pastikan MySQL berjalan atau database cloud dapat dijangkau, serta `.env` menunjuk ke database yang benar.
2. Jalankan `npx prisma db push --schema prisma/schema.prisma`, `npm run db:generate`, lalu `npm run db:seed-demo`.
3. Jalankan `npm run dev` dan buka `/login`.

### B. Uji login pekerja

1. Masuk dengan NIPP `90000001` dan password demo.
2. Pastikan diarahkan ke dashboard.
3. Pastikan nama pekerja, role, area, serta ringkasan tampil.
4. Buka `/statements`; pada database demo yang baru, daftar mungkin masih kosong.

### C. Buat pengajuan

1. Pilih **Buat pernyataan** dari ringkasan atau buka `/statements/new`.
2. Masukkan keterangan minimal 10 karakter dan maksimal 5.000 karakter.
3. Kirim pengajuan dan pastikan kembali ke `/statements`.
4. Pastikan record memiliki status `DIAJUKAN` serta nomor yang bentuknya seperti `PST-2026-10-0001` (tahun/bulan mengikuti tanggal lokal server).
5. Catat bahwa nomor bertambah berdasarkan counter tahun-bulan; jangan mengasumsikan nomor selalu berakhiran `0001` jika database sudah pernah digunakan.

### D. Uji visibilitas atasan

1. Keluar melalui endpoint sesi sebagaimana bagian 6.6, atau gunakan sesi browser terpisah.
2. Login sebagai atasan NIPP `90000002`.
3. Buka `/approvals` dan pastikan pengajuan pekerja demo muncul.
4. Tampilan halaman belum menyediakan tombol keputusan. Endpoint tersedia, tetapi pengujian tindakan perlu dilakukan oleh integrasi/API test yang berwenang; jangan menganggap sekadar melihat item sebagai persetujuan.

### E. Uji keputusan melalui API (opsional untuk pengembang)

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

### F. Uji tahap TI dan arsip

1. Jika atasan menyetujui, status menjadi `DISETUJUI_ATASAN`.
2. Login sebagai Admin TI NIPP `90000003` atau Super Admin.
3. API dapat memproses keputusan tahap berikutnya pada dokumen tersebut.
4. Jika disetujui, status menjadi `DISETUJUI_TI`; jika ditolak, status `DITOLAK`.
5. Buka `/archive` dan pastikan dokumen selesai/ditolak terlihat sesuai cakupan role.

### G. Uji logout

1. Dengan sesi aktif, buka Developer Tools browser dan jalankan:

   ```js
   await fetch("/api/auth/logout", { method: "POST" });
   window.location.assign("/login");
   ```

2. Buka kembali `/`; server seharusnya meminta login kembali.
3. Untuk memastikan, panggil `GET /api/statements` setelah logout; API seharusnya menjawab `401`.

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
- Seed demo memiliki guard lokal dan guard produksi. Jangan menghapus guard tersebut untuk mempermudah pengisian database remote.
- `AuditLog` mencatat login, logout, pengajuan, serta keputusan. Percobaan login gagal tidak dicatat sebagai event audit saat ini.
- `ip` tersedia sebagai kolom audit tetapi belum diisi oleh alur yang diperiksa.
- Pastikan backup database, kebijakan retensi, akses database, dan pengelolaan secret ditentukan sebelum produksi.
- Aplikasi memakai `db push` pada panduan lokal; strategi migrasi versioned perlu disepakati sebelum deployment produksi.

## 13. Perintah Pengembangan dan Pemeriksaan

| Perintah                                           | Tujuan                                                     |
| -------------------------------------------------- | ---------------------------------------------------------- |
| `npm run dev`                                      | Menjalankan server pengembangan Next.js.                   |
| `npm run build`                                    | Membuat build produksi dan memvalidasi prerender/build.    |
| `npm run start`                                    | Menjalankan build produksi yang sudah dibuat.              |
| `npm run lint`                                     | Menjalankan ESLint.                                        |
| `npx tsc --noEmit`                                 | Memeriksa tipe TypeScript tanpa menghasilkan output.       |
| `npm run db:generate`                              | Menghasilkan Prisma Client dari schema.                    |
| `npx prisma db push --schema prisma/schema.prisma` | Menyelaraskan schema ke database lokal.                    |
| `npm run db:seed-demo`                             | Menyiapkan akun dan data demo lokal dengan guard keamanan. |

Pemeriksaan build/lint/typecheck tidak menggantikan pengujian integrasi MySQL atau pengujian browser terhadap role dan alur sesi.

## 14. Pemecahan Masalah

### Login gagal

- Pastikan NIPP dan kata sandi sesuai akun di database.
- Jalankan seed demo hanya pada database lokal bila data demo belum ada.
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

### Kebutuhan lanjutan yang disarankan

- Tambahkan tombol logout dan pastikan redirect/refresh setelah sesi dihapus.
- Tambahkan UI detail pengajuan dan kontrol setuju/tolak beserta catatan.
- Tambahkan hasil keputusan dan histori tahapan pada detail dokumen.
- Tambahkan halaman administrasi pegawai dan pembaca audit dengan otorisasi khusus.
- Tentukan apakah pekerja boleh melihat status penolakan dan catatan keputusan.
- Tentukan kebutuhan edit/batal, penyimpanan draf, komentar, notifikasi, pencarian, filter, pagination, dan ekspor dokumen.
- Buat mekanisme pemulihan password yang aman; jangan menganggap email mailto sebagai reset otomatis.
- Ganti angka/teks contoh pada UI dengan data aktual atau konfigurasi formulir yang bersumber dari database.
- Tambahkan audit untuk kejadian gagal login dan pengisian IP bila sesuai kebijakan privasi.

## 16. Kriteria Penerimaan End-to-End

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
12. UI menyediakan aksi persetujuan dan logout sebelum aplikasi dinyatakan lengkap untuk penggunaan operasional tanpa alat developer.

## 17. Sumber Kebenaran dan Pemeliharaan Dokumen

Dokumen ini menjelaskan perilaku yang ditemukan pada halaman `app/`, route `app/api/`, utilitas `lib/`, model `prisma/schema.prisma`, seed `scripts/seed-demo.mjs`, dan panduan lokal `docs/PANDUAN-LOKAL.md`. Jika implementasi berubah, perbarui bagian peta halaman/API, matriks role, tutorial, batasan, dan kriteria penerimaan agar tetap sinkron dengan kode.
