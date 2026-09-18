const el = (id) => document.getElementById(id);
const rupiah = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');

let kunci = sessionStorage.getItem('kunci-admin') || '';
let fotoTersimpan = null;   // data URL foto yang siap dikirim
let sedangEdit = null;      // id produk yang lagi diedit

/* ---------- pembantu ---------- */
async function api(jalur, opsi = {}) {
  const res = await fetch(jalur, {
    ...opsi,
    headers: { 'Content-Type': 'application/json', 'x-admin-key': kunci, ...(opsi.headers || {}) },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Permintaan gagal.');
  }
  return res.json();
}

let jedaToast;
function toast(teks) {
  const t = el('toast');
  t.textContent = teks;
  t.hidden = false;
  clearTimeout(jedaToast);
  jedaToast = setTimeout(() => (t.hidden = true), 2600);
}

/* ---------- login ---------- */
async function masuk(sandi) {
  kunci = sandi;
  await api('/api/login', { method: 'POST', body: '{}' });
  sessionStorage.setItem('kunci-admin', sandi);
  el('layar-login').hidden = true;
  el('layar-panel').hidden = false;
  await Promise.all([muatProduk(), muatPengaturan()]);
}

el('tombol-masuk').addEventListener('click', async () => {
  el('galat-login').hidden = true;
  try {
    await masuk(el('sandi').value);
  } catch (e) {
    el('galat-login').textContent = e.message;
    el('galat-login').hidden = false;
  }
});
el('sandi').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') el('tombol-masuk').click();
});

el('tombol-keluar').addEventListener('click', () => {
  sessionStorage.removeItem('kunci-admin');
  location.reload();
});

/* ---------- kecilkan foto sebelum disimpan ---------- */
function kecilkanFoto(file, maksLebar = 900, mutu = 0.72) {
  return new Promise((selesai, gagal) => {
    const pembaca = new FileReader();
    pembaca.onload = () => {
      const gambar = new Image();
      gambar.onload = () => {
        const skala = Math.min(1, maksLebar / gambar.width);
        const kanvas = document.createElement('canvas');
        kanvas.width = Math.round(gambar.width * skala);
        kanvas.height = Math.round(gambar.height * skala);
        kanvas.getContext('2d').drawImage(gambar, 0, 0, kanvas.width, kanvas.height);
        selesai(kanvas.toDataURL('image/jpeg', mutu));
      };
      gambar.onerror = () => gagal(new Error('File itu bukan gambar yang bisa dibaca.'));
      gambar.src = pembaca.result;
    };
    pembaca.onerror = () => gagal(new Error('Foto gagal dibaca.'));
    pembaca.readAsDataURL(file);
  });
}

el('f-foto').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    fotoTersimpan = await kecilkanFoto(file);
    el('pratinjau-img').src = fotoTersimpan;
    el('pratinjau').hidden = false;
  } catch (err) {
    el('galat-form').textContent = err.message;
    el('galat-form').hidden = false;
  }
});

el('hapus-foto').addEventListener('click', () => {
  fotoTersimpan = null;
  el('f-foto').value = '';
  el('pratinjau').hidden = true;
});

/* ---------- simpan produk ---------- */
function kosongkanForm() {
  sedangEdit = null;
  fotoTersimpan = null;
  ['f-nama', 'f-kategori', 'f-harga', 'f-satuan', 'f-deskripsi'].forEach((i) => (el(i).value = ''));
  el('f-tersedia').checked = true;
  el('f-foto').value = '';
  el('pratinjau').hidden = true;
  el('judul-form').textContent = 'Tambah jajan';
  el('tombol-simpan').textContent = 'Simpan jajan';
  el('tombol-batal').hidden = true;
  el('galat-form').hidden = true;
}

el('tombol-batal').addEventListener('click', kosongkanForm);

el('tombol-simpan').addEventListener('click', async () => {
  el('galat-form').hidden = true;
  const isi = {
    nama: el('f-nama').value.trim(),
    kategori: el('f-kategori').value.trim() || 'Kue basah',
    harga: Number(el('f-harga').value) || 0,
    satuan: el('f-satuan').value.trim() || 'per biji',
    deskripsi: el('f-deskripsi').value.trim(),
    tersedia: el('f-tersedia').checked,
  };
  if (!isi.nama) {
    el('galat-form').textContent = 'Nama jajan belum diisi.';
    el('galat-form').hidden = false;
    return;
  }
  if (fotoTersimpan) isi.foto = fotoTersimpan;
  else if (sedangEdit && el('pratinjau').hidden) isi.foto = null;

  try {
    if (sedangEdit) {
      await api('/api/produk/' + sedangEdit, { method: 'PUT', body: JSON.stringify(isi) });
      toast('Jajan diperbarui.');
    } else {
      await api('/api/produk', { method: 'POST', body: JSON.stringify(isi) });
      toast('Jajan ditambahkan.');
    }
    kosongkanForm();
    muatProduk();
  } catch (e) {
    el('galat-form').textContent = e.message;
    el('galat-form').hidden = false;
  }
});

