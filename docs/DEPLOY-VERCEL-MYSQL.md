# Deploy Opsional Portal Pernyataan KAI ke Vercel dengan MySQL

Aplikasi ini menggunakan Prisma dengan MySQL. Untuk kebutuhan magang saat ini, Anda dapat tetap mengembangkan dan menguji aplikasi memakai MySQL lokal; deployment online bukan prasyarat. Gunakan panduan ini hanya bila nanti ingin membagikan aplikasi lewat internet. Vercel menyediakan hosting aplikasi Next.js, bukan server MySQL, sehingga deployment online memerlukan database MySQL dari penyedia terpisah.

## Penting

- Ketentuan proyek ini adalah MySQL. Jangan mengganti `provider = "mysql"` menjadi PostgreSQL.
- Supabase Database adalah PostgreSQL, sehingga tidak dapat digunakan sebagai database utama proyek ini.
- Jangan pasang `@supabase/ssr` atau mengganti autentikasi ke Supabase Auth untuk workflow saat ini. Login aplikasi menggunakan NIPP dan tabel User sendiri.
- Pilih penyedia MySQL managed/cloud yang menyediakan host, port, nama database, user, password, TLS bila diperlukan, dan koneksi dari Vercel/serverless. Periksa kebijakan akses jaringan dan batas koneksi.
- Jangan gunakan seed demo untuk database online. Script seed hanya mengizinkan hostname localhost dan menolak production.
- Jangan memasukkan kredensial database ke GitHub, source code, `NEXT_PUBLIC_*`, screenshot publik, atau chat.

## 1. Siapkan Repository Saat Akan Deploy

Repository proyek: `https://github.com/Dababah/MAGANG.git`, branch utama `main`.

Dari PowerShell di direktori proyek, periksa perubahan dan pastikan file rahasia tidak staged:

```powershell
git status --short
git diff --check
git status --ignored --short -- .env .env.local
```

File `.env*`, `.vercel`, `.next`, `node_modules`, file `.docx`, dan output build diabaikan Git. `.env.example` hanya berisi placeholder. Tidak perlu melakukan commit atau push sampai Anda memang siap membagikan perubahan.

## 2. Buat Database MySQL Online

1. Buat database MySQL di penyedia managed database yang Anda pilih.
2. Buat database terpisah untuk production dan, bila tersedia, database lain untuk preview/testing.
3. Buat user database dengan akses minimum yang dibutuhkan pada database aplikasi.
4. Catat host, port, nama database, username, password, dan opsi TLS/SSL yang diwajibkan provider.
5. Pastikan provider menerima koneksi outbound dari Vercel. Jika provider memakai allowlist IP, periksa solusi egress IP yang didukung oleh paket Vercel dan database Anda; jangan membuka database ke semua alamat tanpa kebutuhan dan kontrol keamanan.
6. Gunakan password acak kuat. Encode karakter khusus untuk URL connection string, misalnya `@` menjadi `%40`.

Format umumnya:

```text
mysql://USER:URL_ENCODED_PASSWORD@HOST:PORT/DATABASE_NAME
```

Contoh di atas hanya format. Jangan menyalin kredensial contoh dari internet; gunakan nilai provider Anda.

## 3. Terapkan Schema Prisma ke MySQL

Buat atau edit `.env` lokal (file ini diabaikan Git) dan isi:

```dotenv
DATABASE_URL="mysql://USER:URL_ENCODED_PASSWORD@HOST:PORT/DATABASE_NAME"
NODE_ENV="development"
```

Jalankan dari root repository:

```powershell
npm install
npm run db:generate
npx prisma validate --schema prisma/schema.prisma
npx prisma db push --schema prisma/schema.prisma
```

`db push` membuat tabel sesuai `prisma/schema.prisma`. Gunakan untuk database baru/testing. Untuk database production yang sudah berisi data penting, siapkan backup dan gunakan migrasi versioned Prisma setelah schema ditinjau; jangan menjalankan perubahan schema destruktif tanpa review.

Jangan jalankan `npm run db:seed-demo` dengan database online. Untuk uji lokal, seed hanya boleh diarahkan ke MySQL `localhost` dan memerlukan `DEMO_PASSWORD` pilihan Anda.

## 4. Import Repository ke Vercel

