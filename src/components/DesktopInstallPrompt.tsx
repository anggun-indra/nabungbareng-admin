import { useState, useEffect } from "react";
import { Laptop, Download, Check, X, Sparkles } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const installListeners = new Set<(canInstall: boolean) => void>();

export function triggerGlobalDesktopInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    return Promise.resolve(false);
  }
  return deferredPrompt.prompt().then(() => {
    return deferredPrompt!.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === "accepted") {
        console.log("[Admin PWA] User accepted desktop install");
        deferredPrompt = null;
        installListeners.forEach((fn) => fn(false));
        return true;
      } else {
        console.log("[Admin PWA] User dismissed desktop install");
        return false;
      }
    });
  });
}

export function subscribeToInstallable(listener: (canInstall: boolean) => void): () => void {
  installListeners.add(listener);
  listener(!!deferredPrompt);
  return () => {
    installListeners.delete(listener);
  };
}

export default function DesktopInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (installed PWA)
    const checkStandalone = () => {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone);
    };

    checkStandalone();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      setCanInstall(true);
      installListeners.forEach((fn) => fn(true));
      console.log("[Admin PWA] captured beforeinstallprompt event for desktop");
    };

    const handleAppInstalled = () => {
      console.log("[Admin PWA] App was successfully installed");
      deferredPrompt = null;
      setCanInstall(false);
      setIsInstalled(true);
      installListeners.forEach((fn) => fn(false));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (isInstalled || !canInstall || isDismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    await triggerGlobalDesktopInstall();
  };

  return (
    <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/80 rounded-xl text-xs shadow-2xs">
      <div className="w-6 h-6 rounded-lg bg-[#0F766E] text-white flex items-center justify-center flex-shrink-0">
        <Laptop size={13} />
      </div>
      <div className="min-w-0 pr-1">
        <p className="font-bold text-[#0F172A] leading-tight">Install Aplikasi Desktop</p>
        <p className="text-[10px] text-slate-500 truncate">Akses cepat tanpa browser tab</p>
      </div>
      <button
        onClick={handleInstallClick}
        className="px-2.5 py-1 bg-[#0F766E] hover:bg-teal-700 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
      >
        <Download size={11} /> Install
      </button>
      <button
        onClick={() => setIsDismissed(true)}
        className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
        title="Tutup saran install"
      >
        <X size={13} />
      </button>
    </div>
  );
}