/* ---------- daftar produk ---------- */
let daftarProduk = [];

async function muatProduk() {
  daftarProduk = await api('/api/produk');
  const wadah = el('tabel-produk');

  if (!daftarProduk.length) {
    wadah.innerHTML = '<p class="bantuan">Belum ada jajan. Tambahkan lewat form di atas.</p>';
    return;
  }

  wadah.innerHTML = daftarProduk
    .map(
      (p) => `
      <div class="baris-produk">
        ${p.foto ? `<img src="${p.foto}" alt="">` : `<div class="nofoto">tanpa foto</div>`}
        <div>
          <div class="nama">${p.nama}</div>
          <div class="meta">${p.kategori} · ${rupiah(p.harga)} ${p.satuan} · ${
        p.tersedia ? 'tersedia' : 'habis'
      }</div>
        </div>
        <div class="aksi">
          <button data-edit="${p.id}">Ubah</button>
          <button data-stok="${p.id}">${p.tersedia ? 'Tandai habis' : 'Tandai ada'}</button>
          <button class="bahaya" data-hapus="${p.id}">Hapus</button>
        </div>
      </div>`
    )
    .join('');

  wadah.querySelectorAll('[data-edit]').forEach((b) =>
    b.addEventListener('click', () => isiFormEdit(Number(b.dataset.edit)))
  );
  wadah.querySelectorAll('[data-stok]').forEach((b) =>
    b.addEventListener('click', async () => {
      const p = daftarProduk.find((x) => x.id === Number(b.dataset.stok));
      await api('/api/produk/' + p.id, {
        method: 'PUT',
        body: JSON.stringify({ tersedia: !p.tersedia }),
      });
      toast(p.tersedia ? 'Ditandai habis.' : 'Ditandai tersedia.');
      muatProduk();
    })
  );
  wadah.querySelectorAll('[data-hapus]').forEach((b) =>
    b.addEventListener('click', async () => {
      if (!confirm('Hapus jajan ini dari daftar?')) return;
      await api('/api/produk/' + b.dataset.hapus, { method: 'DELETE' });
      toast('Jajan dihapus.');
      if (sedangEdit === Number(b.dataset.hapus)) kosongkanForm();
      muatProduk();
    })
  );
}

function isiFormEdit(id) {
  const p = daftarProduk.find((x) => x.id === id);
  if (!p) return;
  sedangEdit = id;
  fotoTersimpan = null;
  el('f-nama').value = p.nama;
  el('f-kategori').value = p.kategori;
  el('f-harga').value = p.harga;
  el('f-satuan').value = p.satuan;
  el('f-deskripsi').value = p.deskripsi || '';
  el('f-tersedia').checked = p.tersedia;
  el('f-foto').value = '';
  if (p.foto) {
    el('pratinjau-img').src = p.foto;
    el('pratinjau').hidden = false;
  } else {
    el('pratinjau').hidden = true;
  }
  el('judul-form').textContent = 'Ubah ' + p.nama;
  el('tombol-simpan').textContent = 'Simpan perubahan';
  el('tombol-batal').hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- pengaturan toko ---------- */
async function muatPengaturan() {
  const s = await (await fetch('/api/pengaturan')).json();
  el('s-nama').value = s.nama_toko || '';
  el('s-wa').value = s.nomor_wa || '';
  el('s-alamat').value = s.alamat || '';
  el('s-catatan').value = s.catatan || '';
}

el('tombol-simpan-info').addEventListener('click', async () => {
  try {
    await api('/api/pengaturan', {
      method: 'PUT',
      body: JSON.stringify({
        nama_toko: el('s-nama').value.trim(),
        nomor_wa: el('s-wa').value.replace(/\D/g, ''),
        alamat: el('s-alamat').value.trim(),
        catatan: el('s-catatan').value.trim(),
      }),
    });
    toast('Info toko disimpan.');
  } catch (e) {
    toast(e.message);
  }
});

/* ---------- kalau sesi sebelumnya masih ada ---------- */
if (kunci) {
  masuk(kunci).catch(() => sessionStorage.removeItem('kunci-admin'));
}
