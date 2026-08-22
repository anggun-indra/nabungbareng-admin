import React, { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard,
  CheckCircle,
  Users,
  Receipt,
  Scale,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  HelpCircle,
  Check,
  Lightbulb,
} from "lucide-react";

export const COACHMARK_STORAGE_KEY = "nabungbareng_admin_coachmark_completed";

export interface CoachmarkStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  tip?: string;
  badge: string;
  icon: React.ElementType;
}

const COACHMARK_STEPS: CoachmarkStep[] = [
  {
    id: "dashboard",
    targetSelector: '[data-coachmark="nav-dashboard"]',
    badge: "Langkah 1 dari 6",
    title: "1. Dashboard & Saldo Kas Realtime",
    description:
      "Pantau saldo kas kelas terkini, total setoran yang terkumpul bulan ini, target tabungan, dan persentase kelancaran siswa secara instan.",
    tip: "Semua ringkasan grafik dan mutasi kas terakhir terangkum rapi di halaman ini.",
    icon: LayoutDashboard,
  },
  {
    id: "verifikasi",
    targetSelector: '[data-coachmark="nav-verifikasi"]',
    badge: "Langkah 2 dari 6",
    title: "2. Verifikasi Bukti Setoran (Bantuan AI)",
    description:
      "Setiap siswa/wali mengunggah foto bukti transfer, antrean akan muncul di sini. AI OCR otomatis membaca nominal & tanggal transfer untuk mempercepat validasi Anda.",
    tip: "Cukup 1-klik 'Setujui', saldo tabungan siswa & kas kelas otomatis bertambah.",
    icon: CheckCircle,
  },
  {
    id: "siswa",
    targetSelector: '[data-coachmark="nav-siswa"]',
    badge: "Langkah 3 dari 6",
    title: "3. Buku Induk & Saldo Siswa",
    description:
      "Lihat daftar seluruh siswa di kelas, pantau saldo tabungan masing-masing anak, dan filter siapa yang sudah Lunas atau Menunggak target bulanan.",
    tip: "Anda bisa melihat rincian riwayat setoran per siswa secara transparan.",
    icon: Users,
  },
  {
    id: "pengeluaran",
    targetSelector: '[data-coachmark="nav-pengeluaran"]',
    badge: "Langkah 4 dari 6",
    title: "4. Catat Pengeluaran Kas Kelas",
    description:
      "Ada keperluan beli perlengkapan, konsumsi, atau kegiatan kelas? Catat di menu ini dan unggah foto nota/struknya. Saldo kas kelas akan otomatis berkurang.",
    tip: "Transparansi pembukuan pengeluaran bisa dilihat oleh seluruh anggota grup.",
    icon: Receipt,
  },
  {
    id: "rekonsiliasi",
    targetSelector: '[data-coachmark="nav-rekonsiliasi"]',
    badge: "Langkah 5 dari 6",
    title: "5. Rekonsiliasi Kas & Laporan",
    description:
      "Cocokkan saldo pembukuan aplikasi dengan rekening bank fisik atau uang kas tunai secara berkala. Anda juga dapat mengekspor rekap laporan ke Excel/PDF.",
    tip: "Membantu bendahara memastikan tidak ada selisih uang sepeser pun.",
    icon: Scale,
  },
  {
    id: "pengaturan",
    targetSelector: '[data-coachmark="nav-pengaturan"]',
    badge: "Langkah 6 dari 6",
    title: "6. Bagikan Undangan & Ajak Siswa",
    description:
      "Buat dan bagikan Kode Undangan grup agar siswa/wali murid bisa langsung bergabung ke kelas. Anda juga bisa mengatur target iuran bulanan di menu ini.",
    tip: "Siswa yang bergabung otomatis masuk ke buku induk tabungan Anda.",
    icon: UserPlus,
  },
];

interface AdminCoachmarkProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (page: string) => void;
}

