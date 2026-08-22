export type StatusSiswa = "aktif" | "nunggak" | "lunas";
export type StatusSetoran = "menunggu" | "terverifikasi" | "ditolak" | "minta_perbaikan" | "dibatalkan";

export interface Siswa {
  id: string;
  nama: string;
  kelas: string;
  saldo: number;
  setoranPeriodeIni: number;
  status: StatusSiswa;
  aktivitasTerakhir: string;
  avatar: string;
}

export interface BuktiSetoran {
  id: string;
  siswaId: string;
  nama: string;
  kelas: string;
  nominal: number;
  periode: string;
  tanggal: string;
  bank: string;
  nomorReferensi: string;
  status: StatusSetoran;
  alasanTolak?: string;
  catatan?: string;
  fotoUrl: string;
  saldoSebelum: number;
}

export interface Pengeluaran {
  id: string;
  deskripsi: string;
  kategori: string;
  total: number;
  tanggal: string;
  peserta: number;
  perSiswa: number;
  dicatatOleh: string;
}

export interface AuditLog {
  id: string;
  aksi: string;
  detail: string;
  oleh: string;
  waktu: string;
  tipe: "verifikasi" | "pengeluaran" | "rekonsiliasi" | "sistem" | "tolak";
}

export const siswaDaftar: Siswa[] = [
  { id: "s1", nama: "Aditya Pratama", kelas: "4B", saldo: 285000, setoranPeriodeIni: 25000, status: "aktif", aktivitasTerakhir: "2 jam lalu", avatar: "AP" },
  { id: "s2", nama: "Bunga Ramadhani", kelas: "4B", saldo: 310000, setoranPeriodeIni: 25000, status: "aktif", aktivitasTerakhir: "Kemarin", avatar: "BR" },
  { id: "s3", nama: "Candra Wijaya", kelas: "4B", saldo: 18000, setoranPeriodeIni: 0, status: "nunggak", aktivitasTerakhir: "5 hari lalu", avatar: "CW" },
  { id: "s4", nama: "Dewi Kusuma", kelas: "4B", saldo: 425000, setoranPeriodeIni: 25000, status: "aktif", aktivitasTerakhir: "1 jam lalu", avatar: "DK" },
  { id: "s5", nama: "Eko Santoso", kelas: "4B", saldo: 0, setoranPeriodeIni: 0, status: "nunggak", aktivitasTerakhir: "2 minggu lalu", avatar: "ES" },
  { id: "s6", nama: "Fira Nadia", kelas: "4B", saldo: 375000, setoranPeriodeIni: 25000, status: "aktif", aktivitasTerakhir: "3 jam lalu", avatar: "FN" },
  { id: "s7", nama: "Gilang Ramadhan", kelas: "4B", saldo: 150000, setoranPeriodeIni: 25000, status: "aktif", aktivitasTerakhir: "Kemarin", avatar: "GR" },
  { id: "s8", nama: "Hana Putri", kelas: "4B", saldo: 500000, setoranPeriodeIni: 25000, status: "lunas", aktivitasTerakhir: "4 jam lalu", avatar: "HP" },
  { id: "s9", nama: "Irfan Hakim", kelas: "4B", saldo: 200000, setoranPeriodeIni: 25000, status: "aktif", aktivitasTerakhir: "Kemarin", avatar: "IH" },
  { id: "s10", nama: "Jasmine Aulia", kelas: "4B", saldo: 75000, setoranPeriodeIni: 0, status: "nunggak", aktivitasTerakhir: "1 minggu lalu", avatar: "JA" },
  { id: "s11", nama: "Kevin Halim", kelas: "4B", saldo: 330000, setoranPeriodeIni: 25000, status: "aktif", aktivitasTerakhir: "5 jam lalu", avatar: "KH" },
  { id: "s12", nama: "Laila Sari", kelas: "4B", saldo: 225000, setoranPeriodeIni: 25000, status: "aktif", aktivitasTerakhir: "Hari ini", avatar: "LS" },
  { id: "s13", nama: "Miko Pratama", kelas: "4B", saldo: 400000, setoranPeriodeIni: 25000, status: "aktif", aktivitasTerakhir: "6 jam lalu", avatar: "MP" },
  { id: "s14", nama: "Nadia Rahayu", kelas: "4B", saldo: 0, setoranPeriodeIni: 0, status: "nunggak", aktivitasTerakhir: "3 minggu lalu", avatar: "NR" },
  { id: "s15", nama: "Oscar Budiman", kelas: "4B", saldo: 275000, setoranPeriodeIni: 25000, status: "aktif", aktivitasTerakhir: "Kemarin", avatar: "OB" },
];

