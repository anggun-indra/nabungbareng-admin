import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  ZoomIn,
  X,
  ChevronDown,
  FileImage,
  AlertTriangle,
  RefreshCw,
  Calendar,
  RotateCcw,
  Sparkles,
  Bot,
  Cpu,
  Check,
  Zap,
  Building2,
  Hash,
  Edit3,
  ShieldCheck,
  Info,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

type StatusFilter = "semua" | "submitted" | "verified" | "rejected" | "voided";

interface OCRData {
  amount_idr: number | null;
  transfer_date: string | null;
  sender_name: string | null;
  recipient_name: string | null;
  bank_name: string | null;
  reference_number: string | null;
  confidence_score: number;
  is_valid_receipt: boolean;
  notes: string | null;
}

interface SubmissionItem {
  id: string;
  group_id: string;
  group_member_id: string;
  amount_idr: number;
  transfer_date: string;
  period_label: string;
  period_allocations?: Array<{ period: string; amount_idr: number }> | null;
  storage_path: string | null;
  catatan: string | null;
  status: "submitted" | "verified" | "rejected" | "voided";
  verified_by: string | null;
  verified_at: string | null;
  void_reason: string | null;
  created_at: string;
  student_name: string;
  display_name: string;
  current_balance: number;
  signed_url?: string | null;
  bank_name?: string | null;
  reference_number?: string | null;
  ocr_model?: string | null;
  ocr_status?: string | null;
  ocr_data?: OCRData | null;
  ocr_error?: string | null;
}

const statusLabel: Record<string, string> = {
  submitted: "Menunggu",
  verified: "Terverifikasi",
  rejected: "Ditolak",
  voided: "Dibatalkan",
};

const statusClass: Record<string, string> = {
  submitted: "bg-amber-50 text-amber-700 border border-amber-200",
  verified: "bg-teal-50 text-teal-700 border border-teal-200",
  rejected: "bg-red-50 text-red-700 border border-red-200",
  voided: "bg-slate-100 text-slate-500 border border-slate-200",
};

