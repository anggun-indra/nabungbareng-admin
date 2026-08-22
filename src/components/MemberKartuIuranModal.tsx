import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Printer,
  Share2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Building2,
  Clock,
  LayoutGrid,
  List,
  Check,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";

export interface MemberKartuIuranModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: {
    id: string;
    student_name: string;
    parent_name: string;
    parent_email: string;
    effective_start_month?: string;
  };
  group: {
    id: string;
    name: string;
    school?: string;
    logo_url?: string;
    target_bulanan?: number;
    start_month?: string;
  };
}

interface MonthCardData {
  monthName: string;
  shortName: string;
  year: number;
  monthIndex: number;
  orderNumber: number;
  status: "lunas" | "menunggu" | "belum_bayar" | "belum_gabung";
  nominal: number;
  tanggal?: string;
  txId?: string;
}

const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export default function MemberKartuIuranModal({
  isOpen,
  onClose,
  member,
  group,
}: MemberKartuIuranModalProps) {
  const groupStartMonthStr = group.start_month || "2026-08";
  const groupStartYear = useMemo(() => {
    if (/^\d{4}-\d{2}$/.test(groupStartMonthStr)) {
      return parseInt(groupStartMonthStr.split("-")[0], 10);
    }
    return new Date().getFullYear();
  }, [groupStartMonthStr]);

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const currYear = new Date().getFullYear();
    return Math.max(groupStartYear, currYear);
  });

  const [viewMode, setViewMode] = useState<"card" | "list">("list"); // Default table list for admin
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [copiedWA, setCopiedWA] = useState(false);

  const targetBulanan = group.target_bulanan || 25000;

  // Load member payments from Supabase
  useEffect(() => {
    if (!isOpen || !member.id) return;

    const fetchMemberTransactions = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("payment_submissions")
          .select("id, amount_idr, transfer_date, period_label, period_allocations, status")
          .eq("group_member_id", member.id);

        if (!error && data) {
          setSubmissions(data);
        }
      } catch (err) {
        console.error("Error loading member payments:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMemberTransactions();
  }, [isOpen, member.id]);

  // Compute month list for selected year
  const monthsData = useMemo<MonthCardData[]>(() => {
    const list: MonthCardData[] = [];

    const paidMap = new Map<string, { txId: string; nominal: number; tanggal: string }>();
    const pendingMap = new Map<string, { txId: string; nominal: number; tanggal: string }>();

    submissions.forEach((tx) => {
      const isVerified = tx.status === "verified" || tx.status === "Disetujui";
      const isPending = tx.status === "pending" || tx.status === "Menunggu";

      const allocs = tx.period_allocations as Array<{ period: string; amount_idr: number }>;
      if (allocs && allocs.length > 0) {
        allocs.forEach((a) => {
          const key = a.period.trim().toLowerCase();
          if (isVerified && !paidMap.has(key)) {
            paidMap.set(key, { txId: tx.id, nominal: Number(a.amount_idr), tanggal: tx.transfer_date });
          } else if (isPending && !pendingMap.has(key)) {
            pendingMap.set(key, { txId: tx.id, nominal: Number(a.amount_idr), tanggal: tx.transfer_date });
          }
        });
      } else if (tx.period_label) {
        const parts = tx.period_label.split(",");
        parts.forEach((p: string) => {
          const key = p.trim().toLowerCase();
          if (isVerified && !paidMap.has(key)) {
            paidMap.set(key, { txId: tx.id, nominal: Number(tx.amount_idr), tanggal: tx.transfer_date });
          } else if (isPending && !pendingMap.has(key)) {
            pendingMap.set(key, { txId: tx.id, nominal: Number(tx.amount_idr), tanggal: tx.transfer_date });
          }
        });
      }
    });

    const effectiveStartMonthStr = member.effective_start_month || groupStartMonthStr;

    let displayOrder = 1;
    MONTH_NAMES_ID.forEach((monthShort, mIdx) => {
      const fullName = `${monthShort} ${selectedYear}`;
      const key = fullName.toLowerCase();
      const yyyymm = `${selectedYear}-${String(mIdx + 1).padStart(2, "0")}`;

      // Omit unstarted months completely
      if (yyyymm < groupStartMonthStr) {
        return;
      }

      const order = displayOrder++;

      if (paidMap.has(key)) {
        const item = paidMap.get(key)!;
        list.push({
          monthName: fullName,
          shortName: monthShort,
          year: selectedYear,
          monthIndex: mIdx,
          orderNumber: order,
          status: "lunas",
          nominal: item.nominal,
          tanggal: item.tanggal,
          txId: item.txId,
        });
      } else if (pendingMap.has(key)) {
        const item = pendingMap.get(key)!;
        list.push({
          monthName: fullName,
          shortName: monthShort,
          year: selectedYear,
          monthIndex: mIdx,
          orderNumber: order,
          status: "menunggu",
          nominal: item.nominal,
          tanggal: item.tanggal,
          txId: item.txId,
        });
      } else if (yyyymm < effectiveStartMonthStr) {
        list.push({
          monthName: fullName,
          shortName: monthShort,
          year: selectedYear,
          monthIndex: mIdx,
          orderNumber: order,
          status: "belum_gabung",
          nominal: 0,
        });
      } else {
        list.push({
          monthName: fullName,
          shortName: monthShort,
          year: selectedYear,
          monthIndex: mIdx,
          orderNumber: order,
          status: "belum_bayar",
          nominal: targetBulanan,
        });
      }
    });

    return list;
  }, [submissions, selectedYear, groupStartMonthStr, member.effective_start_month, targetBulanan]);

  const lunasCount = useMemo(() => monthsData.filter((m) => m.status === "lunas").length, [monthsData]);
  const pendingCount = useMemo(() => monthsData.filter((m) => m.status === "menunggu").length, [monthsData]);
  const activeObligationMonths = useMemo(() => monthsData.filter((m) => m.status !== "belum_gabung"), [monthsData]);
  const progressPercent = activeObligationMonths.length > 0
    ? Math.round((lunasCount / activeObligationMonths.length) * 100)
    : 0;
  const totalPaidIdr = lunasCount * targetBulanan;

  const handleShareWhatsApp = () => {
    let text = `*KARTU IURAN DIGITAL*\n`;
    text += `🏢 ${group.name}${group.school ? ` · ${group.school}` : ""}\n`;
    text += `👤 Anggota: ${member.student_name}\n`;
    text += `📅 Tahun: ${selectedYear}\n`;
    text += `💰 Target: Rp${targetBulanan.toLocaleString("id-ID")}/bulan\n`;
    text += `📊 Status: ${lunasCount}/${activeObligationMonths.length} Bulan Lunas (${progressPercent}%)\n\n`;
    text += `*RINCIAN BULAN IURAN:*\n`;

    monthsData.forEach((m) => {
      let icon = "⚪";
      let desc = "Belum Bayar";
      if (m.status === "lunas") {
        icon = "✅";
        desc = `LUNAS (${m.tanggal || "Terverifikasi"})`;
      } else if (m.status === "menunggu") {
        icon = "⏳";
        desc = "Menunggu Verifikasi";
      } else if (m.status === "belum_gabung") {
        icon = "➖";
        desc = "Sebelum Bergabung";
      }
      text += `${icon} ${m.monthName}: ${desc}\n`;
    });

    text += `\n_Laporan digital resmi NabungBareng_`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    setCopiedWA(true);
    setTimeout(() => setCopiedWA(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#0F172A]">Kartu Iuran Anggota</h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {member.student_name} · {group.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Kop Card */}
          <div className="bg-gradient-to-br from-slate-900 via-[#1E293B] to-slate-900 rounded-2xl p-5 text-white shadow-md relative overflow-hidden border border-slate-800">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-3 min-w-0">
                {group.logo_url ? (
                  <img
                    src={group.logo_url}
                    alt={group.name}
                    className="w-12 h-12 rounded-xl object-cover border border-white/20 bg-white"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center text-white">
                    <Building2 size={24} />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-teal-400">
                    Kartu Iuran Digital
                  </p>
                  <h4 className="text-base font-black text-white truncate">{group.name}</h4>
                  {group.school && (
                    <p className="text-xs text-slate-300 truncate font-medium">{group.school}</p>
                  )}
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-extrabold tracking-wider uppercase border border-teal-500/30">
                Resmi
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 text-xs">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Nama Anggota</p>
                <p className="text-sm font-black text-white truncate mt-0.5">{member.student_name}</p>
                <p className="text-[10.5px] text-slate-400 truncate">Akun: {member.parent_name}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Target Iuran</p>
                <p className="text-sm font-black text-teal-300 truncate mt-0.5 font-mono">
                  Rp{targetBulanan.toLocaleString("id-ID")}
                  <span className="text-[10px] font-normal text-slate-400">/bln</span>
                </p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Total Terbayar ({selectedYear})</p>
                <p className="text-sm font-black text-emerald-400 truncate mt-0.5 font-mono">
                  Rp{totalPaidIdr.toLocaleString("id-ID")}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 space-y-1.5 mt-3">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  Kelancaran Iuran Tahun {selectedYear}
                </span>
                <span className="text-teal-300 font-mono">
                  {lunasCount} dari {activeObligationMonths.length} Bulan ({progressPercent}%)
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(progressPercent, 4))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Year Controls & View Switcher */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
              <button
                type="button"
                disabled={selectedYear <= groupStartYear}
                onClick={() => setSelectedYear((y) => y - 1)}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-700 cursor-pointer"
                title="Tahun Sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-1.5 px-3">
                <Calendar size={14} className="text-teal-600" />
                <span className="font-extrabold text-xs text-[#0F172A]">Tahun {selectedYear}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedYear((y) => y + 1)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
                title="Tahun Selanjutnya"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "list" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Tampilan Tabel List"
                >
                  <List size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("card")}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "card" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Tampilan Kartu Grid"
                >
                  <LayoutGrid size={14} />
                </button>
              </div>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                {copiedWA ? <Check size={14} /> : <Share2 size={14} />}
                <span>{copiedWA ? "Membuka WA..." : "Bagikan WA"}</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Printer size={14} className="text-slate-500" />
                <span>Cetak</span>
              </button>
            </div>
          </div>

          {/* Month Data List or Cards */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Memuat data iuran...</p>
            </div>
          ) : monthsData.length === 0 ? (
            <div className="bg-slate-50 rounded-2xl p-8 text-center space-y-2 border border-slate-200">
              <AlertCircle size={28} className="mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-700">Belum Ada Periode Iuran di Tahun {selectedYear}</p>
              <p className="text-[11px] text-slate-400">Grup ini mulai iuran pada {groupStartMonthStr}.</p>
            </div>
          ) : viewMode === "list" ? (
            /* ─── TABLE VIEW (DEFAULT FOR ADMIN) ─── */
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="px-3.5 py-2.5 text-center w-10">#</th>
                    <th className="px-3.5 py-2.5">Bulan Iuran</th>
                    <th className="px-3.5 py-2.5 text-right">Nominal</th>
                    <th className="px-3.5 py-2.5 text-center">Status</th>
                    <th className="px-3.5 py-2.5 text-right">Tgl Bayar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthsData.map((item) => (
                    <tr key={item.monthName} className="hover:bg-slate-50/70">
                      <td className="px-3.5 py-2.5 text-center font-mono font-bold text-slate-400">
                        {String(item.orderNumber).padStart(2, "0")}
                      </td>
                      <td className="px-3.5 py-2.5 font-bold text-[#0F172A]">
                        {item.shortName} {item.year}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-700">
                        {item.nominal > 0 ? `Rp${item.nominal.toLocaleString("id-ID")}` : "—"}
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        {item.status === "lunas" ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300/80">
                            ★ LUNAS
                          </span>
                        ) : item.status === "menunggu" ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300/80">
                            Verifikasi
                          </span>
                        ) : item.status === "belum_gabung" ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                            Sebelum Gabung
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Belum Iuran
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-right text-slate-500 font-mono text-[11px]">
                        {item.tanggal || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* ─── CARD GRID VIEW ─── */
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {monthsData.map((item) => (
                <div
                  key={item.monthName}
                  className={`rounded-2xl p-3 border flex flex-col justify-between min-h-[110px] ${
                    item.status === "lunas"
                      ? "bg-emerald-50/80 border-emerald-200 shadow-2xs"
                      : item.status === "menunggu"
                      ? "bg-amber-50/80 border-amber-200 shadow-2xs"
                      : item.status === "belum_gabung"
                      ? "bg-slate-50/60 border-slate-200/60 opacity-60"
                      : "bg-white border-slate-200 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      #{String(item.orderNumber).padStart(2, "0")}
                    </span>
                    <span className="text-xs font-black text-[#0F172A]">{item.shortName}</span>
                  </div>

                  <div className="py-1.5 text-center">
                    {item.status === "lunas" ? (
                      <div className="inline-flex flex-col items-center">
                        <div className="px-2 py-0.5 rounded-md border border-emerald-600 text-emerald-700 font-black text-[10px] uppercase bg-emerald-100/50">
                          ★ LUNAS ★
                        </div>
                        <p className="text-[10px] font-bold text-emerald-900 font-mono mt-1">
                          Rp{item.nominal.toLocaleString("id-ID")}
                        </p>
                      </div>
                    ) : item.status === "menunggu" ? (
                      <div className="inline-flex flex-col items-center">
                        <span className="px-2 py-0.5 rounded-md border border-amber-500 text-amber-800 font-bold text-[9.5px] uppercase bg-amber-100/70">
                          Verifikasi
                        </span>
                        <p className="text-[10px] font-bold text-amber-800 font-mono mt-1">
                          Rp{item.nominal.toLocaleString("id-ID")}
                        </p>
                      </div>
                    ) : item.status === "belum_gabung" ? (
                      <span className="text-[9.5px] text-slate-400 italic">Sebelum Gabung</span>
                    ) : (
                      <div className="inline-flex flex-col items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Belum Iuran</span>
                        <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">
                          Rp{item.nominal.toLocaleString("id-ID")}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-1 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>{item.tanggal || "—"}</span>
                    {item.status === "lunas" && <span className="text-emerald-700 font-bold">Terverifikasi</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
