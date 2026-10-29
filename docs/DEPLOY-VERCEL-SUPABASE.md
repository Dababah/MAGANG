# Deploy Portal Pernyataan KAI ke Supabase dan Vercel

Panduan ini untuk menaruh aplikasi online agar bisa diuji melalui browser tanpa menjalankan server di komputer sendiri.

## Penting Sebelum Mulai

- Aplikasi memakai **Prisma** untuk database dan login NIPP buatan aplikasi. Supabase dipakai sebagai **host PostgreSQL**.
- Aplikasi ini tidak memakai Supabase Auth, `@supabase/ssr`, tabel `todos`, atau Supabase Data API. Jangan menaruh database password, `service_role` key, atau secret di variabel `NEXT_PUBLIC_*`.
- Akun demo hanya untuk lokal. Seed menolak koneksi remote dan production dengan sengaja.
- Repository berisi data demonstrasi dan dokumen formulir internal. File `.docx` dikecualikan Git; pastikan Anda berhak membagikan semua data dan aset yang akan dipush. Jangan deploy data pekerja nyata tanpa izin dan persetujuan yang sesuai.
- Saat ini belum ada pembuatan akun admin melalui antarmuka. Sebelum aplikasi bisa digunakan setelah deploy, siapkan user dan employee awal dengan cara aman yang dijelaskan di bagian akun pertama.

## 1. Persiapan Akun dan Repository GitHub

1. Pastikan sudah login ke GitHub di browser/VS Code.
2. Repository yang dikonfigurasi proyek ini adalah `https://github.com/Dababah/MAGANG.git`.
3. Periksa file yang akan masuk commit:

   ```powershell
   git status --short
   git diff --check
   ```

4. Pastikan `.env`, `.env.local`, `.vercel`, `node_modules`, `.next`, dan dokumen `.docx` tidak ikut staged. `.env.example` berisi placeholder dan boleh di-commit.
5. Lihat staged files sebelum commit:

   ```powershell
   git add .
   git status --short
   git diff --cached --stat
   git diff --cached --name-only
   ```

6. Jika daftar file benar, commit dan push:

   ```powershell
   git commit -m "Prepare Supabase and Vercel deployment"
   git push -u origin main
   ```

Jika GitHub meminta autentikasi, selesaikan melalui browser atau Git Credential Manager. Jangan menempelkan password atau personal access token ke chat maupun file proyek.

## 2. Buat PostgreSQL di Supabase

