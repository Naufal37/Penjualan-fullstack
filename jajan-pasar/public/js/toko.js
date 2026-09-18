const el = (id) => document.getElementById(id);
const rupiah = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');

let semuaProduk = [];
let kategoriAktif = 'Semua';
let pengaturan = {};
const keranjang = new Map(); // id -> jumlah

async function muat() {
  try {
    const [pRes, sRes] = await Promise.all([fetch('/api/produk'), fetch('/api/pengaturan')]);
    if (!pRes.ok) throw new Error('gagal');
    semuaProduk = await pRes.json();
    pengaturan = sRes.ok ? await sRes.json() : {};
  } catch (e) {
    el('daftar').innerHTML =
      '<div class="kosong-pesan">Daftar jajan belum bisa dimuat. Coba muat ulang halaman ini.</div>';
    return;
  }
  pasangPengaturan();
  pasangTumpukanFoto();
  pasangFilter();
  gambarDaftar();
}

function pasangTumpukanFoto() {
  const berfoto = semuaProduk.filter((p) => p.foto).slice(0, 3);
  el('tumpuk-foto').innerHTML = berfoto
    .map((p) => `<img src="${p.foto}" alt="${p.nama}">`)
    .join('');
}

function pasangPengaturan() {
  const nama = pengaturan.nama_toko || 'Jajan Pasar';
  el('nama-toko').textContent = nama;
  el('footer-nama').textContent = nama;
  document.title = nama + ' — jajan pasar rumahan';

  if (pengaturan.alamat) {
    el('bar-alamat').textContent = pengaturan.alamat;
    el('footer-alamat').textContent = pengaturan.alamat;
  }
  if (pengaturan.nomor_wa) {
    const wa = el('footer-wa');
    wa.textContent = '+' + pengaturan.nomor_wa;
    wa.href = 'https://wa.me/' + pengaturan.nomor_wa;
  }
  if (pengaturan.catatan) {
    el('catatan-hari').textContent = pengaturan.catatan;
    el('catatan-hari').hidden = false;
  }
}

function pasangFilter() {
  const daftarKategori = ['Semua', ...new Set(semuaProduk.map((p) => p.kategori).filter(Boolean))];
  el('filter').innerHTML = daftarKategori
    .map(
      (k) =>
        `<button type="button" data-kategori="${k}" aria-pressed="${k === kategoriAktif}">${k}</button>`
    )
    .join('');
  el('filter').querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', () => {
      kategoriAktif = b.dataset.kategori;
      pasangFilter();
      gambarDaftar();
    });
  });
}

function gambarDaftar() {
  const tampil = semuaProduk.filter(
    (p) => kategoriAktif === 'Semua' || p.kategori === kategoriAktif
  );

  if (!tampil.length) {
    el('daftar').innerHTML =
      '<div class="kosong-pesan">Belum ada jajan di daftar ini. Tambahkan lewat halaman pemilik.</div>';
    return;
  }

  el('daftar').innerHTML = tampil
    .map((p) => {
      const foto = p.foto
        ? `<img class="foto" src="${p.foto}" alt="${p.nama}" loading="lazy">`
        : `<div class="foto kosong">Foto belum diunggah</div>`;
      const kaki = p.tersedia
        ? `<div class="stepper" data-id="${p.id}">
             <button type="button" data-aksi="kurang" aria-label="Kurangi ${p.nama}">−</button>
             <span class="jml" data-jml="${p.id}">${keranjang.get(p.id) || 0}</span>
             <button type="button" data-aksi="tambah" aria-label="Tambah ${p.nama}">+</button>
           </div>`
        : `<span class="label-habis">Habis hari ini</span>`;

      return `<article class="kartu ${p.tersedia ? '' : 'habis'}">
        ${foto}
        <div class="kartu-isi">
          <h3>${p.nama}</h3>
          <p class="jenis">${p.kategori || ''}</p>
          ${p.deskripsi ? `<p class="ket">${p.deskripsi}</p>` : ''}
          <p class="harga">${rupiah(p.harga)} <small>${p.satuan || ''}</small></p>
          <div class="kaki">${kaki}</div>
        </div>
      </article>`;
    })
    .join('');

  el('daftar').querySelectorAll('.stepper button').forEach((b) => {
    b.addEventListener('click', () => {
      const id = Number(b.parentElement.dataset.id);
      const sekarang = keranjang.get(id) || 0;
      const baru = b.dataset.aksi === 'tambah' ? sekarang + 1 : Math.max(0, sekarang - 1);
      baru === 0 ? keranjang.delete(id) : keranjang.set(id, baru);
      document.querySelector(`[data-jml="${id}"]`).textContent = baru;
      perbaruiBar();
    });
  });
}

function perbaruiBar() {
  let jumlahItem = 0;
  let total = 0;
  const baris = [];

  keranjang.forEach((jml, id) => {
    const p = semuaProduk.find((x) => x.id === id);
    if (!p) return;
    jumlahItem += jml;
    total += jml * p.harga;
    baris.push(`- ${p.nama} x${jml} (${rupiah(p.harga * jml)})`);
  });

  el('bar-total').textContent = rupiah(total);
  el('bar-item').textContent = jumlahItem + ' item dipilih';
  el('bar-pesan').classList.toggle('tampil', jumlahItem > 0);

  const pesan =
    `Halo, saya mau pesan dari ${pengaturan.nama_toko || 'Jajan Pasar'}:\n` +
    baris.join('\n') +
    `\n\nTotal: ${rupiah(total)}\nNama saya: \nAmbil sendiri / diantar: `;
  el('bar-kirim').href =
    'https://wa.me/' + (pengaturan.nomor_wa || '') + '?text=' + encodeURIComponent(pesan);
}

muat();
