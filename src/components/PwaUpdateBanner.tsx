import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, X, AlertTriangle, ShieldCheck } from "lucide-react";
import {
  subscribeToAdminUpdates,
  forceAdminUpdate,
  type UpdateCheckResult,
} from "../utils/pwaUpdater";

export default function PwaUpdateBanner() {
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAdminUpdates((info) => {
      if (info.hasUpdate) {
        setUpdateInfo(info);
        setIsDismissed(false);
      }
    });
    return () => unsubscribe();
  }, []);

  if (!updateInfo || !updateInfo.hasUpdate || isDismissed) {
    return null;
  }

  const handleUpdate = async () => {
    setIsUpdating(true);
    await forceAdminUpdate();
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  // Force Update Modal (if marked as mandatory by admin/server)
  if (updateInfo.forceUpdate) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0F172A]/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-inner">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              Pembaruan Wajib (Mandatory)
            </span>
            <h3 className="text-lg font-black text-[#0F172A] mt-2">Versi Baru Diperlukan</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Terdapat pembaruan keamanan / fitur penting untuk portal admin NabungBareng. Mohon perbarui aplikasi untuk melanjutkan.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-1">
            <p className="font-bold text-slate-700">Catatan Rilis:</p>
            <p className="text-slate-500 font-medium">
              {updateInfo.releaseNotes || `Versi ${updateInfo.serverVersion || "Terbaru"}`}
            </p>
          </div>

          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="w-full py-3.5 px-4 rounded-2xl text-xs font-bold text-white bg-[#0F766E] hover:bg-teal-700 active:scale-[0.98] transition-all shadow-lg shadow-teal-900/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isUpdating ? "animate-spin" : ""}`} />
            <span>{isUpdating ? "Memasang Pembaruan..." : "Perbarui Aplikasi Sekarang"}</span>
          </button>
        </div>
      </div>
    );
  }

  // Floating Banner (Desktop & Tablet standard notification)
  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom duration-300">
      <div className="bg-[#0F172A] text-white rounded-2xl p-4 shadow-2xl border border-teal-500/30 flex flex-col gap-3 backdrop-blur-md">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-400/30 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-white">Versi Baru Admin Tersedia</h4>
                <span className="bg-teal-400/20 text-teal-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-teal-300/30">
                  {updateInfo.serverVersion || "v" + updateInfo.currentVersion}
                </span>
              </div>
              <p className="text-slate-300 text-xs mt-0.5 leading-snug truncate">
                {updateInfo.releaseNotes || "Pembaruan aplikasi siap dipasang."}
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 -mr-1 -mt-1 cursor-pointer transition-colors"
            title="Tutup notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-white/10">
          <button
            onClick={handleDismiss}
            className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer"
          >
            Nanti Saja
          </button>
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white bg-[#0F766E] hover:bg-teal-600 transition-colors shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? "animate-spin" : ""}`} />
            <span>{isUpdating ? "Memasang..." : "Update Sekarang"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