1. Login ke [Vercel](https://vercel.com/) menggunakan akun GitHub yang memiliki akses ke repository.
2. Pilih **Add New → Project**.
3. Import repository `Dababah/MAGANG`.
4. Pastikan Framework Preset terdeteksi sebagai **Next.js** dan Root Directory adalah root repository.
5. Buka **Environment Variables**, lalu tambahkan:
   - `DATABASE_URL`: connection string MySQL production.
6. Pilih environment yang sesuai. Gunakan database testing terpisah untuk **Preview** dan database resmi untuk **Production** agar pengujian tidak mencampuri data production.
7. Pilih **Deploy**.
8. Buka **Build Logs** bila deployment gagal. Setelah mengubah environment variable, redeploy agar nilainya digunakan oleh deployment terbaru.
9. Integrasi GitHub biasanya membuat Preview Deployment untuk branch/PR dan Production Deployment untuk push ke branch `main`.

Jangan mengatur `DATABASE_URL` sebagai `NEXT_PUBLIC_DATABASE_URL`. Variable tanpa prefix `NEXT_PUBLIC_` hanya tersedia di server.

## 5. Siapkan Data dan Akun Pertama

Aplikasi tidak memiliki pendaftaran mandiri dan seed demo tidak dapat dijalankan pada database remote.

Sebelum alur pengajuan bisa digunakan, database perlu memiliki:

- Satu atau lebih `BusinessArea`.
- Data `Employee` dengan NIPP unik, business area, dan relasi atasan yang benar.
- Data `User` untuk employee, role yang benar, status aktif, serta hash password dalam format yang dibuat helper `hashPassword` di `lib/auth/password.ts`.
- Minimal satu `FormVersion` aktif.

Jangan pernah menyimpan password mentah di `password_hash`. Buat data awal lewat prosedur admin/script sekali pakai yang aman, menggunakan helper hash aplikasi; simpan `DATABASE_URL` hanya di environment lokal dan jangan mencetak password, URL, atau hash ke log. Hapus script provisioning sementara setelah selesai dan jangan commit script berisi nilai sensitif. Untuk penggunaan resmi, sebaiknya dibuat workflow provisioning admin yang terotorisasi dan dapat diaudit.

Akun demo lokal tidak tersedia otomatis pada MySQL cloud. Jangan gunakan akun demo untuk production.

## 6. Uji Setelah Deployment

1. Buka URL deployment Vercel; pastikan `/login` dapat dimuat.
2. Login hanya menggunakan akun awal yang dibuat dengan aman.
3. Pastikan dashboard dapat membaca data MySQL.
4. Uji pengajuan menggunakan akun pekerja dan data uji, bukan data nyata tanpa izin.
5. Periksa Vercel **Function Logs** dan log database bila request gagal.
6. Perhatikan bahwa halaman `/approvals` saat ini menampilkan daftar, tetapi belum memiliki tombol keputusan; endpoint API keputusan tersedia. Tombol logout UI juga belum tersedia walaupun endpoint logout ada.
7. Setelah setiap perubahan di branch `main`, tunggu deployment baru selesai dan uji URL production.

## Troubleshooting

| Gejala                                 | Pemeriksaan                                                                                                                                         |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build gagal karena `DATABASE_URL`      | Tambahkan variable di Vercel untuk environment yang benar, lalu redeploy.                                                                           |
| Prisma tidak dapat menjangkau database | Pastikan host/port benar, database online, user/password valid, TLS sesuai, dan provider menerima koneksi dari Vercel.                              |
| Prisma mengeluhkan provider            | Pastikan `datasource db.provider` di `prisma/schema.prisma` bernilai `mysql`, lalu jalankan `npm run db:generate`.                                  |
| Tabel belum ada                        | Jalankan `npx prisma db push --schema prisma/schema.prisma` dari lingkungan yang memiliki akses ke database.                                        |
| Login gagal setelah deploy             | Pastikan user dan employee aktif sudah dibuat, hash password sesuai format scrypt aplikasi, dan NIPP tepat. Akun demo tidak otomatis dibuat online. |
| Pengajuan gagal                        | Pastikan employee punya business area, ada `FormVersion` aktif, dan alasan memenuhi aturan validasi.                                                |
| Koneksi ditolak atau timeout           | Tinjau allowlist/firewall, limit koneksi database, URL-encode password, dan requirement TLS provider.                                               |

## Sumber

- Vercel deployment: https://vercel.com/docs/deployments/overview
- Prisma MySQL: https://www.prisma.io/docs/orm/overview/databases/mysql
- Lihat juga `docs/PANDUAN-LOKAL.md` untuk menyiapkan MySQL lokal dan menjalankan seed demo.
