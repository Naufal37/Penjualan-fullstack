-- Tabel dibuat otomatis oleh server saat request pertama.
-- File ini cuma cadangan kalau mau bikin manual lewat SQL Editor di Neon.

CREATE TABLE IF NOT EXISTS produk (
  id          SERIAL PRIMARY KEY,
  nama        TEXT NOT NULL,
  kategori    TEXT NOT NULL DEFAULT 'Kue basah',
  harga       INTEGER NOT NULL DEFAULT 0,
  satuan      TEXT NOT NULL DEFAULT 'per biji',
  deskripsi   TEXT DEFAULT '',
  foto        TEXT,                 -- data URL base64 hasil kompres di browser
  tersedia    BOOLEAN NOT NULL DEFAULT TRUE,
  dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pengaturan (
  kunci TEXT PRIMARY KEY,
  nilai TEXT NOT NULL
);

INSERT INTO pengaturan (kunci, nilai) VALUES
  ('nama_toko', 'Jajan Pasar Bu Sri'),
  ('nomor_wa',  '6281234567890'),
  ('alamat',    'Jl. Mawar No. 12, Malang'),
  ('catatan',   'Pesanan sebelum jam 8 malam, diambil besok pagi.')
ON CONFLICT (kunci) DO NOTHING;

-- Contoh isi awal (opsional)
-- INSERT INTO produk (nama, kategori, harga, satuan, deskripsi) VALUES
--   ('Onde-onde', 'Kue basah', 2000, 'per biji', 'Isi kacang hijau, wijen banyak.'),
--   ('Putu ayu',  'Kue basah', 2500, 'per biji', 'Pandan, taburan kelapa parut.'),
--   ('Donat gula','Donat',     2500, 'per biji', 'Empuk, gula halus.');
