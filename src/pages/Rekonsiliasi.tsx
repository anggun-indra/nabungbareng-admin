import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  AlertTriangle,
  Scale,
  RefreshCw,
  Calendar,
  Building2,
  FileCheck,
  Clock,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

interface ReconciliationRecord {
  id: string;
  group_id: string;
  statement_date: string;
  bank_balance_idr: number;
  app_balance_idr: number;
  difference_idr: number;
  note: string | null;
  created_by: string;
  created_at: string;
}

export default function Rekonsiliasi() {
  const { activeGroup } = useAuth();

  const [ledgerBalance, setLedgerBalance] = useState<number>(0);
  const [history, setHistory] = useState<ReconciliationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"semua" | "cocok" | "selisih">("semua");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);

  // Form State
  const [inputRekening, setInputRekening] = useState("");
  const [statementDate, setStatementDate] = useState(new Date().toISOString().split("T")[0]);
  const [catatan, setCatatan] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadReconciliationData = async () => {
    if (!activeGroup?.group_id) return;
    setLoading(true);

    try {
      // 1. Fetch system cash balance
      const { data: cashData } = await supabase
        .from("group_cash_balances")
        .select("balance_idr")
        .eq("group_id", activeGroup.group_id)
        .maybeSingle();

      setLedgerBalance(Number(cashData?.balance_idr || 0));

      // 2. Fetch history
      const { data: historyData, error: histErr } = await supabase
        .from("reconciliations")
        .select("*")
        .eq("group_id", activeGroup.group_id)
        .order("statement_date", { ascending: false });

      if (histErr) throw histErr;

      if (historyData) {
        const formatted: ReconciliationRecord[] = historyData.map((h: any) => ({
          id: h.id,
          group_id: h.group_id,
          statement_date: h.statement_date,
          bank_balance_idr: Number(h.bank_balance_idr),
          app_balance_idr: Number(h.app_balance_idr),
          difference_idr: Number(h.difference_idr),
          note: h.note,
          created_by: h.created_by,
          created_at: h.created_at,
        }));
        setHistory(formatted);
      }
    } catch (err: any) {
      console.error("Error loading reconciliation data:", err);
      showToast("error", err.message || "Gagal memuat data rekonsiliasi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReconciliationData();
  }, [activeGroup?.group_id]);

  const rekeningNum = parseInt(inputRekening.replace(/\D/g, "")) || 0;
  const selisih = rekeningNum - ledgerBalance;

  const handleSaveReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup?.group_id || !statementDate || !rekeningNum) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("record_reconciliation", {
        p_group_id: activeGroup.group_id,
        p_statement_date: statementDate,
        p_bank_balance_idr: rekeningNum,
        p_note: catatan.trim() || null,
      });

      if (error) throw error;

      showToast("success", "Rekonsiliasi kas bank berhasil dicatat dan diaudit!");
      setInputRekening("");
      setCatatan("");
      loadReconciliationData();
    } catch (err: any) {
      showToast("error", err.message || "Gagal mencatat rekonsiliasi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white ${
            toast.type === "success" ? "bg-[#0F766E]" : "bg-[#DC2626]"
          }`}
        >
          {toast.type === "success" ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#E2E8F0] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
              <Scale size={12} /> {activeGroup?.group_name || "Grup Tabungan"}
            </span>
            <span className="text-xs text-slate-400">Audit &amp; Rekonsiliasi Bank</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0F172A]">Rekonsiliasi Kas Bank</h1>
          <p className="text-xs text-slate-400">
            Cocokkan saldo rekening koran nyata dengan saldo kas yang tercatat pada sistem
          </p>
        </div>

        <button
          onClick={loadReconciliationData}
          title="Refresh Data"
          className="self-end sm:self-center p-2.5 border border-[#E2E8F0] rounded-xl text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Left Column: Form Rekonsiliasi Baru */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E2E8F0] p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5">
          <h2 className="text-sm font-bold text-[#0F172A]">Catat Rekonsiliasi Baru</h2>

          {/* Current System Ledger Box */}
          <div className="p-5 bg-slate-900 text-white rounded-2xl space-y-1 shadow-inner">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Saldo Kas Sistem (Ledger Otomatis)
            </p>
            <p className="text-2xl font-black font-mono text-teal-400">
              Rp{ledgerBalance.toLocaleString("id-ID")}
            </p>
            <p className="text-[11px] text-slate-400">
              Dihitung dari total seluruh setoran terverifikasi dikurangi pengeluaran kas yang diposting.
            </p>
          </div>

          <form onSubmit={handleSaveReconciliation} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tanggal Posisi Rekening Koran <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={statementDate}
                onChange={(e) => setStatementDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Saldo Nyata Rekening Bank (Rp) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="0"
                value={inputRekening}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setInputRekening(raw ? Number(raw).toLocaleString("id-ID") : "");
                }}
                className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Live Difference Calculation Box */}
            {inputRekening && (
              <div
                className={`p-4 rounded-2xl border text-xs space-y-2 ${
                  selisih === 0
                    ? "bg-teal-50 border-teal-200 text-teal-800"
                    : "bg-amber-50 border-amber-200 text-amber-800"
                }`}
              >
                <div className="flex justify-between">
                  <span>Saldo Bank:</span>
                  <span className="font-bold font-mono">Rp{rekeningNum.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Saldo Sistem:</span>
                  <span className="font-bold font-mono">Rp{ledgerBalance.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between border-t border-slate-300/40 pt-2 font-bold">
                  <span>Selisih:</span>
                  <span className="font-mono text-sm">
                    {selisih === 0 ? "Rp0 (Cocok 100%)" : `${selisih > 0 ? "+" : ""}Rp${selisih.toLocaleString("id-ID")}`}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan / Keterangan (Opsional)
              </label>
              <textarea
                rows={2}
                placeholder="Contoh: Rekening BCA Cabang Utama, bunga tabungan belum dicatat"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="w-full p-3 border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !rekeningNum}
              className="w-full py-3 bg-[#0F766E] hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-teal-900/20"
            >
              {isSubmitting ? "Menyimpan Rekonsiliasi..." : "Simpan & Rekam Audit Rekonsiliasi"}
            </button>
          </form>
        </div>

        {/* Right Column: Riwayat Rekonsiliasi */}
        <div className="bg-white rounded-3xl border border-[#E2E8F0] overflow-hidden shadow-sm flex flex-col">
          <div className="p-5 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A]">Riwayat Rekonsiliasi Kas</h2>
              <p className="text-xs text-slate-400">Daftar rekonsiliasi yang tersimpan di sistem audit</p>
            </div>

            {/* Status filter pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {[
                { id: "semua", label: "Semua" },
                { id: "cocok", label: "Cocok" },
                { id: "selisih", label: "Selisih" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setFilterStatus(tab.id as any);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterStatus === tab.id
                      ? "bg-white text-[#0F172A] shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#F1F5F9] max-h-[480px]">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (() => {
              const filteredHistory = history.filter((r) => {
                if (filterStatus === "cocok") return r.difference_idr === 0;
                if (filterStatus === "selisih") return r.difference_idr !== 0;
                return true;
              });

              if (filteredHistory.length === 0) {
                return (
                  <div className="p-12 text-center text-slate-400 text-xs">
                    <FileCheck size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">Tidak ada riwayat rekonsiliasi</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {history.length === 0
                        ? "Isi formulir di sebelah kiri untuk mencatat rekonsiliasi pertama."
                        : "Tidak ada catatan dengan status filter ini."}
                    </p>
                  </div>
                );
              }

              const paginatedHistory = filteredHistory.slice((page - 1) * pageSize, page * pageSize);

              return paginatedHistory.map((rec) => (
                <div key={rec.id} className="p-4 space-y-2 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                      <Calendar size={13} className="text-slate-400" />
                      {new Date(rec.statement_date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        rec.difference_idr === 0
                          ? "bg-teal-50 text-teal-700 border border-teal-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {rec.difference_idr === 0 ? "Cocok" : `Selisih Rp${Math.abs(rec.difference_idr).toLocaleString("id-ID")}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <p className="text-[10px] text-slate-400 font-sans">Bank Nyata</p>
                      <p className="font-bold text-slate-800">
                        Rp{rec.bank_balance_idr.toLocaleString("id-ID")}
                      </p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <p className="text-[10px] text-slate-400 font-sans">Sistem</p>
                      <p className="font-bold text-slate-800">
                        Rp{rec.app_balance_idr.toLocaleString("id-ID")}
                      </p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <p className="text-[10px] text-slate-400 font-sans">Selisih</p>
                      <p
                        className={`font-bold ${
                          rec.difference_idr === 0 ? "text-teal-600" : "text-red-600"
                        }`}
                      >
                        Rp{rec.difference_idr.toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>

                  {rec.note && (
                    <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg">
                      Catatan: {rec.note}
                    </p>
                  )}
                </div>
              ));
            })()}
          </div>

          {/* Pagination Footer */}
          {(() => {
            const filteredHistory = history.filter((r) => {
              if (filterStatus === "cocok") return r.difference_idr === 0;
              if (filterStatus === "selisih") return r.difference_idr !== 0;
              return true;
            });
            const totalPages = Math.ceil(filteredHistory.length / pageSize) || 1;

            if (filteredHistory.length <= pageSize) return null;

            return (
              <div className="p-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between text-xs text-slate-500">
                <span>Hal {page} dari {totalPages} ({filteredHistory.length} total)</span>
                <div className="flex gap-1.5">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 bg-white border border-[#E2E8F0] rounded-lg font-bold disabled:opacity-40 cursor-pointer"
                  >
                    Prev
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 bg-white border border-[#E2E8F0] rounded-lg font-bold disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