export default function AdminCoachmark({
  isOpen,
  onClose,
  onNavigate,
}: AdminCoachmarkProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = COACHMARK_STEPS[currentStepIndex];
  const StepIcon = step.icon;

  // Measure target element position
  const updatePosition = useCallback(() => {
    if (!isOpen) return;
    const el = document.querySelector(step.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [isOpen, step.targetSelector]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    // Listen to resize and scroll
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    const timeout = setTimeout(updatePosition, 100);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      clearTimeout(timeout);
    };
  }, [isOpen, currentStepIndex, updatePosition]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleComplete();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStepIndex]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStepIndex < COACHMARK_STEPS.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      if (onNavigate) {
        onNavigate(COACHMARK_STEPS[nextIdx].id);
      }
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      if (onNavigate) {
        onNavigate(COACHMARK_STEPS[prevIdx].id);
      }
    }
  };

  const handleComplete = () => {
    try {
      localStorage.setItem(COACHMARK_STORAGE_KEY, "true");
    } catch (e) {
      console.warn("Notice saving coachmark state:", e);
    }
    onClose();
  };

  // Calculate Tooltip position based on target rect
  const isTargetVisible = !!targetRect && targetRect.width > 0 && targetRect.height > 0;
  
  let tooltipStyle: React.CSSProperties = {};
  if (isTargetVisible && targetRect) {
    // If target is in the sidebar (left side of screen)
    if (targetRect.left < 300) {
      const topPos = Math.max(16, Math.min(window.innerHeight - 340, targetRect.top - 20));
      tooltipStyle = {
        top: `${topPos}px`,
        left: `${Math.min(window.innerWidth - 380, targetRect.right + 20)}px`,
      };
    } else {
      // General positioning
      tooltipStyle = {
        top: `${Math.min(window.innerHeight - 340, targetRect.bottom + 16)}px`,
        left: `${Math.max(16, Math.min(window.innerWidth - 380, targetRect.left))}px`,
      };
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none animate-in fade-in duration-150">
      {/* Crystal Clear Clickable Backdrop for Dismiss */}
      <div className="fixed inset-0 z-40" onClick={handleComplete} />

      {/* Crystal Clear Cutout Spotlight (No Blur - 100% Sharp Page Content) */}
      {isTargetVisible && targetRect ? (
        <svg className="fixed inset-0 w-full h-full pointer-events-none z-40">
          <defs>
            <mask id="coachmark-spotlight-mask">
              {/* White area = dimmed overlay */}
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {/* Black area = crystal clear cut-out for target element */}
              <rect
                x={Math.max(0, targetRect.left - 6)}
                y={Math.max(0, targetRect.top - 6)}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="16"
                ry="16"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(15, 23, 42, 0.30)"
            mask="url(#coachmark-spotlight-mask)"
            className="transition-all duration-300"
          />
        </svg>
      ) : (
        <div className="fixed inset-0 bg-slate-900/25 transition-opacity duration-300 z-40 pointer-events-none" />
      )}

      {/* Target Element Highlight Glowing Ring */}
      {isTargetVisible && targetRect && (
        <div
          className="fixed rounded-2xl pointer-events-none transition-all duration-300 ease-out z-40 ring-4 ring-[#0F766E] shadow-[0_0_25px_rgba(15,118,110,0.6)]"
          style={{
            top: `${Math.max(0, targetRect.top - 4)}px`,
            left: `${Math.max(0, targetRect.left - 4)}px`,
            width: `${targetRect.width + 8}px`,
            height: `${targetRect.height + 8}px`,
            backgroundColor: "transparent",
          }}
        />
      )}

      {/* Coachmark Card */}
      <div
        style={isTargetVisible ? tooltipStyle : undefined}
        className={`
          z-50 max-w-sm w-[calc(100vw-32px)] sm:w-[380px]
          ${
            isTargetVisible
              ? "fixed transition-all duration-300 ease-out"
              : "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          }
        `}
      >
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 text-[#0F172A] relative space-y-4 animate-in zoom-in-95 duration-200">
          {/* Header & Step Badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#0F766E] border border-teal-200 flex items-center justify-center flex-shrink-0 shadow-inner">
                <StepIcon size={20} />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                  {step.badge}
                </span>
                <h4 className="font-extrabold text-sm sm:text-[15px] text-[#0F172A] leading-tight mt-1">
                  {step.title}
                </h4>
              </div>
            </div>

            <button
              onClick={handleComplete}
              title="Tutup Panduan (Esc)"
              className="text-slate-400 hover:text-slate-700 p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            {step.description}
          </p>

          {/* Tip Box */}
          {step.tip && (
            <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
              <Lightbulb size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11.5px] leading-snug font-medium">
                <strong className="font-bold">Tips:</strong> {step.tip}
              </p>
            </div>
          )}

          {/* Step Dots Indicator & Navigation Buttons */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {COACHMARK_STEPS.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setCurrentStepIndex(idx);
                    if (onNavigate) onNavigate(s.id);
                  }}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === currentStepIndex
                      ? "w-6 bg-[#0F766E]"
                      : idx < currentStepIndex
                      ? "w-2 bg-teal-200"
                      : "w-2 bg-slate-200"
                  }`}
                  title={`Lompat ke langkah ${idx + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {currentStepIndex > 0 && (
                <button
                  onClick={handlePrev}
                  className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="Langkah Sebelumnya"
                >
                  <ArrowLeft size={14} />
                </button>
              )}

              <button
                onClick={handleComplete}
                className="px-2.5 py-1.5 text-slate-400 hover:text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
              >
                Lewati
              </button>

              <button
                onClick={handleNext}
                className="px-4 py-2 bg-[#0F766E] hover:bg-teal-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-teal-900/20 flex items-center gap-1.5 cursor-pointer"
              >
                <span>
                  {currentStepIndex === COACHMARK_STEPS.length - 1
                    ? "Saya Mengerti!"
                    : "Lanjut"}
                </span>
                {currentStepIndex === COACHMARK_STEPS.length - 1 ? (
                  <Check size={14} />
                ) : (
                  <ArrowRight size={14} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
