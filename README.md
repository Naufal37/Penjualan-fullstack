# Website Jajan Pasar Rumahan

Web penjualan jajan pasar (onde-onde, putu ayu, donat, gorengan) dengan halaman pemilik
untuk menambah produk dan mengunggah foto. Foto disimpan di database Neon.

- Frontend: HTML + CSS + JavaScript biasa (tanpa framework)
- Backend: Node.js + Express
- Database: Neon PostgreSQL
- Hosting: Vercel

## Isi folder

```
api/index.js        semua endpoint API
public/index.html   halaman toko yang dilihat pembeli
public/admin.html   halaman pemilik (tambah/ubah jajan + upload foto)
public/css, public/js
db/schema.sql       skema tabel (cadangan, tabel dibuat otomatis)
vercel.json         arahkan /api/* ke Express
```

## 1. Siapkan database Neon

1. Buka https://neon.com, bikin akun, lalu bikin project baru.
2. Di halaman project, salin **connection string** (bentuknya
   `postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require`).
3. Tabel tidak perlu dibuat manual — server bikin sendiri saat pertama kali diakses.

## 2. Jalankan di laptop

```bash
npm install
```

Bikin file `.env` (atau langsung set di terminal):

```
DATABASE_URL=postgresql://... (dari Neon)
ADMIN_PASSWORD=sandi-bebas
```

Jalankan:

```bash
node --env-file=.env api/index.js
```

Buka http://localhost:3000 untuk toko, http://localhost:3000/admin.html untuk halaman pemilik.

## 3. Deploy ke Vercel

1. Push folder ini ke GitHub.
2. Di Vercel: **Add New → Project → Import** repo tadi. Framework preset: **Other**.
3. Sebelum Deploy, buka **Environment Variables** dan isi dua ini:
   - `DATABASE_URL` → connection string Neon
   - `ADMIN_PASSWORD` → password halaman pemilik
4. Klik Deploy. Kalau env var diubah setelah deploy, jalankan **Redeploy**.

## 4. Pakai halaman pemilik

1. Buka `/admin.html`, masukkan `ADMIN_PASSWORD`.
2. Isi **Info toko** dulu (nama toko, nomor WhatsApp format `62…`, alamat) lalu simpan.
   Nomor WA ini yang dipakai tombol pesan di halaman depan.
3. Tambah jajan satu per satu: nama, kategori, harga, satuan, keterangan, foto.
4. Kalau stok habis, tekan **Tandai habis** — jajannya tetap tampil tapi tombol pesannya hilang.

## Catatan soal foto

Foto dikecilkan otomatis di browser (lebar maks 900px, JPEG mutu 72%) lalu disimpan
sebagai teks base64 di kolom `produk.foto`. Cukup ringan untuk katalog puluhan jajan.
Kalau nanti produknya ratusan atau fotonya mau resolusi tinggi, lebih baik pindah ke
penyimpanan file (Vercel Blob / Cloudinary) dan simpan URL-nya saja di database.

## Catatan soal keamanan

Login admin memakai satu password yang dicek di server lewat header. Cukup untuk tugas
sekolah dan toko kecil, tapi bukan sistem login berlapis — jangan pakai password yang
sama dengan akun penting.
