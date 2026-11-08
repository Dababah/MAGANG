# Menjalankan Portal secara Lokal

Untuk menguji aplikasi tanpa akses data KAI, gunakan database lokal khusus `pernyataan_kai_local`. Satu command menyiapkan empat role, relasi atasan-bawahan, dan formulir contoh. Data memakai awalan `LOCAL-`/`Contoh Lokal`, bukan identitas KAI asli. Jangan pakai data contoh untuk kegiatan resmi.

## Setup Satu Kali

Di MySQL Workbench jalankan:

```sql
CREATE DATABASE IF NOT EXISTS pernyataan_kai_local;
```

Lalu di PowerShell:

```powershell
Set-Location "D:\MAGANG KAI"
$env:DATABASE_URL = "mysql://USER:PASSWORD@localhost:3306/pernyataan_kai_local"
$env:NODE_ENV = "development"
npm run db:generate
npx prisma validate --schema prisma/schema.prisma
npx prisma db push --schema prisma/schema.prisma
$env:LOCAL_APP_PASSWORD = "PilihPasswordLokalYangKuat!"
npm run db:setup-local
Remove-Item Env:LOCAL_APP_PASSWORD
npm run dev
```

Ganti `USER` dan `PASSWORD` dengan akun MySQL lokal Anda. Password aplikasi pilihan Anda minimal 12 karakter dan dipakai oleh semua akun lokal. Jangan kirim password atau `.env` ke chat.

Command setup menolak berjalan kecuali `DATABASE_URL` menunjuk ke `pernyataan_kai_local` pada `localhost`. Karena URL diset hanya di sesi PowerShell ini, database `pernyataan_kai` yang telah Anda buat dan file `.env` tidak berubah.

Buka [http://localhost:3000/login](http://localhost:3000/login):

| Role          | NIPP lokal             |
| ------------- | ---------------------- |
| `PEKERJA`     | `LOCAL-PEKERJA-01`     |
| `ATASAN`      | `LOCAL-ATASAN-01`      |
| `ADMIN_TI`    | `LOCAL-ADMIN-TI-01`    |
| `SUPER_ADMIN` | `LOCAL-SUPER-ADMIN-01` |

Pada komputer lokal, lampiran disimpan secara privat di `.private/uploads` jika `BLOB_READ_WRITE_TOKEN` tidak diatur. Ini berlaku untuk `npm run dev` maupun `npm run start`, dan folder tersebut tidak dimasukkan ke Git. Jangan gunakan penyimpanan disk lokal untuk deployment serverless; Vercel memerlukan `BLOB_READ_WRITE_TOKEN`.

## Skenario Alur

1. Login sebagai pekerja, buat pernyataan, dan kirim untuk persetujuan.
2. Logout lalu login sebagai atasan; setujui satu pengajuan dan tolak pengajuan lain dengan catatan.
3. Login sebagai Admin TI; setujui pengajuan tahap TI. Login kembali sebagai pekerja, unduh PDF, bubuhkan tanda tangan secara fisik, lalu unggah scan PDF/foto dari daftar pernyataan.
4. Login kembali sebagai Admin TI; periksa scan dan pilih verifikasi untuk menyelesaikan arsip.
5. Login sebagai Super Admin; cek antrean, direktori pegawai, dan audit. Pastikan tidak bisa memutuskan dokumennya sendiri.
6. Uji batas akses dengan mencoba URL/API tanpa login dan memakai role yang tidak berwenang.

Teks formulir lokal sengaja menyebut `CONTOH LOKAL` dan bukan naskah resmi. Sebelum deployment untuk KAI, ganti data pegawai, role/relasi, nomor versi, teks ketentuan, serta konfigurasi database hanya melalui sumber dan proses yang disetujui.

## Setelah Selesai

Hentikan server dengan `Ctrl+C`, kemudian hapus override sementara:

```powershell
Remove-Item Env:DATABASE_URL
Remove-Item Env:NODE_ENV
```

Database contoh terpisah dari database lainnya dan tidak mengubah `.env`.