1. Buka [Supabase](https://supabase.com/) dan buat project baru.
2. Pilih organisasi, nama project, region yang dekat dengan target pengguna, dan buat database password yang kuat. Simpan password di password manager.
3. Tunggu sampai database siap.
4. Di dashboard project, buka **Connect** atau **Project Settings → Database** dan cari connection strings.
5. Ambil dua URL:
   - **Transaction pooler** (port `6543`) untuk `DATABASE_URL` aplikasi di Vercel.
   - **Session pooler** (port `5432`) untuk `DIRECT_URL`, dipakai Prisma CLI saat setup/perubahan schema. Direct connection port `5432` juga dapat dipakai bila jaringan/runtime mendukung IPv6 atau tersedia IPv4 add-on.
6. Gunakan user database dari Supabase. Bila string memakai user `postgres`, pertahankan bentuk yang ditampilkan dashboard. URL pooler umumnya menyertakan project ref di bagian username.
7. Jika password memiliki karakter khusus seperti `@`, `:`, `/`, `#`, atau `%`, URL-encode password tersebut sebelum menyisipkannya ke connection string.

Bentuk URL hanya contoh. Gunakan host, username, project reference, region, dan password persis dari dashboard:

```dotenv
DATABASE_URL="postgresql://POOLER_USER:ENCODED_PASSWORD@POOLER_HOST:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://SESSION_USER:ENCODED_PASSWORD@SESSION_HOST:5432/postgres"
```

Jangan menambahkan URL database ke source code, commit, issue, screenshot publik, atau chat.

## 3. Siapkan Schema di Supabase

Dari PowerShell di root repository, isi `.env` lokal dengan URL Supabase untuk sementara. File `.env` sudah di-ignore oleh Git. Jangan memakai seed demo untuk Supabase.

```powershell
Copy-Item .env.example .env
```

Edit `.env` dengan nilai `DATABASE_URL` dan `DIRECT_URL` dari dashboard, lalu jalankan:

```powershell
npm install
npm run db:generate
npx prisma db push --schema prisma/schema.prisma
```

`db push` membuat tabel berdasarkan `prisma/schema.prisma`. Perintah ini bukan pengganti migrasi ter-version untuk sistem produksi yang datanya sudah kritis; sebelum perubahan schema pada aplikasi produksi, gunakan workflow migration Prisma dan backup database.

Untuk mengecek koneksi dan tabel, buka **Supabase → Table Editor**. Tabel aplikasi seharusnya muncul di schema `public`.

## 4. Deploy dari GitHub ke Vercel

1. Buka [Vercel](https://vercel.com/) dan login dengan akun GitHub yang memiliki akses repository.
2. Pilih **Add New → Project**, lalu import `Dababah/MAGANG`.
3. Framework preset seharusnya terdeteksi sebagai **Next.js**. Root directory gunakan root repository.
4. Sebelum deploy pertama atau segera setelah import, buka **Environment Variables** dan tambahkan:
   - `DATABASE_URL` = transaction pooler URL dengan port `6543` dan `?pgbouncer=true`.
   - `DIRECT_URL` = session pooler URL dengan port `5432`.
   - `NODE_ENV` tidak perlu ditambahkan manual; Vercel menetapkan environment production pada deployment production.
5. Terapkan kedua variable setidaknya untuk **Production** dan **Preview** jika Anda ingin preview deployment terkoneksi ke database yang sama. Lebih aman buat Supabase project/database terpisah untuk Preview agar data uji tidak bercampur dengan data production.
6. Tekan **Deploy**.
7. Jika deploy gagal, buka deployment di Vercel, periksa **Build Logs**, koreksi pesan error, lalu redeploy.
8. Setiap push baru ke branch `main` akan memicu deployment production otomatis; branch lain biasanya menjadi Preview Deployment.

Jangan menambahkan publishable key Supabase ke Vercel untuk aplikasi ini; tidak digunakan oleh Prisma. `NEXT_PUBLIC_*` selalu dapat terlihat dari browser, jadi tidak boleh berisi secret.

## 5. Menyiapkan Akun Pertama dengan Aman

Aplikasi tidak memiliki halaman pembuatan user. Jangan jalankan `npm run db:seed-demo` terhadap Supabase; script ini sengaja menolak host database non-lokal.

Sebelum mengisi akun pertama:

1. Pastikan deployment dan tabel database sudah siap.
2. Tentukan employee awal, role, NIPP, business area, dan password kuat yang memang diizinkan digunakan.
3. Buat password hash dengan helper aplikasi `hashPassword` dari `lib/auth/password.ts`, kemudian masukkan data `BusinessArea`, `Employee`, dan `User` dengan password hash tersebut. Jangan menyimpan password mentah.
4. Gunakan SQL Editor Supabase hanya jika Anda memahami cara membuat hash `scrypt` dengan format aplikasi `scrypt:<salt>:<hex>`; fungsi hash aplikasi berjalan di Node.js, bukan SQL. Cara yang lebih aman adalah membuat skrip admin sekali pakai yang memakai `hashPassword`, dijalankan secara lokal dengan `DIRECT_URL` tersimpan di environment, lalu menghapus skrip setelah digunakan dan tidak pernah mencetak secret/hash ke log.
5. Pastikan ada setidaknya satu `FormVersion` aktif sebelum pekerja mengirim pengajuan. Hubungkan pekerja ke atasan melalui `Employee.atasanId`.

Jangan membuat user dengan hash password palsu atau memasukkan password ke kolom `password_hash`. Jangan mengaktifkan akun demo di production.

## 6. Uji Setelah Deployment

1. Buka domain Vercel dan pastikan halaman login dapat dimuat.
2. Login hanya menggunakan akun awal yang dibuat dengan aman; akun demo lokal tidak tersedia di Supabase secara otomatis.
3. Jika login berhasil, pastikan dashboard dapat membaca data dari PostgreSQL.
4. Uji pengajuan pada data uji yang tidak berisi informasi pekerja nyata.
5. Cek deployment logs dan database logs jika request error.
6. Ingat bahwa halaman `/approvals` saat ini menampilkan daftar, tetapi belum memiliki tombol aksi keputusan. Logout juga belum memiliki tombol UI; endpoint API sudah tersedia.
7. Setelah mengubah environment variable di Vercel, lakukan redeploy agar variable diterapkan ke deployment baru.

## 7. Keamanan dan Operasional

- Rotasi segera database password atau credential apa pun yang pernah terunggah/terbagi.
- Batasi akses repository dan Supabase Dashboard hanya kepada anggota yang perlu.
- Gunakan database dan akun berbeda untuk preview dan production bila memungkinkan.
- Jangan beri browser Supabase service role key. Aplikasi menggunakan koneksi Prisma server-side; database URL hanya di environment server Vercel.
- Jangan jalankan `db push` tanpa review pada database production yang sudah berisi data penting.
- Atur backup, kebijakan retensi, monitoring penggunaan, dan prosedur pemulihan sebelum dipakai sebagai sistem resmi.
- Pastikan data sample, dokumen formulir, branding, dan data pegawai memang boleh dipublikasikan/di-host pada lingkungan yang dipilih.

## Troubleshooting Singkat

| Gejala                                       | Yang diperiksa                                                                                                                            |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Build gagal karena environment variable      | Pastikan `DATABASE_URL` dan `DIRECT_URL` terdaftar pada environment deployment yang gagal; redeploy setelah mengubahnya.                  |
| `Can't reach database server`                | Periksa host/port, status Supabase, password ter-URL-encode, dan pilih transaction pooler untuk runtime Vercel.                           |
| Prisma menolak provider                      | Pastikan `datasource db.provider` bernilai `postgresql`, lalu jalankan `npm run db:generate`.                                             |
| Tabel belum ada                              | Jalankan `npx prisma db push --schema prisma/schema.prisma` menggunakan `DIRECT_URL` yang menunjuk Supabase project yang benar.           |
| Login selalu gagal                           | Belum ada user production; seed demo tidak dijalankan ke remote. Buat employee, user dengan hash `scrypt`, dan business area secara aman. |
| Pengajuan gagal dengan conflict              | Pastikan data employee, business area, dan setidaknya satu formulir aktif sudah dibuat.                                                   |
| Login berhasil tetapi database/runtime error | Periksa Vercel Function Logs dan pastikan `DATABASE_URL` adalah transaction pooler URL, bukan MySQL URL atau URL kosong.                  |
