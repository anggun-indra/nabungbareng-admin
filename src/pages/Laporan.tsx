import React, { useState, useEffect } from "react";
import {
  Download,
  FileText,
  BarChart2,
  Users,
  Receipt,
  CheckCircle,
  Building2,
  Globe,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export default function Laporan() {
  const { activeGroup } = useAuth();

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Date filters
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const todayStr = now.toISOString().split("T")[0];
  const [periodeFrom, setPeriodeFrom] = useState(firstDayOfMonth);
  const [periodeTo, setPeriodeTo] = useState(todayStr);

  // Financial Stats
  const [stats, setStats] = useState({
    totalKasSistem: 0,
    totalSetoranPeriode: 0,
    totalPengeluaranPeriode: 0,
    jumlahSiswa: 0,
    publicReportEnabled: false,
    publicSlug: "",
  });

  // Slug editing
  const [slugInput, setSlugInput] = useState("");
  const [isPublicEnabled, setIsPublicEnabled] = useState(false);
  const [isSavingSlug, setIsSavingSlug] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadFinancialStats = async () => {
    if (!activeGroup?.group_id) return;
    setLoading(true);

    try {
      // 1. Fetch group cash balance
      const { data: cashData } = await supabase
        .from("group_cash_balances")
        .select("balance_idr")
        .eq("group_id", activeGroup.group_id)
        .maybeSingle();

      // 2. Fetch group settings (public report)
      const { data: grpData } = await supabase
        .from("groups")
        .select("public_report_enabled, public_slug")
        .eq("id", activeGroup.group_id)
        .single();

      // 3. Fetch deposits in date range
      const { data: depData } = await supabase
        .from("payment_submissions")
        .select("amount_idr")
        .eq("group_id", activeGroup.group_id)
        .eq("status", "verified")
        .gte("transfer_date", periodeFrom)
        .lte("transfer_date", periodeTo);

      const totalDeposits = (depData || []).reduce((acc, curr) => acc + Number(curr.amount_idr), 0);

      // 4. Fetch expenses in date range
      const { data: expData } = await supabase
        .from("expenses")
        .select("amount_idr")
        .eq("group_id", activeGroup.group_id)
        .eq("status", "posted")
        .gte("expense_date", periodeFrom)
        .lte("expense_date", periodeTo);

      const totalExpenses = (expData || []).reduce((acc, curr) => acc + Number(curr.amount_idr), 0);

      // 5. Fetch student count
      const { count: studentCount } = await supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", activeGroup.group_id)
        .eq("role", "member")
        .eq("active", true);

      setStats({
        totalKasSistem: Number(cashData?.balance_idr || 0),
        totalSetoranPeriode: totalDeposits,
        totalPengeluaranPeriode: totalExpenses,
        jumlahSiswa: studentCount || 0,
        publicReportEnabled: grpData?.public_report_enabled || false,
        publicSlug: grpData?.public_slug || "",
      });

      setIsPublicEnabled(grpData?.public_report_enabled || false);
      setSlugInput(grpData?.public_slug || "");
    } catch (err) {
      console.error("Error loading financial report stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinancialStats();
  }, [activeGroup?.group_id, periodeFrom, periodeTo]);

  // Real CSV Export Generators
  const triggerCSVDownload = (filename: string, headers: string[], rows: any[][]) => {
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportReport = async (reportType: string) => {
    if (!activeGroup?.group_id) return;
    setDownloading(reportType);

    try {
      if (reportType === "saldo_siswa") {
        const { data: membersData } = await supabase
          .from("group_members")
          .select("id, user_id, student_name, display_name")
          .eq("group_id", activeGroup.group_id)
          .eq("role", "member")
          .eq("active", true);

        if (membersData) {
          const { data: balancesData } = await supabase
            .from("member_balances")
            .select("group_member_id, balance_idr")
            .eq("group_id", activeGroup.group_id);

          const balancesMap = new Map<string, number>();
          if (balancesData) {
            balancesData.forEach((b: any) => balancesMap.set(b.group_member_id, Number(b.balance_idr)));
          }

          const userIds = membersData.map((m: any) => m.user_id).filter(Boolean);
          const profilesMap = new Map<string, string>();
          if (userIds.length > 0) {
            const { data: profilesData } = await supabase
              .from("profiles")
              .select("id, email")
              .in("id", userIds);
            if (profilesData) {
              profilesData.forEach((p: any) => profilesMap.set(p.id, p.email));
            }
          }

          const headers = ["ID Member", "Nama Member", "Akun Login", "Email", "Saldo Simpanan (Rp)"];
          const rows = membersData.map((s: any) => {
            const bal = balancesMap.get(s.id) ?? 0;
            return [
              s.id,
              `"${s.student_name || s.display_name}"`,
              `"${s.display_name || '-'}"`,
              `"${profilesMap.get(s.user_id) || '-'}"`,
              Number(bal),
            ];
          });
          triggerCSVDownload(`laporan_saldo_member_${todayStr}.csv`, headers, rows);
        }
      } else if (reportType === "setoran") {
        const { data } = await supabase
          .from("payment_submissions")
          .select(`
            id,
            amount_idr,
            transfer_date,
            period_label,
            status,
            group_members (student_name, display_name)
          `)
          .eq("group_id", activeGroup.group_id)
          .gte("transfer_date", periodeFrom)
          .lte("transfer_date", periodeTo)
          .order("transfer_date", { ascending: false });

        if (data) {
          const headers = ["ID Transaksi", "Nama Member", "Periode Iuran", "Nominal (Rp)", "Tanggal Transfer", "Status"];
          const rows = data.map((s: any) => [
            s.id,
            `"${s.group_members?.student_name || s.group_members?.display_name || '-'}"`,
            `"${s.period_label}"`,
            s.amount_idr,
            s.transfer_date,
            s.status,
          ]);
          triggerCSVDownload(`laporan_setoran_${periodeFrom}_sd_${periodeTo}.csv`, headers, rows);
        }
      } else if (reportType === "pengeluaran") {
        const { data } = await supabase
          .from("expenses")
          .select("*")
          .eq("group_id", activeGroup.group_id)
          .gte("expense_date", periodeFrom)
          .lte("expense_date", periodeTo)
          .order("expense_date", { ascending: false });

        if (data) {
          const headers = ["ID Pengeluaran", "Keperluan", "Kategori", "Total Biaya (Rp)", "Tanggal Pengeluaran", "Status"];
          const rows = data.map((e: any) => [
            e.id,
            `"${e.description}"`,
            `"${e.category}"`,
            e.amount_idr,
            e.expense_date,
            e.status,
          ]);
          triggerCSVDownload(`laporan_pengeluaran_${periodeFrom}_sd_${periodeTo}.csv`, headers, rows);
        }
      } else if (reportType === "rekonsiliasi") {
        const { data } = await supabase
          .from("reconciliations")
          .select("*")
          .eq("group_id", activeGroup.group_id)
          .order("statement_date", { ascending: false });

        if (data) {
          const headers = ["ID", "Tanggal Posisi", "Saldo Bank (Rp)", "Saldo Ledger (Rp)", "Selisih (Rp)", "Catatan"];
          const rows = data.map((r: any) => [
            r.id,
            r.statement_date,
            r.bank_balance_idr,
            r.app_balance_idr,
            r.difference_idr,
            `"${r.note || '-'}"`,
          ]);
          triggerCSVDownload(`laporan_rekonsiliasi_${todayStr}.csv`, headers, rows);
        }
      } else if (reportType === "audit") {
        const { data } = await supabase
          .from("audit_events")
          .select("*")
          .eq("group_id", activeGroup.group_id)
          .order("created_at", { ascending: false })
          .limit(200);

        if (data) {
          const headers = ["ID", "Aksi", "Actor User ID", "Tanggal & Waktu", "Detail Metadata"];
          const rows = data.map((a: any) => [
            a.id,
            `"${a.action}"`,
            `"${a.actor_user_id}"`,
            a.created_at,
            `"${JSON.stringify(a.metadata || {}).replace(/"/g, '""')}"`,
          ]);
          triggerCSVDownload(`audit_trail_${todayStr}.csv`, headers, rows);
        }
      }

      showToast("success", "Laporan berhasil diunduh dalam format CSV!");
    } catch (err: any) {
      showToast("error", err.message || "Gagal mengunduh laporan.");
    } finally {
      setDownloading(null);
    }
  };

  const handleSavePublicSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup?.group_id) return;
    setIsSavingSlug(true);

    try {
      const cleanSlug = slugInput
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      const { error } = await supabase
        .from("groups")
        .update({
          public_report_enabled: isPublicEnabled,
          public_slug: cleanSlug || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeGroup.group_id);

      if (error) throw error;

      showToast("success", "Pengaturan Laporan Publik berhasil disimpan!");
      setSlugInput(cleanSlug);
      loadFinancialStats();
    } catch (err: any) {
      showToast("error", err.message || "Gagal menyimpan laporan publik.");
    } finally {
      setIsSavingSlug(false);
    }
  };

  const publicUrl = stats.publicSlug
    ? `${window.location.origin}/r/${stats.publicSlug}`
    : `${window.location.origin}/r/${activeGroup?.group_id}`;

  const copyPublicLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    showToast("success", "Tautan laporan publik berhasil disalin!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const laporanDaftar = [
    {
      id: "saldo_siswa",
      nama: "Laporan Saldo Simpanan Member",
      deskripsi: `Daftar lengkap saldo ${stats.jumlahSiswa} member aktif grup`,
      icon: Users,
    },
    {
      id: "setoran",
      nama: "Laporan Setoran Masuk Periode",
      deskripsi: `Rincian seluruh setoran terverifikasi (${periodeFrom} s/d ${periodeTo})`,
      icon: CheckCircle,
    },
    {
      id: "pengeluaran",
      nama: "Laporan Pengeluaran Kas Periode",
      deskripsi: `Rincian alokasi dan pos pengeluaran (${periodeFrom} s/d ${periodeTo})`,
      icon: Receipt,
    },
    {
      id: "rekonsiliasi",
      nama: "Laporan Rekonsiliasi Kas Bank",
      deskripsi: "Riwayat pencocokan saldo rekening bank vs saldo sistem",
      icon: BarChart2,
    },
    {
      id: "audit",
      nama: "Laporan Audit Trail Lengkap",
      deskripsi: "Semua aktivitas dan mutasi verifikasi/pengeluaran sistem",
      icon: FileText,
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white ${
            toast.type === "success" ? "bg-[#0F766E]" : "bg-[#DC2626]"
          }`}
        >
          {toast.type === "success" ? <CheckCircle size={18} /> : <FileText size={18} />}
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#E2E8F0] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
              <Building2 size={12} /> {activeGroup?.group_name || "Grup Tabungan"}
            </span>
            <span className="text-xs text-slate-400">Pusat Laporan &amp; Ekspor</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0F172A]">Laporan Keuangan &amp; Ekspor</h1>
          <p className="text-xs text-slate-400">
            Unduh laporan keuangan format CSV dan atur transparansi publik untuk anggota grup
          </p>
        </div>

        <button
          onClick={loadFinancialStats}
          title="Refresh"
          className="self-end sm:self-center p-2.5 border border-[#E2E8F0] rounded-xl text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Saldo Kas Grup</p>
          <p className="text-xl font-black text-[#0F766E] font-mono">
            Rp{stats.totalKasSistem.toLocaleString("id-ID")}
          </p>
          <p className="text-[10.5px] text-slate-400">{stats.jumlahSiswa} member terdaftar</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Penerimaan Periode</p>
          <p className="text-xl font-black text-[#2563EB] font-mono">
            Rp{stats.totalSetoranPeriode.toLocaleString("id-ID")}
          </p>
          <p className="text-[10.5px] text-blue-600">Setoran terverifikasi</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Pengeluaran Periode</p>
          <p className="text-xl font-black text-[#DC2626] font-mono">
            Rp{stats.totalPengeluaranPeriode.toLocaleString("id-ID")}
          </p>
          <p className="text-[10.5px] text-red-600">Biaya kas diposting</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Surplus / Defisit</p>
          <p
            className={`text-xl font-black font-mono ${
              stats.totalSetoranPeriode - stats.totalPengeluaranPeriode >= 0
                ? "text-teal-700"
                : "text-red-600"
            }`}
          >
            Rp{(stats.totalSetoranPeriode - stats.totalPengeluaranPeriode).toLocaleString("id-ID")}
          </p>
          <p className="text-[10.5px] text-slate-400">Selama filter periode</p>
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A]">
          <BarChart2 size={16} className="text-teal-600" />
          <span>Rentang Periode Laporan:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Dari:</span>
            <input
              type="date"
              value={periodeFrom}
              onChange={(e) => setPeriodeFrom(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Sampai:</span>
            <input
              type="date"
              value={periodeTo}
              onChange={(e) => setPeriodeTo(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Export List Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <div className="p-5 border-b border-[#E2E8F0]">
          <h2 className="text-sm font-bold text-[#0F172A]">Daftar File Laporan Siap Unduh (CSV)</h2>
          <p className="text-xs text-slate-400">
            Dapat langsung dibuka di Microsoft Excel, Google Sheets, atau software akuntansi
          </p>
        </div>

        <div className="divide-y divide-[#F1F5F9]">
          {laporanDaftar.map((lap) => {
            const Icon = lap.icon;
            const isDownloadingThis = downloading === lap.id;
            return (
              <div
                key={lap.id}
                className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#0F172A] truncate">{lap.nama}</p>
                    <p className="text-[11px] text-slate-400 truncate">{lap.deskripsi}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    CSV
                  </span>
                  <button
                    onClick={() => handleExportReport(lap.id)}
                    disabled={isDownloadingThis}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    <Download size={13} />
                    <span>{isDownloadingThis ? "Mengunduh..." : "Unduh CSV"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Public Report Settings Card */}
      <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-50 text-teal-700 rounded-2xl flex items-center justify-center font-bold">
            <Globe size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#0F172A]">Halaman Laporan Publik Read-Only</h3>
            <p className="text-xs text-slate-400">
              Izinkan wali murid melihat ringkasan kas kelas secara transparan tanpa perlu login
            </p>
          </div>
        </div>

        <form onSubmit={handleSavePublicSettings} className="space-y-4 pt-2">
          <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <input
              type="checkbox"
              id="publicReportToggle"
              checked={isPublicEnabled}
              onChange={(e) => setIsPublicEnabled(e.target.checked)}
              className="w-4 h-4 accent-teal-600 rounded cursor-pointer"
            />
            <label htmlFor="publicReportToggle" className="text-xs font-bold text-[#0F172A] cursor-pointer">
              Aktifkan Halaman Laporan Publik untuk Grup Ini
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kustomisasi Slug URL Publik (Opsional)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono bg-slate-100 px-3 py-2.5 rounded-xl border border-slate-200">
                /r/
              </span>
              <input
                type="text"
                placeholder="mit-raudlatul-4b"
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-[#E2E8F0] rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="submit"
                disabled={isSavingSlug}
                className="px-5 py-2.5 bg-[#0F766E] hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-teal-900/10"
              >
                {isSavingSlug ? "Menyimpan..." : "Simpan Pengaturan"}
              </button>
            </div>
          </div>

          {isPublicEnabled && (
            <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <p className="font-bold text-teal-900">Tautan Laporan Publik Aktif:</p>
                <p className="font-mono text-teal-700 text-[11px] break-all">{publicUrl}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyPublicLink}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white border border-teal-300 text-teal-800 rounded-xl text-xs font-bold hover:bg-teal-100 transition-colors cursor-pointer"
                >
                  {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedLink ? "Tersalin!" : "Salin Link"}</span>
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
