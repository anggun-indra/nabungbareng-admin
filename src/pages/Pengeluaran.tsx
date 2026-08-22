import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Receipt,
  Users,
  Eye,
  Lock,
  Plus,
  RefreshCw,
  Calendar,
  Building2,
  Trash2,
  FileImage,
  UploadCloud,
  RotateCcw,
  Search,
  Filter,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const STEPS = [
  { label: "Detail", icon: Receipt },
  { label: "Peserta", icon: Users },
  { label: "Preview Alokasi", icon: Eye },
  { label: "Konfirmasi", icon: Lock },
  { label: "Selesai", icon: CheckCircle },
];

const KATEGORI = ["Perlengkapan", "Sosial", "Kegiatan", "Administrasi", "Konsumsi", "Lainnya"];

interface StudentParticipant {
  id: string; // group_member_id
  student_name: string;
  display_name: string;
  balance_idr: number;
}

interface ExpenseItem {
  id: string;
  group_id: string;
  amount_idr: number;
  expense_date: string;
  category: string;
  description: string;
  receipt_path: string | null;
  status: "posted" | "voided";
  void_reason: string | null;
  created_at: string;
  allocations_count?: number;
}

export default function Pengeluaran() {
  const { activeGroup } = useAuth();
  const [activeTab, setActiveTab] = useState<"riwayat" | "baru">("riwayat");
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Riwayat Table Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("semua");
  const [filterStatus, setFilterStatus] = useState<"semua" | "posted" | "voided">("semua");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form Wizard States
  const [step, setStep] = useState(0);
  const [deskripsi, setDeskripsi] = useState("");
  const [kategori, setKategori] = useState("Perlengkapan");
  const [totalStr, setTotalStr] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const [allStudents, setAllStudents] = useState<StudentParticipant[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  const [previewAllocations, setPreviewAllocations] = useState<any[]>([]);
  const [isCashSufficient, setIsCashSufficient] = useState(true);
  const [hasInsufficientMember, setHasInsufficientMember] = useState(false);

  const [konfirmasiText, setKonfirmasiText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postedResult, setPostedResult] = useState<any | null>(null);

  // Void Dialog
  const [voidTargetExpense, setVoidTargetExpense] = useState<ExpenseItem | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadExpensesAndStudents = async () => {
    if (!activeGroup?.group_id) return;
    setLoading(true);

    try {
      // 1. Fetch expenses
      const { data: expData, error: expErr } = await supabase
        .from("expenses")
        .select(`
          id,
          group_id,
          amount_idr,
          expense_date,
          category,
          description,
          receipt_path,
          status,
          void_reason,
          created_at,
          expense_allocations (
            id
          )
        `)
        .eq("group_id", activeGroup.group_id)
        .order("expense_date", { ascending: false });

      if (expErr) throw expErr;

      if (expData) {
        const formatted: ExpenseItem[] = expData.map((e: any) => ({
          id: e.id,
          group_id: e.group_id,
          amount_idr: Number(e.amount_idr),
          expense_date: e.expense_date,
          category: e.category,
          description: e.description,
          receipt_path: e.receipt_path,
          status: e.status,
          void_reason: e.void_reason,
          created_at: e.created_at,
          allocations_count: e.expense_allocations?.length || 0,
        }));
        setExpenses(formatted);
      }

      // 2. Fetch all active student members
      const { data: stdData, error: stdErr } = await supabase
        .from("group_members")
        .select(`
          id,
          student_name,
          display_name,
          member_balances (
            balance_idr
          )
        `)
        .eq("group_id", activeGroup.group_id)
        .eq("role", "member")
        .eq("active", true)
        .order("student_name", { ascending: true });

      if (stdErr) throw stdErr;

      if (stdData) {
        const stdList: StudentParticipant[] = stdData.map((s: any) => {
          const mb = s.member_balances;
          const bal = Array.isArray(mb) ? (mb[0]?.balance_idr ?? 0) : (mb?.balance_idr ?? 0);
          return {
            id: s.id,
            student_name: s.student_name || s.display_name || "Siswa",
            display_name: s.display_name || "Wali",
            balance_idr: Number(bal),
          };
        });
        setAllStudents(stdList);
        setSelectedStudentIds(new Set(stdList.map((s) => s.id)));
      }
    } catch (err: any) {
      console.error("Error loading expenses data:", err);
      showToast("error", err.message || "Gagal memuat data pengeluaran.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpensesAndStudents();
  }, [activeGroup?.group_id]);

  const totalNum = parseInt(totalStr.replace(/\D/g, "")) || 0;

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFetchPreview = async () => {
    if (!activeGroup?.group_id) return;
    const memberIds = Array.from(selectedStudentIds);
    if (memberIds.length === 0) {
      showToast("error", "Pilih minimal 1 siswa peserta.");
      return;
    }

    try {
      const { data, error } = await supabase.rpc("preview_expense", {
        p_group_id: activeGroup.group_id,
        p_amount_idr: totalNum,
        p_member_ids: memberIds,
      });

      if (error) throw error;

      if (data) {
        setPreviewAllocations(data.allocations || []);
        setIsCashSufficient(data.is_cash_sufficient);
        setHasInsufficientMember(data.has_insufficient_member_balance);
      }
      setStep(2);
    } catch (err: any) {
      showToast("error", err.message || "Gagal membuat preview alokasi.");
    }
  };

  const validateStep0 = () => {
    const e: Record<string, string> = {};
    if (!deskripsi.trim()) e.deskripsi = "Deskripsi keperluan wajib diisi.";
    if (!totalNum || totalNum <= 0) e.total = "Nominal harus lebih besar dari Rp0.";
    if (!tanggal) e.tanggal = "Tanggal wajib diisi.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = async () => {
    if (step === 0) {
      if (!validateStep0()) return;
      setStep(1);
    } else if (step === 1) {
      if (selectedStudentIds.size === 0) {
        showToast("error", "Pilih minimal 1 peserta.");
        return;
      }
      await handleFetchPreview();
    } else if (step === 2) {
      setStep(3);
    }
  };

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, 0));
    setErrors({});
  };

  const handlePostingExpense = async () => {
    if (konfirmasiText !== "POSTING" || !activeGroup?.group_id) return;
    setIsSubmitting(true);

    try {
      let receiptStoragePath: string | null = null;

      // 1. Upload receipt if file attached
      if (receiptFile) {
        const fileExt = receiptFile.name.split(".").pop() || "jpg";
        const randomName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const path = `groups/${activeGroup.group_id}/${randomName}`;

        const { error: upErr } = await supabase.storage
          .from("expense-receipts")
          .upload(path, receiptFile);

        if (!upErr) {
          receiptStoragePath = path;
        }
      }

      // 2. Call RPC post_expense
      const idempotencyKey = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2);

      const { data, error } = await supabase.rpc("post_expense", {
        p_group_id: activeGroup.group_id,
        p_category: kategori,
        p_description: deskripsi.trim(),
        p_amount_idr: totalNum,
        p_expense_date: tanggal,
        p_member_ids: Array.from(selectedStudentIds),
        p_receipt_path: receiptStoragePath,
        p_idempotency_key: idempotencyKey,
      });

      if (error) throw error;

      setPostedResult(data);
      setStep(4);
      showToast("success", "Pengeluaran kas berhasil diposting dan dialokasikan!");
      loadExpensesAndStudents();
    } catch (err: any) {
      showToast("error", err.message || "Gagal mem-posting pengeluaran.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoidExpense = async () => {
    if (!voidTargetExpense || !voidReason.trim() || !activeGroup?.group_id) return;
    setIsSubmitting(true);

    try {
      const idempotencyKey = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2);

      const { error } = await supabase.rpc("void_expense", {
        p_group_id: activeGroup.group_id,
        p_expense_id: voidTargetExpense.id,
        p_reason: voidReason.trim(),
        p_idempotency_key: idempotencyKey,
      });

      if (error) throw error;

      showToast("success", "Pengeluaran berhasil dibatalkan dan saldo siswa telah dikembalikan!");
      setVoidTargetExpense(null);
      setVoidReason("");
      loadExpensesAndStudents();
    } catch (err: any) {
      showToast("error", err.message || "Gagal membatalkan pengeluaran.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(0);
    setDeskripsi("");
    setKategori("Perlengkapan");
    setTotalStr("");
    setTanggal(new Date().toISOString().split("T")[0]);
    setReceiptFile(null);
    setSelectedStudentIds(new Set(allStudents.map((s) => s.id)));
    setKonfirmasiText("");
    setErrors({});
    setPostedResult(null);
    setActiveTab("riwayat");
  };

  const totalPengeluaranBulanIni = expenses
    .filter((e) => e.status === "posted" && e.expense_date.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((acc, curr) => acc + curr.amount_idr, 0);

  const filteredExpenses = expenses.filter((e) => {
    const matchSearch =
      e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.void_reason && e.void_reason.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchCategory = filterCategory === "semua" || e.category.toLowerCase() === filterCategory.toLowerCase();
    const matchStatus = filterStatus === "semua" || e.status === filterStatus;
    return matchSearch && matchCategory && matchStatus;
  });

  const totalPages = Math.ceil(filteredExpenses.length / pageSize) || 1;
  const paginatedExpenses = filteredExpenses.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterCategory, filterStatus, pageSize]);

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
            <span className="flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
              <Receipt size={12} /> {activeGroup?.group_name || "Grup Tabungan"}
            </span>
            <span className="text-xs text-slate-400">Pengeluaran &amp; Alokasi Kas</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0F172A]">Manajemen Pengeluaran Kas</h1>
          <p className="text-xs text-slate-400">
            Total Pengeluaran Bulan Ini: Rp{totalPengeluaranBulanIni.toLocaleString("id-ID")}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab("riwayat")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
              activeTab === "riwayat"
                ? "bg-white text-[#0F172A] shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Riwayat Pengeluaran ({expenses.length})
          </button>
          <button
            onClick={() => {
              resetForm();
              setActiveTab("baru");
            }}
            className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
              activeTab === "baru"
                ? "bg-[#0F172A] text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Plus size={14} /> Catat Pengeluaran Baru
          </button>
        </div>
      </div>

      {activeTab === "riwayat" ? (
        /* TAB 1: RIWAYAT PENGELUARAN */
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A]">Daftar Pengeluaran Kas Terposting</h2>
              <p className="text-xs text-slate-400">
                Semua pengeluaran yang telah dibagikan dan memotong saldo kas &amp; tabungan siswa
              </p>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative w-full sm:w-52">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari pengeluaran..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                />
              </div>

              {/* Category Filter */}
              <div className="relative">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="semua">Semua Kategori</option>
                  {KATEGORI.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: "semua", label: "Semua" },
                  { id: "posted", label: "Terposting" },
                  { id: "voided", label: "Batal" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterStatus(tab.id as any)}
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

              <button
                onClick={loadExpensesAndStudents}
                title="Refresh"
                className="p-2 border border-[#E2E8F0] text-slate-400 hover:text-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-slate-400 text-xs uppercase font-bold tracking-wider">
                  <th className="px-6 py-4">Keperluan &amp; Kategori</th>
                  <th className="px-6 py-4">Tanggal Pengeluaran</th>
                  <th className="px-6 py-4 text-right">Total Nominal</th>
                  <th className="px-6 py-4 text-center">Peserta</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-slate-400">
                      <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Memuat pengeluaran...
                    </td>
                  </tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-slate-400">
                      <Receipt size={36} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-bold text-slate-600">Tidak ada pengeluaran yang cocok</p>
                      <p className="text-xs text-slate-400">Coba sesuaikan pencarian atau filter kategori</p>
                    </td>
                  </tr>
                ) : (
                  paginatedExpenses.map((e) => {
                    const count = (e.expense_allocations && e.expense_allocations.length) || e.allocations_count || 0;
                    return (
                      <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-[#0F172A]">{e.description}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                              {e.category}
                            </span>
                            {e.void_reason && (
                              <span className="text-red-500 text-[11px] italic">
                                Alasan batal: {e.void_reason}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600">
                          {new Date(e.expense_date).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-black text-red-600">
                          -Rp{e.amount_idr.toLocaleString("id-ID")}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                            {count} siswa
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              e.status === "voided"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-teal-50 text-teal-700 border border-teal-200"
                            }`}
                          >
                            {e.status === "voided" ? "Dibatalkan" : "Terposting"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {e.receipt_path && (
                              <button
                                onClick={async () => {
                                  const { data } = await supabase.storage
                                    .from("expense-receipts")
                                    .createSignedUrl(e.receipt_path!, 3600);
                                  if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                                }}
                                className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                                title="Lihat Nota Fisik"
                              >
                                <FileImage size={16} />
                              </button>
                            )}
                            {e.status !== "voided" && (
                              <button
                                onClick={() => {
                                  setVoidTargetExpense(e);
                                  setVoidReason("");
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Batalkan Pengeluaran"
                              >
                                <RotateCcw size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          {filteredExpenses.length > 0 && (
            <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>Tampilkan</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-1 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>per halaman · Menampilkan {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredExpenses.length)} dari {filteredExpenses.length} pengeluaran</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 border border-[#E2E8F0] rounded-lg font-bold bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  Sebelumnya
                </button>
                <span className="px-3 py-1.5 font-bold text-slate-700">
                  Halaman {page} dari {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 border border-[#E2E8F0] rounded-lg font-bold bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* TAB 2: WIZARD 5-STEP CATAT PENGELUARAN */
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          {/* Steps Progress Bar */}
          <div className="p-4 sm:p-6 border-b border-[#E2E8F0] bg-slate-50/50">
            <div className="flex items-center justify-between">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const isDone = step > i;
                const isActive = step === i;
                return (
                  <div key={i} className="flex items-center flex-1 last:flex-initial">
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                      <div
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all ${
                          isDone
                            ? "bg-[#0F766E] text-white"
                            : isActive
                            ? "bg-[#0F172A] text-white shadow-md shadow-slate-900/20"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {isDone ? <CheckCircle size={16} /> : <Icon size={16} />}
                      </div>
                      <span
                        className={`text-[10.5px] font-bold hidden sm:block ${
                          isActive ? "text-[#0F172A]" : isDone ? "text-[#0F766E]" : "text-slate-400"
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 mb-0 sm:mb-4 rounded-full transition-all ${
                          isDone ? "bg-[#0F766E]" : "bg-slate-200"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {/* Mobile Step Label */}
            <div className="sm:hidden text-center text-xs font-bold text-[#0F172A] mt-2.5">
              Langkah {step + 1} dari {STEPS.length}: {STEPS[step].label}
            </div>
          </div>

          {/* Step 0: Detail */}
          {step === 0 && (
            <div className="p-4 sm:p-6 space-y-4">
              <h2 className="text-sm font-bold text-[#0F172A]">Langkah 1: Rincian Pengeluaran</h2>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi / Keperluan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Beli Krayon &amp; Buku Gambar Ujian Praktek"
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    errors.deskripsi ? "border-red-300 bg-red-50" : "border-[#E2E8F0]"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value)}
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    {KATEGORI.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Pengeluaran <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Total Nominal Pengeluaran (Rp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="0"
                  value={totalStr}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    setTotalStr(raw ? Number(raw).toLocaleString("id-ID") : "");
                  }}
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    errors.total ? "border-red-300 bg-red-50" : "border-[#E2E8F0]"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Foto Nota / Bukti Pembelian (Opsional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Step 1: Peserta */}
          {step === 1 && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#0F172A]">Langkah 2: Pilih Siswa Peserta</h2>
                  <p className="text-xs text-slate-400">
                    Pengeluaran sebesar Rp{totalNum.toLocaleString("id-ID")} akan dibagi rata ke siswa terpilih
                  </p>
                </div>
                <div className="flex gap-2 text-xs">
                  <button
                    onClick={() => setSelectedStudentIds(new Set(allStudents.map((s) => s.id)))}
                    className="font-bold text-teal-700 hover:underline cursor-pointer"
                  >
                    Pilih Semua ({allStudents.length})
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    onClick={() => setSelectedStudentIds(new Set())}
                    className="text-slate-400 hover:underline cursor-pointer"
                  >
                    Hapus Pilihan
                  </button>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
                {allStudents.map((std) => {
                  const isChecked = selectedStudentIds.has(std.id);
                  return (
                    <label
                      key={std.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                        isChecked
                          ? "bg-teal-50/70 border-teal-200"
                          : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleStudent(std.id)}
                          className="w-4 h-4 accent-teal-600 rounded"
                        />
                        <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-xs">
                          {std.student_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#0F172A]">{std.student_name}</p>
                          <p className="text-[10px] text-slate-400">Wali: {std.display_name}</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-700">
                        Saldo: Rp{std.balance_idr.toLocaleString("id-ID")}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Preview Alokasi */}
          {step === 2 && (
            <div className="p-6 space-y-4">
              <h2 className="text-sm font-bold text-[#0F172A]">Langkah 3: Simulasi Pembagian Rata</h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Total Biaya</p>
                  <p className="text-sm font-black font-mono text-[#0F172A]">
                    Rp{totalNum.toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Peserta</p>
                  <p className="text-sm font-black font-mono text-[#0F172A]">
                    {selectedStudentIds.size} Siswa
                  </p>
                </div>
                <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 text-center col-span-2 sm:col-span-2">
                  <p className="text-[10px] text-teal-600 font-bold uppercase">Potongan per Siswa</p>
                  <p className="text-base font-black font-mono text-[#0F766E]">
                    Rp{Math.floor(totalNum / (selectedStudentIds.size || 1)).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              {!isCashSufficient && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
                  <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">
                    Kas kelompok tidak mencukupi untuk membiayai total pengeluaran ini.
                  </p>
                </div>
              )}

              {hasInsufficientMember && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                  <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Ada beberapa siswa yang memiliki saldo tabungan lebih kecil dari potongan ini.
                  </p>
                </div>
              )}

              <div className="max-h-60 overflow-y-auto space-y-1.5 divide-y divide-slate-100">
                {previewAllocations.map((alloc: any, idx: number) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-xl ${
                      alloc.is_sufficient ? "bg-slate-50" : "bg-red-50 border border-red-200"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-[#0F172A]">{alloc.student_name}</p>
                      <p className="text-[10px] text-slate-400">
                        Saldo Awal: Rp{Number(alloc.current_balance_idr).toLocaleString("id-ID")} &rarr; Sisa: Rp{Number(alloc.balance_after_idr).toLocaleString("id-ID")}
                      </p>
                    </div>
                    <span className="text-xs font-black font-mono text-red-600">
                      -Rp{Number(alloc.allocated_amount_idr).toLocaleString("id-ID")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Konfirmasi */}
          {step === 3 && (
            <div className="p-6 space-y-4">
              <h2 className="text-sm font-bold text-[#0F172A]">Langkah 4: Konfirmasi Posting</h2>

              <div className="p-5 bg-slate-900 text-white rounded-3xl space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Keperluan:</span>
                  <span className="font-bold">{deskripsi}</span>
                </div>
                <div className="flex justify-between text-xs border-t border-slate-800 pt-2">
                  <span className="text-slate-400">Kategori:</span>
                  <span className="font-bold">{kategori}</span>
                </div>
                <div className="flex justify-between text-xs border-t border-slate-800 pt-2">
                  <span className="text-slate-400">Total Nominal:</span>
                  <span className="font-black text-teal-400 font-mono text-sm">
                    Rp{totalNum.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between text-xs border-t border-slate-800 pt-2">
                  <span className="text-slate-400">Peserta:</span>
                  <span className="font-bold">{selectedStudentIds.size} Siswa</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ketik <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[#0F172A]">POSTING</span> untuk memproses:
                </label>
                <input
                  type="text"
                  placeholder="POSTING"
                  value={konfirmasiText}
                  onChange={(e) => setKonfirmasiText(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          )}

          {/* Step 4: Selesai */}
          {step === 4 && (
            <div className="p-10 text-center space-y-4">
              <div className="w-16 h-16 bg-teal-50 text-teal-700 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={36} />
              </div>
              <h2 className="text-lg font-black text-[#0F172A]">Pengeluaran Kas Berhasil Diposting!</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Biaya <strong className="text-slate-800">{deskripsi}</strong> sebesar{" "}
                <strong className="text-teal-700 font-mono">Rp{totalNum.toLocaleString("id-ID")}</strong> telah dipotong dari saldo {selectedStudentIds.size} siswa secara rata.
              </p>

              <div className="pt-4 flex justify-center gap-3">
                <button
                  onClick={resetForm}
                  className="px-6 py-2.5 bg-[#0F172A] text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Kembali ke Riwayat Pengeluaran
                </button>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          {step < 4 && (
            <div className="p-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-between">
              <button
                onClick={prevStep}
                disabled={step === 0}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ArrowLeft size={14} /> Kembali
              </button>

              {step < 3 ? (
                <button
                  onClick={nextStep}
                  className="flex items-center gap-1.5 px-5 py-2 bg-[#0F172A] text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Lanjut <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  onClick={handlePostingExpense}
                  disabled={isSubmitting || konfirmasiText !== "POSTING"}
                  className="flex items-center gap-2 px-6 py-2 bg-[#0F766E] hover:bg-teal-600 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-teal-900/20"
                >
                  {isSubmitting ? "Memposting..." : "Posting Sekarang"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal: Void Expense */}
      {voidTargetExpense && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 text-red-700 rounded-2xl flex items-center justify-center font-bold">
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#0F172A]">Batalkan Pengeluaran Kas</h3>
                <p className="text-xs text-slate-400">
                  Saldo yang telah dipotong akan dikembalikan ke masing-masing siswa
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <p className="text-slate-500">
                <strong>Deskripsi:</strong> {voidTargetExpense.description}
              </p>
              <p className="text-slate-500">
                <strong>Nominal Dikembalikan:</strong> Rp{voidTargetExpense.amount_idr.toLocaleString("id-ID")}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alasan Pembatalan <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="Contoh: Salah input nominal / kegiatan dibatalkan"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setVoidTargetExpense(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting || !voidReason.trim()}
                onClick={handleVoidExpense}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-red-900/20"
              >
                {isSubmitting ? "Membatalkan..." : "Batalkan Pengeluaran"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
