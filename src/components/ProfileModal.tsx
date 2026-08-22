import { useState, useEffect } from "react";
import {
  User,
  Crown,
  ShieldCheck,
  Building2,
  School,
  Mail,
  RefreshCw,
  Download,
  Laptop,
  CheckCircle2,
  AlertCircle,
  LogOut,
  X,
  Sparkles,
  Info,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { APP_VERSION, BUILD_NUMBER } from "../version";
import { checkForAdminUpdate, forceAdminUpdate } from "../utils/pwaUpdater";
import { triggerGlobalDesktopInstall, subscribeToInstallable } from "./DesktopInstallPrompt";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour?: () => void;
}

export default function ProfileModal({ isOpen, onClose, onStartTour }: ProfileModalProps) {
  const { user, role, adminInfo, activeGroup, logout } = useAuth();
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<{
    type: "success" | "info" | "warning" | "error";
    text: string;
    hasUpdate?: boolean;
  } | null>(null);

  const [canInstallDesktop, setCanInstallDesktop] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isSuper = role === "super_admin";
  const initials = (adminInfo?.display_name || user?.email || "AD")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsStandalone(
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true
      );
    }

    const unsub = subscribeToInstallable((canInstall) => {
      setCanInstallDesktop(canInstall);
    });

    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatus(null);
    try {
      const res = await checkForAdminUpdate();
      if (res.hasUpdate) {
        setUpdateStatus({
          type: "warning",
          text: `Versi baru (${res.serverVersion || "Terbaru"}) tersedia! Klik perbarui di bawah.`,
          hasUpdate: true,
        });
      } else {
        setUpdateStatus({
          type: "success",
          text: `Aplikasi Anda sudah versi terbaru (v${APP_VERSION} Build ${BUILD_NUMBER}).`,
        });
      }
    } catch (err: any) {
      setUpdateStatus({
        type: "error",
        text: err?.message || "Gagal memeriksa pembaruan server.",
      });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleApplyUpdate = async () => {
    setIsCheckingUpdate(true);
    await forceAdminUpdate();
  };

  const handleInstallClick = async () => {
    await triggerGlobalDesktopInstall();
  };

  const handleLogout = async () => {
    onClose();
    await logout();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="relative p-6 bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-lg text-white shadow-lg ${
                isSuper ? "bg-amber-600" : "bg-[#0F766E]"
              }`}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-base leading-tight truncate">
                {adminInfo?.display_name || "Admin NabungBareng"}
              </h3>
              <p className="text-xs text-slate-300 truncate mt-0.5">{user?.email}</p>
              <div className="mt-2 flex items-center gap-2">
                {isSuper ? (
                  <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full">
                    <Crown size={11} /> Super Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-teal-500/20 text-teal-300 border border-teal-400/30 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full">
                    <ShieldCheck size={11} /> {adminInfo?.role === "treasurer" ? "Bendahara" : "Admin Group"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4 max-h-[calc(85vh-160px)] overflow-y-auto">
          {/* Active Group Info */}
          {!isSuper && activeGroup && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Grup Aktif Dikelola
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-extrabold text-xs text-[#0F172A]">{activeGroup.group_name}</p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <School size={12} className="text-slate-400" />
                    {activeGroup.school_name || "Tabungan Umum"}
                  </p>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 rounded-full">
                  Aktif
                </span>
              </div>
            </div>
          )}

          {/* Desktop PWA Status & Install Button */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-700 font-bold">
                <Laptop size={14} className="text-[#0F766E]" />
                <span>Mode Aplikasi Desktop</span>
              </div>
              <span
                className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                  isStandalone
                    ? "bg-teal-50 text-teal-700 border border-teal-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {isStandalone ? "Aplikasi Terpasang (PWA)" : "Web Browser"}
              </span>
            </div>

            {!isStandalone && canInstallDesktop && (
              <button
                onClick={handleInstallClick}
                className="w-full py-2.5 px-3 bg-[#0F766E] hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download size={13} />
                <span>Pasang / Install Aplikasi ke Laptop</span>
              </button>
            )}
          </div>

          {/* Versioning & Update Checker */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-[#0F172A]">Versi Portal Admin</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  v{APP_VERSION} (Build {BUILD_NUMBER})
                </p>
              </div>
              <button
                onClick={handleCheckUpdate}
                disabled={isCheckingUpdate}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                <RefreshCw size={12} className={isCheckingUpdate ? "animate-spin" : ""} />
                <span>{isCheckingUpdate ? "Memeriksa..." : "Periksa Pembaruan"}</span>
              </button>
            </div>

            {/* Update feedback message */}
            {updateStatus && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-start gap-2 border ${
                  updateStatus.type === "success"
                    ? "bg-teal-50 text-teal-800 border-teal-200"
                    : updateStatus.type === "warning"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-red-50 text-red-800 border-red-200"
                }`}
              >
                {updateStatus.type === "success" ? (
                  <CheckCircle2 size={15} className="text-teal-600 flex-shrink-0 mt-0.5" />
                ) : updateStatus.type === "warning" ? (
                  <Sparkles size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={15} className="text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium leading-relaxed">{updateStatus.text}</p>
                  {updateStatus.hasUpdate && (
                    <button
                      onClick={handleApplyUpdate}
                      className="mt-2 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer shadow-xs"
                    >
                      Update & Muat Ulang Sekarang
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tutorial & Panduan Alur Bendahara */}
          {!isSuper && onStartTour && (
            <div className="p-3.5 bg-teal-50/80 rounded-2xl border border-teal-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-teal-950 font-bold">
                  <HelpCircle size={15} className="text-[#0F766E]" />
                  <span>Panduan Interaktif Bendahara</span>
                </div>
              </div>
              <p className="text-[11px] text-teal-800 leading-snug">
                Pelajari kembali fungsi setiap menu, alur verifikasi AI OCR, pencatatan kas, dan pembukuan siswa.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onStartTour();
                }}
                className="w-full py-2 px-3 bg-[#0F766E] hover:bg-teal-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles size={13} />
                <span>Buka Ulang Tour Panduan</span>
              </button>
            </div>
          )}

          {/* Logout Section */}
          <div className="pt-2">
            {!showLogoutConfirm ? (
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full py-3 px-4 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <LogOut size={15} />
                <span>Keluar dari Akun Admin</span>
              </button>
            ) : (
              <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-center space-y-3 animate-in fade-in duration-150">
                <p className="text-xs font-bold text-red-900">
                  Apakah Anda yakin ingin keluar dari sesi admin?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
                  >
                    Ya, Keluar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