export default function Verifikasi() {
  const { activeGroup } = useAuth();

  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [selected, setSelected] = useState<SubmissionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("semua");
  const [search, setSearch] = useState("");
  const [mobileTab, setMobileTab] = useState<"list" | "detail">("list");
  const [queueLimit, setQueueLimit] = useState(20);

  useEffect(() => {
    setQueueLimit(20);
  }, [search, filterStatus]);

  // AI Provider Switcher Mode: 'auto' (Gemini Default + Fallback) vs 'cosmoshub' (Force Cosmoshub AI)
  const [aiProviderMode, setAiProviderMode] = useState<"auto" | "cosmoshub">("auto");

  // Editable Form State for Verification
  const [verifiedAmount, setVerifiedAmount] = useState<number>(0);
  const [bankName, setBankName] = useState<string>("");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [transferDate, setTransferDate] = useState<string>("");
  const [isAmountAutoApplied, setIsAmountAutoApplied] = useState<boolean>(false);

  // Dialogs
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showTolakModal, setShowTolakModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTriggeringOCR, setIsTriggeringOCR] = useState(false);
  const [imgZoom, setImgZoom] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadSubmissions = async () => {
    if (!activeGroup?.group_id) return;
    setLoading(true);

    try {
      // Fetch submissions joined with group_members, member_balances, and payment_ocr_results
      const { data, error } = await supabase
        .from("payment_submissions")
        .select(`
          id,
          group_id,
          group_member_id,
          amount_idr,
          transfer_date,
          period_label,
          period_allocations,
          storage_path,
          catatan,
          status,
          verified_by,
          verified_at,
          void_reason,
          created_at,
          bank_name,
          reference_number,
          group_members (
            id,
            student_name,
            display_name,
            member_balances (
              balance_idr
            )
          ),
          payment_ocr_results (
            model,
            status,
            extracted_data,
            error_code
          )
        `)
        .eq("group_id", activeGroup.group_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        const list: SubmissionItem[] = await Promise.all(
          data.map(async (row: any) => {
            let signed_url: string | null = null;
            if (row.storage_path) {
              const { data: signed } = await supabase.storage
                .from("payment-proofs")
                .createSignedUrl(row.storage_path, 3600);
              signed_url = signed?.signedUrl || null;
            }

            const gm = row.group_members;
            const balance = gm?.member_balances?.[0]?.balance_idr ?? 0;
            const ocr = Array.isArray(row.payment_ocr_results)
              ? row.payment_ocr_results[0]
              : row.payment_ocr_results;

            return {
              id: row.id,
              group_id: row.group_id,
              group_member_id: row.group_member_id,
              amount_idr: Number(row.amount_idr),
              transfer_date: row.transfer_date,
              period_label: row.period_label,
              period_allocations: row.period_allocations || null,
              storage_path: row.storage_path,
              catatan: row.catatan,
              status: row.status,
              verified_by: row.verified_by,
              verified_at: row.verified_at,
              void_reason: row.void_reason,
              created_at: row.created_at,
              bank_name: row.bank_name || null,
              reference_number: row.reference_number || null,
              student_name: gm?.student_name || gm?.display_name || "Siswa",
              display_name: gm?.display_name || "Wali Murid",
              current_balance: Number(balance),
              signed_url,
              ocr_model: ocr?.model || null,
              ocr_status: ocr?.status || null,
              ocr_data: ocr?.extracted_data || null,
              ocr_error: ocr?.error_code || null,
            };
          })
        );

        setSubmissions(list);
        if (list.length > 0 && !selected) {
          const firstPending = list.find((s) => s.status === "submitted") || list[0];
          setSelected(firstPending);
        } else if (selected) {
          const updated = list.find((s) => s.id === selected.id);
          if (updated) setSelected(updated);
        }
      }
    } catch (err: any) {
      console.error("Error loading submissions:", err);
      showToast("error", err.message || "Gagal memuat antrean setoran.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [activeGroup?.group_id]);

  // Synchronize form fields when selected submission changes or OCR arrives
  useEffect(() => {
    if (selected) {
      const ocr = selected.ocr_data;
      const confidence = ocr?.confidence_score ?? 0;
      const isHighConfidence = confidence >= 0.9;

      // Auto-apply nominal if AI confidence is >= 90% and amount is valid
      if (isHighConfidence && ocr?.amount_idr && ocr.amount_idr > 0) {
        setVerifiedAmount(ocr.amount_idr);
        setIsAmountAutoApplied(true);
      } else {
        setVerifiedAmount(selected.amount_idr);
        setIsAmountAutoApplied(false);
      }

      // Auto-apply date: Prioritize OCR extracted date if confidence is high (>=90%), else submission date
      if (isHighConfidence && ocr?.transfer_date) {
        setTransferDate(ocr.transfer_date);
      } else {
        setTransferDate(selected.transfer_date || ocr?.transfer_date || new Date().toISOString().split("T")[0]);
      }

      setBankName(selected.bank_name || ocr?.bank_name || "");
      setReferenceNumber(selected.reference_number || ocr?.reference_number || "");
    }
  }, [
    selected?.id,
    selected?.ocr_data?.confidence_score,
    selected?.ocr_data?.amount_idr,
    selected?.ocr_data?.transfer_date,
    selected?.ocr_data?.bank_name,
    selected?.ocr_data?.reference_number,
  ]);

  const ocrData = selected?.ocr_data;
  const isOCRCompleted = selected?.ocr_status === "completed" || selected?.ocr_status === "fallback_completed";
  const isOCRFallback = selected?.ocr_status === "fallback_completed" || selected?.ocr_model?.startsWith("fallback");
  const confidenceScore = ocrData?.confidence_score ?? 0;
  const confidencePercent = Math.round(confidenceScore * 100);
  const isLowAiConfidence = !isOCRCompleted || confidencePercent < 90;

  // Check Amount Difference (Submission amount vs AI extracted amount)
  const rawSubmissionAmount = selected?.amount_idr ?? 0;
  const aiExtractedAmount = ocrData?.amount_idr ?? null;
  const isAmountDifferentFromSubmission =
    isOCRCompleted &&
    aiExtractedAmount !== null &&
    aiExtractedAmount > 0 &&
    aiExtractedAmount !== rawSubmissionAmount;

  // Date Difference Calculation Helper
  const computeDateDiff = (dateStr: string) => {
    if (!dateStr) return { type: "normal" as const, daysDiff: 0, message: "" };

    const parts = dateStr.split("-");
    if (parts.length !== 3) return { type: "normal" as const, daysDiff: 0, message: "" };

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const transferTime = new Date(year, month, day).getTime();
    const now = new Date();
    const todayTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const diffMs = todayTime - transferTime;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        type: "future" as const,
        daysDiff: diffDays,
        message: `Tanggal transfer (${dateStr}) berada di masa depan (${Math.abs(diffDays)} hari ke depan) / melebihi hari ini! Mohon periksa keaslian tanggal struk.`,
      };
    }

    if (diffDays > 3) {
      return {
        type: "too_old" as const,
        daysDiff: diffDays,
        message: `Tanggal transfer (${dateStr}) sudah ${diffDays} hari yang lalu (Toleransi: maksimal 3 hari dari tanggal saat ini). Pastikan ini bukan bukti transfer usang yang diunggah ulang.`,
      };
    }

    return { type: "normal" as const, daysDiff: diffDays, message: "" };
  };

  // Date Validation with 3-Day Tolerance Check
  const dateValidation = useMemo(() => {
    const targetDate = transferDate || ocrData?.transfer_date || selected?.transfer_date || "";
    return computeDateDiff(targetDate);
  }, [transferDate, selected?.transfer_date, ocrData?.transfer_date]);

  // Mark submission notification as read helper
  const markNotificationRead = (submissionId: string) => {
    try {
      const raw = localStorage.getItem("admin_read_notifications");
      const arr: string[] = raw ? JSON.parse(raw) : [];
      if (!arr.includes(submissionId)) {
        arr.push(submissionId);
        localStorage.setItem("admin_read_notifications", JSON.stringify(arr));
      }
      window.dispatchEvent(new CustomEvent("admin:notification_read", { detail: { id: submissionId } }));
    } catch (e) {
      console.warn("Notification read notice:", e);
    }
  };

  // Approve / Verify Action
  const handleApprove = async () => {
    if (!selected || !activeGroup?.group_id) return;
    if (verifiedAmount <= 0) {
      showToast("error", "Nominal verifikasi harus lebih besar dari Rp0.");
      return;
    }

    setIsProcessing(true);

    try {
      const idempotencyKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2);

      const { error } = await supabase.rpc("verify_payment", {
        p_group_id: activeGroup.group_id,
        p_submission_id: selected.id,
        p_idempotency_key: idempotencyKey,
        p_verified_amount_idr: verifiedAmount,
        p_bank_name: bankName.trim() || undefined,
        p_reference_number: referenceNumber.trim() || undefined,
        p_transfer_date: transferDate || undefined,
      });

      if (error) throw error;

      markNotificationRead(selected.id);
      showToast(
        "success",
        `Setoran ${selected.student_name} Rp${verifiedAmount.toLocaleString("id-ID")} berhasil diverifikasi!`
      );
      setShowConfirmModal(false);
      await loadSubmissions();
    } catch (err: any) {
      console.error("Verification error:", err);
      showToast("error", err.message || "Gagal memverifikasi setoran.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Reject Action
  const handleReject = async () => {
    if (!selected || !rejectReason.trim()) return;
    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from("payment_submissions")
        .update({
          status: "rejected",
          void_reason: rejectReason.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", selected.id);

      if (error) throw error;

      markNotificationRead(selected.id);
      showToast("success", "Setoran berhasil ditolak.");
      setShowTolakModal(false);
      setRejectReason("");
      await loadSubmissions();
    } catch (err: any) {
      showToast("error", err.message || "Gagal menolak setoran.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Void Verified Action
  const handleVoidVerified = async () => {
    if (!selected || !rejectReason.trim() || !activeGroup?.group_id) return;
    setIsProcessing(true);

    try {
      const idempotencyKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2);

      const { error } = await supabase.rpc("void_verified_payment", {
        p_group_id: activeGroup.group_id,
        p_submission_id: selected.id,
        p_reason: rejectReason.trim(),
        p_idempotency_key: idempotencyKey,
      });

      if (error) throw error;

      markNotificationRead(selected.id);
      showToast("success", "Setoran terverifikasi berhasil dibatalkan (saldo dikembalikan).");
      setShowVoidModal(false);
      setRejectReason("");
      await loadSubmissions();
    } catch (err: any) {
      showToast("error", err.message || "Gagal membatalkan setoran.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Trigger Manual AI OCR with Selected Provider
  const handleTriggerManualOCR = async () => {
    if (!selected?.id) return;
    setIsTriggeringOCR(true);

    try {
      const { error } = await supabase.functions.invoke("process-ocr-worker", {
        body: {
          submission_id: selected.id,
          preferred_provider: aiProviderMode,
        },
      });

      if (error) {
        throw error;
      }

      showToast(
        "success",
        `AI OCR (${aiProviderMode === "cosmoshub" ? "Cosmoshub AI" : "Gemini Auto-Fallback"}) berhasil memproses bukti transfer!`
      );
      await loadSubmissions();
    } catch (err: any) {
      console.warn("Manual OCR trigger note:", err);
      showToast("error", err.message || "Gagal memicu OCR Edge Function.");
    } finally {
      setIsTriggeringOCR(false);
    }
  };

  const filtered = submissions.filter((b) => {
    const matchStatus = filterStatus === "semua" || b.status === filterStatus;
    const matchSearch =
      b.student_name.toLowerCase().includes(search.toLowerCase()) ||
      b.display_name.toLowerCase().includes(search.toLowerCase()) ||
      b.period_label.toLowerCase().includes(search.toLowerCase()) ||
      (b.bank_name && b.bank_name.toLowerCase().includes(search.toLowerCase())) ||
      (b.reference_number && b.reference_number.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white ${
            toast.type === "success" ? "bg-[#0F766E]" : "bg-[#DC2626]"
          }`}
        >
          {toast.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}

      {/* Left Panel: Submission List */}
      <div className={`w-full lg:w-[380px] xl:w-[420px] flex-shrink-0 flex flex-col border-r border-[#E2E8F0] bg-white ${mobileTab === 'detail' && selected ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold text-[#0F172A]">Antrean Setoran</h1>
            <button
              onClick={loadSubmissions}
              title="Refresh"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari member/periode/bank/ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
          </div>

          {/* Filter */}
          <div className="relative">
            <Filter size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none cursor-pointer"
            >
              <option value="semua">Semua Status ({submissions.length})</option>
              <option value="submitted">Menunggu ({submissions.filter((s) => s.status === "submitted").length})</option>
              <option value="verified">Terverifikasi ({submissions.filter((s) => s.status === "verified").length})</option>
              <option value="rejected">Ditolak ({submissions.filter((s) => s.status === "rejected").length})</option>
              <option value="voided">Dibatalkan ({submissions.filter((s) => s.status === "voided").length})</option>
            </select>
            <ChevronDown size={13} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* List items */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#F1F5F9]">
          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-slate-400 p-6">
              <FileImage size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-xs text-slate-600">Tidak ada bukti setoran</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Semua antrean bersih</p>
            </div>
          ) : (
            <>
              {filtered.slice(0, queueLimit).map((item) => {
                const itemOcr = item.ocr_data;
                const hasDiff = itemOcr?.amount_idr && itemOcr.amount_idr !== item.amount_idr;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelected(item);
                      setMobileTab("detail");
                      markNotificationRead(item.id);
                    }}
                    className={`p-4 cursor-pointer transition-all ${
                      selected?.id === item.id
                        ? "bg-teal-50/70 border-l-4 border-l-[#0F766E]"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 bg-[#0F172A] text-white rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {item.student_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-[#0F172A] truncate">{item.student_name}</p>
                            {item.ocr_status === "completed" && (
                              <span title="OCR Gemini Selesai" className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                            )}
                            {item.ocr_status === "fallback_completed" && (
                              <span title="OCR Cosmoshub Selesai" className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <p className="text-[11px] text-slate-400 truncate">{item.period_label}</p>
                            {item.period_allocations && item.period_allocations.length > 1 && (
                              <span className="text-[9.5px] font-bold px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full flex-shrink-0">
                                {item.period_allocations.length} Bulan
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${statusClass[item.status]}`}>
                        {statusLabel[item.status]}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-[#0F766E]">
                          Rp{item.amount_idr.toLocaleString("id-ID")}
                        </span>
                        {hasDiff && (
                          <span
                            title={`Hasil AI: Rp${itemOcr.amount_idr?.toLocaleString("id-ID")}`}
                            className="flex items-center gap-0.5 text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300"
                          >
                            <AlertTriangle size={9} /> Beda AI
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(item.transfer_date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}

              {filtered.length > queueLimit && (
                <div className="p-3 text-center bg-[#F8FAFC]">
                  <button
                    onClick={() => setQueueLimit((prev) => prev + 20)}
                    className="w-full py-2 bg-white hover:bg-slate-100 border border-[#E2E8F0] rounded-xl text-xs font-bold text-slate-700 transition-colors cursor-pointer shadow-2xs"
                  >
                    Muat Lebih Banyak (+20 dari {filtered.length - queueLimit} tersisa)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Panel: Split Verification Review */}
      {selected ? (
        <div className={`flex-1 flex flex-col overflow-hidden bg-[#F8FAFC] ${mobileTab === 'list' ? 'hidden lg:flex' : 'flex'}`}>
          {/* Mobile Back Button Header */}
          <div className="lg:hidden flex items-center justify-between p-3.5 bg-white border-b border-[#E2E8F0] sticky top-0 z-10 flex-shrink-0 shadow-xs">
            <button
              onClick={() => setMobileTab("list")}
              className="flex items-center gap-1.5 text-xs font-bold text-[#0F766E] px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Kembali ke Antrean</span>
            </button>
            <div className="text-right min-w-0">
              <p className="text-xs font-bold text-[#0F172A] truncate max-w-[140px]">{selected.student_name}</p>
              <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${statusClass[selected.status]}`}>
                {statusLabel[selected.status]}
              </span>
            </div>
          </div>

          {/* Scrollable details */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
            {/* ⚠️ PROMINENT TOP ALERT BANNERS: Mismatch and Date Tolerance Warnings */}
            {isAmountDifferentFromSubmission && (
              <div className="flex items-start gap-3 p-4 bg-amber-500/10 border-2 border-amber-400/90 rounded-3xl text-amber-950 shadow-xs">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 flex-shrink-0 mt-0.5 shadow-2xs">
                  <AlertTriangle size={20} />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <p className="text-xs font-black uppercase tracking-wider text-amber-900">
                      ⚠️ Peringatan: Selisih Nominal Pengajuan vs Hasil AI OCR
                    </p>
                    <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                      Selisih Rp{Math.abs(rawSubmissionAmount - aiExtractedAmount!).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Pengajuan awal member: <strong className="font-mono font-bold text-slate-800 line-through">Rp{rawSubmissionAmount.toLocaleString("id-ID")}</strong> ➔ 
                    Hasil ekstraksi AI OCR pada bukti: <strong className="font-mono font-black text-[#0F766E] text-sm">Rp{aiExtractedAmount!.toLocaleString("id-ID")}</strong>.
                  </p>
                  <p className="text-[11.5px] text-amber-800 font-semibold pt-0.5">
                    {confidencePercent >= 90
                      ? `✨ Nominal verifikasi telah otomatis disesuaikan ke Rp${aiExtractedAmount!.toLocaleString("id-ID")} karena keyakinan AI sangat tinggi (${confidencePercent}%). Anda tetap dapat mengubahnya secara manual di form bawah.`
                      : `Harap periksa dengan teliti foto bukti asli di sebelah kiri untuk memastikan nominal yang benar.`}
                  </p>
                </div>
              </div>
            )}

            {dateValidation.type === "too_old" && (
              <div className="flex items-start gap-3 p-4 bg-amber-500/10 border-2 border-amber-400/90 rounded-3xl text-amber-950 shadow-xs">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 flex-shrink-0 mt-0.5 shadow-2xs">
                  <Clock size={20} />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <p className="text-xs font-black uppercase tracking-wider text-amber-900">
                      ⚠️ Peringatan: Tanggal Transfer Melebihi Batas Toleransi ({dateValidation.daysDiff} Hari Lalu)
                    </p>
                    <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                      Toleransi Maksimal: 3 Hari
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed font-medium">
                    {dateValidation.message}
                  </p>
                </div>
              </div>
            )}

            {dateValidation.type === "future" && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border-2 border-red-400/90 rounded-3xl text-red-950 shadow-xs">
                <div className="w-9 h-9 rounded-2xl bg-red-100 border border-red-300 flex items-center justify-center text-red-700 flex-shrink-0 mt-0.5 shadow-2xs">
                  <AlertCircle size={20} />
                </div>
                <div className="space-y-1 flex-1">
                  <p className="text-xs font-black uppercase tracking-wider text-red-900">
                    ⚠️ Peringatan: Tanggal Transfer Tidak Valid (Di Masa Depan)
                  </p>
                  <p className="text-xs text-red-800 leading-relaxed font-medium">
                    {dateValidation.message}
                  </p>
                </div>
              </div>
            )}

            {/* Status Alert if rejected or voided */}
            {selected.status === "rejected" && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                <AlertTriangle size={18} className="text-[#DC2626] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-[#DC2626]">Setoran Ditolak</p>
                  <p className="text-xs text-red-600 mt-0.5">{selected.void_reason || "Tidak memenuhi kriteria validasi."}</p>
                </div>
              </div>
            )}

            {selected.status === "voided" && (
              <div className="flex items-start gap-3 p-4 bg-slate-100 border border-slate-200 rounded-2xl">
                <AlertCircle size={18} className="text-slate-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-700">Setoran Dibatalkan (Voided)</p>
                  <p className="text-xs text-slate-500 mt-0.5">Alasan: {selected.void_reason || "Dibatalkan oleh bendahara."}</p>
                </div>
              </div>
            )}

            {/* Multi-Month Allocation Breakdown Card */}
            {selected.period_allocations && selected.period_allocations.length > 1 && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-200/80 rounded-2xl space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-blue-600" />
                    Alokasi Multi-Bulan ({selected.period_allocations.length} Bulan Tagihan)
                  </p>
                  <span className="text-xs font-extrabold text-blue-800 font-mono">
                    Total: Rp{selected.amount_idr.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                  {selected.period_allocations.map((alloc, i) => (
                    <div key={i} className="bg-white p-2.5 rounded-xl border border-blue-100 shadow-2xs">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase block truncate">{alloc.period}</span>
                      <span className="text-xs font-bold text-[#0F172A] font-mono mt-0.5 block">
                        Rp{alloc.amount_idr.toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Split Content: Proof Image (Left) & AI OCR Suggestion Panel (Right) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {/* Proof Image Box */}
              <div className="bg-white rounded-3xl border border-[#E2E8F0] p-4 shadow-sm space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <FileImage size={14} className="text-teal-600" />
                      Foto Bukti Asli
                    </h3>
                    {selected.signed_url && (
                      <button
                        onClick={() => setImgZoom(true)}
                        className="flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900 cursor-pointer"
                      >
                        <ZoomIn size={13} /> Perbesar
                      </button>
                    )}
                  </div>

                  {selected.signed_url ? (
                    <div
                      onClick={() => setImgZoom(true)}
                      className="relative group cursor-pointer rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] flex items-center justify-center"
                    >
                      <img
                        src={selected.signed_url}
                        alt="Bukti Transfer"
                        className="max-h-full max-w-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-slate-900 text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1">
                          <ZoomIn size={14} /> Klik untuk Perbesar
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <FileImage size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-xs font-semibold text-slate-500">Tidak ada foto bukti transfer terlampir</p>
                    </div>
                  )}
                </div>

                <div className="pt-2 text-center">
                  <p className="text-[11px] text-slate-400">
                    Klik foto untuk memperbesar dengan resolusi penuh
                  </p>
                </div>
              </div>

              {/* ✨ AI OCR Suggestion Panel (Dual-Provider Engine with Switcher) */}
              <div className="bg-white rounded-3xl border border-[#E2E8F0] p-5 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-teal-50 text-teal-700 rounded-xl flex items-center justify-center">
                        <Sparkles size={15} />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-[#0F172A]">
                          Saran AI OCR
                        </h3>
                      </div>
                    </div>

                    {/* AI Model Indicator Badge */}
                    {isOCRCompleted ? (
                      isOCRFallback ? (
                        <span className="flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          <Cpu size={11} /> Cosmoshub AI ({selected.ocr_model || "gemini-3.7-flash"})
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Bot size={11} /> Google Gemini 2.5 Flash (Primary)
                        </span>
                      )
                    ) : selected.ocr_status === "failed" ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                        OCR Gagal
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        Belum Dianalisis
                      </span>
                    )}
                  </div>

                  {/* AI Provider Switcher / Toggle */}
                  <div className={`bg-slate-50 p-1 rounded-xl border border-slate-200/80 flex items-center gap-1 ${
                    selected.status !== "submitted" ? "opacity-60 pointer-events-none" : ""
                  }`}>
                    <button
                      type="button"
                      disabled={selected.status !== "submitted"}
                      onClick={() => setAiProviderMode("auto")}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        aiProviderMode === "auto"
                          ? "bg-white text-teal-800 shadow-2xs border border-slate-200/60"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Bot size={12} className={aiProviderMode === "auto" ? "text-teal-600" : ""} />
                      <span>Default (Gemini Auto)</span>
                    </button>
                    <button
                      type="button"
                      disabled={selected.status !== "submitted"}
                      onClick={() => setAiProviderMode("cosmoshub")}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        aiProviderMode === "cosmoshub"
                          ? "bg-white text-blue-800 shadow-2xs border border-slate-200/60"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Cpu size={12} className={aiProviderMode === "cosmoshub" ? "text-blue-600" : ""} />
                      <span>Cosmoshub AI</span>
                    </button>
                  </div>

                  {isOCRCompleted && ocrData ? (
                    <div className="space-y-3">
                      {/* Auto Applied Notice */}
                      {isAmountAutoApplied && (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                          <CheckCircle size={14} className="text-emerald-600 flex-shrink-0" />
                          <p className="text-[11.5px] leading-snug">
                            Nominal otomatis disesuaikan ke <strong>Rp{(ocrData.amount_idr || 0).toLocaleString("id-ID")}</strong> (Keyakinan AI: <strong>{confidencePercent}%</strong>).
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-3 bg-slate-50 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Nominal Terbaca</span>
                          <p className="text-base font-black font-mono text-[#0F766E]">
                            Rp{(ocrData.amount_idr || 0).toLocaleString("id-ID")}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Bank / Metode</span>
                          <p className="text-xs font-bold text-[#0F172A] truncate">
                            {ocrData.bank_name || "Tidak Tertera"}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Tanggal Transaksi</span>
                          <p className="text-xs font-bold text-[#0F172A]">
                            {ocrData.transfer_date || "—"}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Nama Pengirim</span>
                          <p className="text-xs font-bold text-[#0F172A] truncate">
                            {ocrData.sender_name || "—"}
                          </p>
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] space-y-1 text-slate-600">
                        <div className="flex justify-between">
                          <span>No. Referensi:</span>
                          <span className="font-mono font-bold text-[#0F172A]">{ocrData.reference_number || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Skor Keyakinan AI:</span>
                          <span className={`font-bold ${confidencePercent >= 90 ? "text-emerald-700" : "text-amber-700"}`}>
                            {confidencePercent}% {confidencePercent >= 90 ? "(Sangat Yakin)" : "(Perlu Diperiksa)"}
                          </span>
                        </div>
                        {ocrData.notes && (
                          <div className="pt-1 border-t border-slate-200/60 text-[10px] text-slate-400">
                            Catatan AI: {ocrData.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : selected.ocr_status === "failed" ? (
                    <div className="p-6 text-center text-xs text-slate-500 bg-red-50/50 rounded-2xl border border-red-100 space-y-2">
                      <AlertTriangle size={24} className="mx-auto text-red-500" />
                      <p className="font-bold text-slate-700">Ekstraksi Otomatis Belum Berhasil</p>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                        Gambar mungkin buram atau terpotong. Silakan lakukan verifikasi secara manual dengan melihat foto asli di samping.
                      </p>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                      <Sparkles size={24} className="mx-auto text-teal-600 animate-pulse" />
                      <p className="font-bold text-slate-700">Analisis AI Belum Dijalankan</p>
                      <p className="text-[11px] text-slate-400">
                        Klik tombol di bawah untuk memproses bukti transfer dengan AI OCR pilihan Anda.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  {selected.status === "submitted" ? (
                    <button
                      onClick={handleTriggerManualOCR}
                      disabled={isTriggeringOCR}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200/80 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 min-h-[42px]"
                    >
                      <Zap size={14} className={isTriggeringOCR ? "animate-spin text-teal-600" : "text-teal-600"} />
                      <span>
                        {isTriggeringOCR
                          ? "Sedang Menganalisis Gambar..."
                          : isOCRCompleted
                          ? "⚡ Analisis Ulang dengan AI"
                          : "⚡ Verifikasi dengan AI"}
                      </span>
                    </button>
                  ) : (
                    <div className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 cursor-not-allowed select-none min-h-[42px]">
                      <CheckCircle size={14} className={selected.status === "verified" ? "text-teal-600" : "text-slate-400"} />
                      <span>
                        {selected.status === "verified"
                          ? "Setoran Terverifikasi (Analisis AI Dikunci)"
                          : `Setoran ${statusLabel[selected.status]} (Analisis AI Ditutup)`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Editable Verification Form Card */}
            <div className="bg-white rounded-3xl border border-[#E2E8F0] p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Edit3 size={16} className="text-teal-600" />
                  <h3 className="text-sm font-bold text-[#0F172A]">Data Verifikasi Setoran</h3>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  {selected.status === "submitted" ? "Admin dapat mengedit data sesuai bukti asli" : "Data setoran telah dikunci"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Member & Pengaju Info */}
                <div className="p-3.5 bg-slate-50 rounded-2xl space-y-1">
                  <p className="text-[10.5px] text-slate-400 font-bold uppercase tracking-wider">Nama Member</p>
                  <p className="text-base font-extrabold text-[#0F172A]">{selected.student_name}</p>
                  <p className="text-[11px] text-slate-500">Akun: {selected.display_name} · Periode: {selected.period_label}</p>
                </div>

                {/* Editable Verified Amount */}
                <div className="p-3.5 bg-teal-50/50 border border-teal-200 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10.5px] text-teal-800 font-bold uppercase tracking-wider">
                      Nominal Verifikasi (Rp) *
                    </label>
                    <span className="text-[10px] font-bold text-teal-600">
                      {selected.status === "submitted" ? "Editable" : "Terkunci"}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-sm text-[#0F766E]">
                      Rp
                    </span>
                    <input
                      type="number"
                      disabled={selected.status !== "submitted"}
                      value={verifiedAmount || ""}
                      onChange={(e) => {
                        setVerifiedAmount(Number(e.target.value) || 0);
                        setIsAmountAutoApplied(false);
                      }}
                      className="w-full pl-10 pr-3 py-2 bg-white border border-teal-300 rounded-xl text-base font-black font-mono text-[#0F766E] focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs disabled:bg-slate-100 disabled:text-slate-600 disabled:border-slate-200 cursor-text disabled:cursor-not-allowed"
                      placeholder="0"
                    />
                  </div>
                  {selected.amount_idr !== verifiedAmount && (
                    <p className="text-[10.5px] text-amber-700 font-semibold mt-1">
                      Pengajuan awal member: Rp{selected.amount_idr.toLocaleString("id-ID")}
                    </p>
                  )}
                </div>

                {/* Editable Bank Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Building2 size={13} className="text-slate-400" />
                    <span>Asal / Tujuan Bank / E-Wallet</span>
                  </label>
                  <input
                    type="text"
                    disabled={selected.status !== "submitted"}
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Contoh: BCA, BRI, Bank Jago, QRIS, Dana"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Editable Reference Number */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Hash size={13} className="text-slate-400" />
                    <span>Nomor Referensi Transaksi (RRN)</span>
                  </label>
                  <input
                    type="text"
                    disabled={selected.status !== "submitted"}
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Contoh: 260812JAGBIDJA00177330"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Editable Transfer Date */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar size={13} className="text-slate-400" />
                    <span>Tanggal Transfer Tertera di Struk</span>
                  </label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <input
                      type="date"
                      disabled={selected.status !== "submitted"}
                      value={transferDate}
                      onChange={(e) => setTransferDate(e.target.value)}
                      className="w-full sm:w-1/2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all cursor-pointer disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                    />
                    {dateValidation.type === "too_old" && (
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                        <Clock size={13} className="text-amber-700" /> {dateValidation.daysDiff} hari yang lalu (Melebihi toleransi 3 hari)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Saldo Simulation Preview */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Saldo Member Saat Ini</p>
                  <p className="text-sm font-black text-slate-800 font-mono mt-0.5">
                    Rp{selected.current_balance.toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-[10px] text-blue-600 font-bold uppercase">Saldo Setelah Verifikasi</p>
                  <p className="text-sm font-black text-blue-800 font-mono mt-0.5">
                    Rp{(selected.current_balance + (verifiedAmount || 0)).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              {/* Catatan dari Orang Tua jika ada */}
              {selected.catatan && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-0.5">
                  <p className="text-[10px] font-bold uppercase text-amber-700">Catatan dari Member / Akun:</p>
                  <p className="text-amber-900">{selected.catatan}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer Action Bar */}
          <div className="p-4 sm:p-5 bg-white border-t border-[#E2E8F0] sticky bottom-0 z-10 shadow-lg sm:shadow-none">
            {selected.status === "submitted" ? (
              <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                <button
                  onClick={() => {
                    setRejectReason("");
                    setShowTolakModal(true);
                  }}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors cursor-pointer w-full sm:w-auto"
                >
                  <XCircle size={15} /> Tolak Setoran
                </button>
                <button
                  onClick={() => setShowConfirmModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#0F766E] hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-teal-900/10 cursor-pointer min-h-[42px] w-full text-center"
                >
                  <CheckCircle size={15} />
                  <span className="truncate">
                    ✅ Setujui Setoran Rp{(verifiedAmount || selected.amount_idr).toLocaleString("id-ID")}
                  </span>
                </button>
              </div>
            ) : selected.status === "verified" ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-teal-800 text-xs font-bold bg-teal-50 px-3.5 py-2.5 rounded-xl border border-teal-200">
                  <CheckCircle size={14} className="flex-shrink-0" />
                  <span className="leading-tight">
                    Setoran telah diverifikasi sebesar Rp{selected.amount_idr.toLocaleString("id-ID")}
                    {selected.bank_name ? ` (${selected.bank_name})` : ""}.
                  </span>
                </div>
                <button
                  onClick={() => {
                    setRejectReason("");
                    setShowVoidModal(true);
                  }}
                  className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 rounded-xl transition-colors cursor-pointer w-full sm:w-auto"
                >
                  <RotateCcw size={13} /> Batalkan Verifikasi
                </button>
              </div>
            ) : (
              <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-500 font-medium text-center">
                Setoran ini berstatus {statusLabel[selected.status]}.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
          <FileImage size={44} className="text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-600">Pilih Setoran untuk Ditinjau</p>
          <p className="text-xs text-slate-400">Klik salah satu antrean di sebelah kiri</p>
        </div>
      )}

      {/* Image Zoom Modal */}
      {imgZoom && selected?.signed_url && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setImgZoom(false)}
        >
          <button className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors cursor-pointer">
            <X size={28} />
          </button>
          <img
            src={selected.signed_url}
            alt="Bukti Transfer Diperbesar"
            className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Modal: Confirm Verification */}
      {showConfirmModal && selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-50 text-teal-700 rounded-2xl flex items-center justify-center font-bold">
                <CheckCircle size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#0F172A]">Konfirmasi Verifikasi Setoran</h3>
                <p className="text-xs text-slate-400">Saldo member akan otomatis bertambah secara atomik</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Member:</span>
                <span className="font-bold text-[#0F172A]">{selected.student_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Periode:</span>
                <span className="font-bold text-[#0F172A]">{selected.period_label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nominal Terverifikasi:</span>
                <span className="font-black text-[#0F766E] font-mono">
                  +Rp{verifiedAmount.toLocaleString("id-ID")}
                </span>
              </div>
              {bankName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Bank / E-Wallet:</span>
                  <span className="font-bold text-[#0F172A]">{bankName}</span>
                </div>
              )}
              {referenceNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Referensi:</span>
                  <span className="font-mono font-bold text-[#0F172A]">{referenceNumber}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500">Saldo Baru Member:</span>
                <span className="font-bold text-blue-700 font-mono">
                  Rp{(selected.current_balance + verifiedAmount).toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Modal Alert Warnings */}
            {isLowAiConfidence && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-0.5">
                <p className="font-bold flex items-center gap-1.5 text-amber-900">
                  <AlertTriangle size={13} className="text-amber-700 flex-shrink-0" />
                  <span>
                    Validasi AI Tidak Optimal ({confidencePercent}%):
                  </span>
                </p>
                <p className="text-[11px] text-amber-800 leading-snug">
                  Verifikasi otomatis tidak dapat dipastikan (keyakinan &lt; 90%). Harap periksa bukti transfer secara manual sebelum menyetujui.
                </p>
              </div>
            )}

            {isAmountDifferentFromSubmission && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-0.5">
                <p className="font-bold flex items-center gap-1">
                  <AlertTriangle size={13} className="text-amber-700" />
                  Perhatian Selisih Nominal:
                </p>
                <p className="text-[11px] text-amber-800">
                  Pengajuan awal Rp{rawSubmissionAmount.toLocaleString("id-ID")} disetujui menjadi <strong>Rp{verifiedAmount.toLocaleString("id-ID")}</strong>.
                </p>
              </div>
            )}

            {dateValidation.type !== "normal" && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-0.5">
                <p className="font-bold flex items-center gap-1">
                  <Clock size={13} className="text-amber-700" />
                  Peringatan Tanggal:
                </p>
                <p className="text-[11px] text-amber-800">
                  {dateValidation.message}
                </p>
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isProcessing}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-1 py-2.5 bg-[#0F766E] hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-teal-900/10 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? "Menyimpan..." : "Ya, Setujui Sekarang"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tolak Setoran */}
      {showTolakModal && selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
                <XCircle size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#0F172A]">Tolak Bukti Setoran</h3>
                <p className="text-xs text-slate-400">Pengaju akan melihat alasan penolakan ini</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Alasan Penolakan *</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Contoh: Bukti buram, nominal tidak sesuai, atau rekening tujuan salah..."
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white resize-none"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowTolakModal(false)}
                disabled={isProcessing}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isProcessing || !rejectReason.trim()}
                className="flex-1 py-2.5 bg-[#DC2626] hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-900/10 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? "Memproses..." : "Tolak Bukti"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Void Verified Payment */}
      {showVoidModal && selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center font-bold">
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#0F172A]">Batalkan Verifikasi Setoran</h3>
                <p className="text-xs text-slate-400">Saldo member &amp; kas grup akan ditarik kembali secara atomik</p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1">
              <p className="font-bold text-amber-900">Perhatian:</p>
              <p className="text-amber-800 leading-relaxed">
                Tindakan ini akan membatalkan status setoran dan mengurangi saldo member <strong>{selected.student_name}</strong> sebesar <strong>Rp{selected.amount_idr.toLocaleString("id-ID")}</strong>.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Alasan Pembatalan *</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Contoh: Salah input nominal atau setoran ganda..."
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white resize-none"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowVoidModal(false)}
                disabled={isProcessing}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleVoidVerified}
                disabled={isProcessing || !rejectReason.trim()}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-900/10 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? "Membatalkan..." : "Batalkan Verifikasi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
