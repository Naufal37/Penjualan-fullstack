import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const app = express();

// foto dikirim sebagai data URL base64, jadi body-nya agak besar
app.use(express.json({ limit: '6mb' }));

/* ---------- bikin tabel otomatis saat request pertama ---------- */
let siap = null;
async function pastikanTabel() {
  if (!siap) {
    siap = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS produk (
          id SERIAL PRIMARY KEY,
          nama TEXT NOT NULL,
          kategori TEXT NOT NULL DEFAULT 'Kue basah',
          harga INTEGER NOT NULL DEFAULT 0,
          satuan TEXT NOT NULL DEFAULT 'per biji',
          deskripsi TEXT DEFAULT '',
          foto TEXT,
          tersedia BOOLEAN NOT NULL DEFAULT TRUE,
          dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`;
      await sql`
        CREATE TABLE IF NOT EXISTS pengaturan (
          kunci TEXT PRIMARY KEY,
          nilai TEXT NOT NULL
        )`;
      await sql`
        INSERT INTO pengaturan (kunci, nilai) VALUES
          ('nama_toko', 'Jajan Pasar Bu Sri'),
          ('nomor_wa', '6281234567890'),
          ('alamat', 'Jl. Mawar No. 12, Malang'),
          ('catatan', 'Pesanan sebelum jam 8 malam, diambil besok pagi.')
        ON CONFLICT (kunci) DO NOTHING`;
    })();
  }
  return siap;
}

// waktu jalan lokal, sekalian sajikan folder public (di Vercel ini otomatis)
if (!process.env.VERCEL) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  app.use(express.static(path.join(__dirname, '..', 'public')));
}

app.use('/api', async (req, res, next) => {
  try {
    await pastikanTabel();
    next();
  } catch (e) {
    console.error(e);
    siap = null; // biar percobaan berikutnya coba sambung lagi
    res.status(500).json({ error: 'Database tidak bisa dihubungi. Cek DATABASE_URL.' });
  }
});

/* ---------- auth admin sederhana ---------- */
function hanyaAdmin(req, res, next) {
  const kunci = req.get('x-admin-key');
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD belum diisi di environment variable.' });
  }
  if (kunci !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Password salah.' });
  }
  next();
}

app.post('/api/login', hanyaAdmin, (req, res) => res.json({ ok: true }));

/* ---------- pengaturan toko ---------- */
app.get('/api/pengaturan', async (req, res) => {
  const baris = await sql`SELECT kunci, nilai FROM pengaturan`;
  res.json(Object.fromEntries(baris.map((b) => [b.kunci, b.nilai])));
});

app.put('/api/pengaturan', hanyaAdmin, async (req, res) => {
  const isi = req.body || {};
  for (const [kunci, nilai] of Object.entries(isi)) {
    await sql`
      INSERT INTO pengaturan (kunci, nilai) VALUES (${kunci}, ${String(nilai)})
      ON CONFLICT (kunci) DO UPDATE SET nilai = EXCLUDED.nilai`;
  }
  res.json({ ok: true });
});

/* ---------- produk ---------- */
app.get('/api/produk', async (req, res) => {
  const daftar = await sql`
    SELECT id, nama, kategori, harga, satuan, deskripsi, foto, tersedia
    FROM produk ORDER BY tersedia DESC, id DESC`;
  res.json(daftar);
});

app.post('/api/produk', hanyaAdmin, async (req, res) => {
  const p = req.body || {};
  if (!p.nama || String(p.nama).trim() === '') {
    return res.status(400).json({ error: 'Nama jajan belum diisi.' });
  }
  const [baru] = await sql`
    INSERT INTO produk (nama, kategori, harga, satuan, deskripsi, foto, tersedia)
    VALUES (${p.nama.trim()}, ${p.kategori || 'Kue basah'}, ${Number(p.harga) || 0},
            ${p.satuan || 'per biji'}, ${p.deskripsi || ''}, ${p.foto || null},
            ${p.tersedia !== false})
    RETURNING id`;
  res.status(201).json(baru);
});

app.put('/api/produk/:id', hanyaAdmin, async (req, res) => {
  const p = req.body || {};
  const [lama] = await sql`SELECT * FROM produk WHERE id = ${req.params.id}`;
  if (!lama) return res.status(404).json({ error: 'Jajan tidak ditemukan.' });

  await sql`
    UPDATE produk SET
      nama = ${p.nama ?? lama.nama},
      kategori = ${p.kategori ?? lama.kategori},
      harga = ${p.harga !== undefined ? Number(p.harga) : lama.harga},
      satuan = ${p.satuan ?? lama.satuan},
      deskripsi = ${p.deskripsi ?? lama.deskripsi},
      foto = ${p.foto !== undefined ? p.foto : lama.foto},
      tersedia = ${p.tersedia !== undefined ? !!p.tersedia : lama.tersedia}
    WHERE id = ${req.params.id}`;
  res.json({ ok: true });
});

app.delete('/api/produk/:id', hanyaAdmin, async (req, res) => {
  await sql`DELETE FROM produk WHERE id = ${req.params.id}`;
  res.json({ ok: true });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan di server.' });
});

/* ---------- jalan lokal ---------- */
if (!process.env.VERCEL) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Jalan di http://localhost:${port}`));
}

export default app;