export const buktiSetoran: BuktiSetoran[] = [
  { id: "b1", siswaId: "s1", nama: "Aditya Pratama", kelas: "4B", nominal: 25000, periode: "Agustus 2026", tanggal: "18 Agt 2026, 08.15", bank: "BCA", nomorReferensi: "TRF20260818001", status: "menunggu", catatan: "Setoran tabungan bulan Agustus", fotoUrl: "https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=400&h=600&fit=crop&auto=format", saldoSebelum: 260000 },
  { id: "b2", siswaId: "s4", nama: "Dewi Kusuma", kelas: "4B", nominal: 25000, periode: "Agustus 2026", tanggal: "18 Agt 2026, 07.42", bank: "Mandiri", nomorReferensi: "TRF20260818002", status: "menunggu", catatan: "", fotoUrl: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=600&fit=crop&auto=format", saldoSebelum: 400000 },
  { id: "b3", siswaId: "s12", nama: "Laila Sari", kelas: "4B", nominal: 25000, periode: "Agustus 2026", tanggal: "17 Agt 2026, 20.11", bank: "BNI", nomorReferensi: "TRF20260817008", status: "menunggu", catatan: "Maaf terlambat kak", fotoUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=600&fit=crop&auto=format", saldoSebelum: 200000 },
  { id: "b4", siswaId: "s6", nama: "Fira Nadia", kelas: "4B", nominal: 25000, periode: "Agustus 2026", tanggal: "17 Agt 2026, 16.03", bank: "BSI", nomorReferensi: "TRF20260817005", status: "terverifikasi", fotoUrl: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400&h=600&fit=crop&auto=format", saldoSebelum: 350000 },
  { id: "b5", siswaId: "s8", nama: "Hana Putri", kelas: "4B", nominal: 25000, periode: "Agustus 2026", tanggal: "17 Agt 2026, 14.30", bank: "BCA", nomorReferensi: "TRF20260817003", status: "terverifikasi", fotoUrl: "https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=400&h=600&fit=crop&auto=format", saldoSebelum: 475000 },
  { id: "b6", siswaId: "s3", nama: "Candra Wijaya", kelas: "4B", nominal: 25000, periode: "Juli 2026", tanggal: "16 Agt 2026, 09.20", bank: "Mandiri", nomorReferensi: "TRF20260816001", status: "ditolak", alasanTolak: "Nominal tidak sesuai, tertera Rp15.000 bukan Rp25.000", fotoUrl: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=600&fit=crop&auto=format", saldoSebelum: 18000 },
  { id: "b7", siswaId: "s9", nama: "Irfan Hakim", kelas: "4B", nominal: 25000, periode: "Agustus 2026", tanggal: "16 Agt 2026, 11.00", bank: "GoPay", nomorReferensi: "TRF20260816003", status: "minta_perbaikan", catatan: "Foto blur, mohon upload ulang bukti yang lebih jelas", fotoUrl: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&h=600&fit=crop&auto=format", saldoSebelum: 175000 },
];

export const pengeluaranList: Pengeluaran[] = [
  { id: "e1", deskripsi: "Pembelian alat tulis kelas", kategori: "Perlengkapan", total: 180000, tanggal: "15 Agt 2026", peserta: 15, perSiswa: 12000, dicatatOleh: "Bu Rini" },
  { id: "e2", deskripsi: "Snack ulang tahun kelas", kategori: "Sosial", total: 375000, tanggal: "10 Agt 2026", peserta: 15, perSiswa: 25000, dicatatOleh: "Bu Rini" },
  { id: "e3", deskripsi: "Kertas HVS dan tinta printer", kategori: "Perlengkapan", total: 85000, tanggal: "5 Agt 2026", peserta: 15, perSiswa: 5667, dicatatOleh: "Pak Andi" },
  { id: "e4", deskripsi: "Biaya study tour", kategori: "Kegiatan", total: 750000, tanggal: "28 Jul 2026", peserta: 15, perSiswa: 50000, dicatatOleh: "Bu Rini" },
];

export const grafikData = [
  { bulan: "Mar", setoran: 325000 },
  { bulan: "Apr", setoran: 350000 },
  { bulan: "Mei", setoran: 375000 },
  { bulan: "Jun", setoran: 300000 },
  { bulan: "Jul", setoran: 350000 },
  { bulan: "Agt", setoran: 175000 },
];

export const auditLog: AuditLog[] = [
  { id: "a1", aksi: "Setoran Diverifikasi", detail: "Setoran Fira Nadia Rp25.000 — Agt 2026 diverifikasi", oleh: "Bu Rini", waktu: "17 Agt, 16.05", tipe: "verifikasi" },
  { id: "a2", aksi: "Setoran Diverifikasi", detail: "Setoran Hana Putri Rp25.000 — Agt 2026 diverifikasi", oleh: "Bu Rini", waktu: "17 Agt, 14.33", tipe: "verifikasi" },
  { id: "a3", aksi: "Setoran Ditolak", detail: "Setoran Candra Wijaya ditolak: Nominal tidak sesuai", oleh: "Bu Rini", waktu: "16 Agt, 09.25", tipe: "tolak" },
  { id: "a4", aksi: "Pengeluaran Dicatat", detail: "Pembelian alat tulis Rp180.000 — 15 siswa", oleh: "Bu Rini", waktu: "15 Agt, 13.00", tipe: "pengeluaran" },
  { id: "a5", aksi: "Rekonsiliasi Selesai", detail: "Saldo rekening cocok dengan ledger: Rp4.250.000", oleh: "Pak Andi", waktu: "14 Agt, 10.00", tipe: "rekonsiliasi" },
];

export const formatRupiah = (nominal: number): string => {
  return "Rp" + nominal.toLocaleString("id-ID");
};
