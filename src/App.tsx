import { useState, useEffect } from "react";
import {
  Menu,
  Bell,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Building2,
  Crown,
  ShieldCheck,
  LogOut,
  CheckCircle2,
  Receipt,
  Scale,
  ArrowUpRight,
  Inbox,
  CheckCheck,
  Clock,
  HelpCircle,
} from "lucide-react";
import NabungBarengLogo from "./components/NabungBarengLogo";
import Sidebar, { Page } from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Verifikasi from "./pages/Verifikasi";
import SiswaSaldo from "./pages/Siswa";
import Pengeluaran from "./pages/Pengeluaran";
import Rekonsiliasi from "./pages/Rekonsiliasi";
import Laporan from "./pages/Laporan";
import Pengaturan from "./pages/Pengaturan";
import SuperAdminGroups from "./pages/superadmin/SuperAdminGroups";
import SuperAdminAdmins from "./pages/superadmin/SuperAdminAdmins";
import SuperAdminStorage from "./pages/superadmin/SuperAdminStorage";
import SuperAdminAIConfigs from "./pages/superadmin/SuperAdminAIConfigs";
import DesktopInstallPrompt from "./components/DesktopInstallPrompt";
import PwaUpdateBanner from "./components/PwaUpdateBanner";
import ProfileModal from "./components/ProfileModal";
import AdminCoachmark, { COACHMARK_STORAGE_KEY } from "./components/AdminCoachmark";
import Login from "./pages/Login";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { supabase } from "./lib/supabase";

const pageTitles: Record<Page, string> = {
  dashboard: "Dashboard Ringkasan",
  verifikasi: "Verifikasi Setoran",
  siswa: "Siswa & Saldo",
  pengeluaran: "Catat Pengeluaran",
  rekonsiliasi: "Rekonsiliasi Kas",
  laporan: "Laporan & Ekspor",
  pengaturan: "Pengaturan Grup",
  superadmin_dashboard: "Manajemen Grup & Sekolah",
  superadmin_admins: "Kelola Admin Group",
  superadmin_storage: "Kapasitas & Kesehatan Sistem",
  superadmin_ai: "Pengaturan API Key & Model AI",
};

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  timestamp: number;
  unread: boolean;
  targetPage: Page;
  type: "submission" | "expense" | "reconciliation" | "system";
}

function getRelativeTimeIndonesian(dateString: string | Date | number): string {
  const now = Date.now();
  const diff = Math.max(0, now - new Date(dateString).getTime());
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Baru saja";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Kemarin";
  if (days < 30) return `${days} hari lalu`;
  const months = Math.floor(days / 30);
  return `${months} bulan lalu`;
}

function MainApp() {
  const { user, role, adminInfo, activeGroup, setActiveGroup, loading, logout } = useAuth();
  const [page, setPage] = useState<Page>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCoachmark, setShowCoachmark] = useState(false);

  const [pendingCount, setPendingCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("admin_read_notifications");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Auto-launch Coachmark for group admin / treasurer if not completed yet in this browser
  useEffect(() => {
    if (user && role && role !== "super_admin") {
      try {
        const completed = localStorage.getItem(COACHMARK_STORAGE_KEY);
        if (!completed) {
          const timer = setTimeout(() => {
            setShowCoachmark(true);
          }, 800);
          return () => clearTimeout(timer);
        }
      } catch (e) {
        console.warn("Storage check notice:", e);
      }
    }
  }, [user, role]);

  // Set default page when role loads
  useEffect(() => {
    if (role === "super_admin") {
      setPage("superadmin_dashboard");
    } else if (role === "group_admin") {
      setPage("dashboard");
    }
  }, [role]);

  // Fetch real-time pending count and notifications from Supabase
  useEffect(() => {
    if (!user || !role) return;

    let isMounted = true;

    async function loadData() {
      try {
        if (role === "super_admin") {
          // 1. Pending submissions count across platform
          const { count } = await supabase
            .from("payment_submissions")
            .select("*", { count: "exact", head: true })
            .eq("status", "submitted");

          if (isMounted) setPendingCount(count || 0);

          // 2. Recent submissions
          const { data: recSubmissions } = await supabase
            .from("payment_submissions")
            .select("id, group_id, amount_idr, status, created_at, group_member_id")
            .order("created_at", { ascending: false })
            .limit(8);

          // Maps for group and member names
          const { data: groups } = await supabase.from("groups").select("id, name");
          const groupMap: Record<string, string> = {};
          groups?.forEach((g) => {
            groupMap[g.id] = g.name;
          });

          const { data: members } = await supabase
            .from("group_members")
            .select("id, student_name, display_name");
          const memberMap: Record<string, string> = {};
          members?.forEach((m) => {
            memberMap[m.id] = m.student_name || m.display_name || "Siswa";
          });

          if (isMounted && recSubmissions) {
            const list: AdminNotification[] = recSubmissions.map((ps) => {
              const sName = memberMap[ps.group_member_id] || "Siswa";
              const gName = groupMap[ps.group_id] || "Grup";
              const isSub = ps.status === "submitted";
              return {
                id: ps.id,
                title: isSub
                  ? "Setoran Menunggu Verifikasi"
                  : `Setoran ${ps.status === "verified" ? "Terverifikasi" : "Ditolak"}`,
                message: `${sName} (${gName}) · Rp${Number(ps.amount_idr || 0).toLocaleString("id-ID")}`,
                time: getRelativeTimeIndonesian(ps.created_at),
                timestamp: new Date(ps.created_at).getTime(),
                unread: isSub && !readNotifIds.has(ps.id),
                targetPage: "superadmin_dashboard",
                type: "submission",
              };
            });
            setNotifications(list);
          }
        } else if (activeGroup?.group_id) {
          // Group Admin
          // 1. Pending count for active group
          const { count } = await supabase
            .from("payment_submissions")
            .select("*", { count: "exact", head: true })
            .eq("group_id", activeGroup.group_id)
            .eq("status", "submitted");

          if (isMounted) setPendingCount(count || 0);

          // 2. Group members map
          const { data: members } = await supabase
            .from("group_members")
            .select("id, student_name, display_name")
            .eq("group_id", activeGroup.group_id);

          const memberMap: Record<string, string> = {};
          members?.forEach((m) => {
            memberMap[m.id] = m.student_name || m.display_name || "Siswa";
          });

          // 3. Submissions
          const { data: subList } = await supabase
            .from("payment_submissions")
            .select("id, amount_idr, status, created_at, group_member_id")
            .eq("group_id", activeGroup.group_id)
            .order("created_at", { ascending: false })
            .limit(6);

          // 4. Expenses
          const { data: expList } = await supabase
            .from("expenses")
            .select("id, description, amount_idr, created_at, status")
            .eq("group_id", activeGroup.group_id)
            .order("created_at", { ascending: false })
            .limit(3);

          const list: AdminNotification[] = [];

          if (subList) {
            subList.forEach((ps) => {
              const sName = memberMap[ps.group_member_id] || "Siswa";
              const isSub = ps.status === "submitted";
              list.push({
                id: ps.id,
                title: isSub
                  ? "Setoran Menunggu Verifikasi"
                  : `Setoran ${ps.status === "verified" ? "Terverifikasi" : "Ditolak"}`,
                message: `${sName} kirim setoran Rp${Number(ps.amount_idr || 0).toLocaleString("id-ID")}`,
                time: getRelativeTimeIndonesian(ps.created_at),
                timestamp: new Date(ps.created_at).getTime(),
                unread: isSub && !readNotifIds.has(ps.id),
                targetPage: "verifikasi",
                type: "submission",
              });
            });
          }

          if (expList) {
            expList.forEach((ex) => {
              list.push({
                id: ex.id,
                title: ex.status === "voided" ? "Pengeluaran Dibatalkan" : "Pengeluaran Kas Baru",
                message: `${ex.description} · Rp${Number(ex.amount_idr || 0).toLocaleString("id-ID")}`,
                time: getRelativeTimeIndonesian(ex.created_at),
                timestamp: new Date(ex.created_at).getTime(),
                unread: !readNotifIds.has(ex.id),
                targetPage: "pengeluaran",
                type: "expense",
              });
            });
          }

          list.sort((a, b) => b.timestamp - a.timestamp);
          if (isMounted) setNotifications(list);
        }
      } catch (err) {
        console.warn("Notification error:", err);
      }
    }

    loadData();

    // Listen for custom read events from pages like Verifikasi
    const handleCustomNotifRead = (e: any) => {
      const notifId = e.detail?.id;
      if (notifId) {
        setReadNotifIds((prev) => new Set([...prev, notifId]));
      }
    };
    window.addEventListener("admin:notification_read", handleCustomNotifRead);

    // Supabase Realtime channel subscription
    const channel = supabase
      .channel("admin-notifications-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_submissions" },
        () => {
          loadData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      window.removeEventListener("admin:notification_read", handleCustomNotifRead);
      supabase.removeChannel(channel);
    };
  }, [user, role, activeGroup?.group_id, readNotifIds]);

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    const updated = new Set([...readNotifIds, ...allIds]);
    setReadNotifIds(updated);
    try {
      localStorage.setItem("admin_read_notifications", JSON.stringify(Array.from(updated)));
    } catch (e) {
      console.warn("Storage notice:", e);
    }
  };

  const markOneAsRead = (id: string) => {
    const updated = new Set(readNotifIds);
    updated.add(id);
    setReadNotifIds(updated);
    try {
      localStorage.setItem("admin_read_notifications", JSON.stringify(Array.from(updated)));
    } catch (e) {
      console.warn("Storage notice:", e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Ambient lighting glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative mb-5">
            <NabungBarengLogo size={84} primaryColor="#0F766E" className="drop-shadow-2xl animate-pulse" />
            <div className="absolute -inset-3 rounded-full border-2 border-teal-500/20 animate-spin" />
          </div>
          <h2 className="text-white font-extrabold text-xl tracking-tight">
            NabungBareng <span className="text-teal-400">Admin</span>
          </h2>
          <p className="text-slate-400 text-xs mt-1.5 font-medium">Memverifikasi sesi & otorisasi akun...</p>
        </div>
      </div>
    );
  }

  if (!user || !role) {
    return <Login />;
  }

  const navigate = (p: string) => setPage(p as Page);

  const unreadCount = notifications.filter((n) => n.unread).length;
  const isSuper = role === "super_admin";
  const managedGroups = adminInfo?.managed_groups || [];

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Desktop Sidebar wrapper */}
      <div
        className="relative flex-shrink-0 hidden lg:block h-full"
        style={{ width: collapsed ? 68 : 256, transition: "width 300ms ease-in-out" }}
      >
        <Sidebar
          active={page}
          onNavigate={navigate}
          mobileOpen={false}
          onClose={() => {}}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          pendingVerificationCount={pendingCount}
          onOpenProfile={() => setShowProfileModal(true)}
        />
        {/* Toggle button */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-[72px] z-30 w-6 h-6 bg-white border border-[#E2E8F0] rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        >
          {collapsed ? (
            <ChevronRight size={13} className="text-slate-500" />
          ) : (
            <ChevronLeft size={13} className="text-slate-500" />
          )}
        </button>
      </div>

      {/* Mobile Sidebar Drawer */}
      {mobileOpen && (
        <Sidebar
          active={page}
          onNavigate={navigate}
          mobileOpen={true}
          onClose={() => setMobileOpen(false)}
          collapsed={false}
          onToggleCollapse={() => {}}
          pendingVerificationCount={pendingCount}
          onOpenProfile={() => {
            setMobileOpen(false);
            setShowProfileModal(true);
          }}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 w-full">
        {/* Top Header */}
        <header className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3.5 bg-white border-b border-[#E2E8F0] flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
            <button
              className="lg:hidden p-1.5 sm:p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer flex-shrink-0"
              onClick={() => setMobileOpen(true)}
              title="Buka Menu"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-[15px] font-bold text-[#0F172A] truncate">{pageTitles[page] || page}</h2>
                {isSuper ? (
                  <span className="hidden md:inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                    <Crown size={11} /> Super Admin
                  </span>
                ) : (
                  <span className="hidden md:inline-flex items-center gap-1 bg-teal-50 text-teal-700 border border-teal-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                    <ShieldCheck size={11} /> Admin Group
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block truncate">
                {isSuper
                  ? "Sistem Global Platform NabungBareng"
                  : activeGroup
                  ? `${activeGroup.group_name} · ${activeGroup.school_name || "Grup Tabungan"}`
                  : "Portal Admin"}
              </p>
            </div>
          </div>

          {/* Right Header items */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Group Switcher for Group Admin with multiple groups */}
            {!isSuper && managedGroups.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowGroupDropdown(!showGroupDropdown)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-[#E2E8F0] rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                >
                  <Building2 size={14} className="text-teal-600 flex-shrink-0" />
                  <span className="max-w-[70px] sm:max-w-[140px] truncate">
                    {activeGroup?.group_name || "Pilih Grup"}
                  </span>
                  {managedGroups.length > 1 && <ChevronDown size={13} className="text-slate-400" />}
                </button>

                {showGroupDropdown && managedGroups.length > 1 && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowGroupDropdown(false)} />
                    <div className="absolute right-0 top-10 w-64 bg-white border border-[#E2E8F0] rounded-2xl shadow-xl z-30 p-2 space-y-1">
                      <p className="text-[11px] font-bold text-slate-400 px-3 py-1 uppercase tracking-wider">
                        Grup yang Anda Kelola
                      </p>
                      {managedGroups.map((g) => {
                        const isCurrent = activeGroup?.group_id === g.group_id;
                        return (
                          <button
                            key={g.group_id}
                            onClick={() => {
                              setActiveGroup(g);
                              setShowGroupDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                              isCurrent
                                ? "bg-teal-50 text-teal-800 font-bold"
                                : "text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate">{g.group_name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{g.school_name || "Umum"}</p>
                            </div>
                            {isCurrent && <CheckCircle2 size={14} className="text-teal-600 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Notification Bell */}
            <button
              onClick={() => setShowNotif(!showNotif)}
              className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-[#DC2626] text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-xs">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {showNotif && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowNotif(false)} />
                <div className="absolute right-2 sm:right-14 top-14 w-[calc(100vw-24px)] max-w-sm bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <p className="text-[13.5px] font-bold text-[#0F172A]">Notifikasi</p>
                      {unreadCount > 0 && (
                        <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {unreadCount} Baru
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCheck size={13} />
                          <span>Tandai Dibaca</span>
                        </button>
                      )}
                      <button
                        onClick={() => setShowNotif(false)}
                        className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 space-y-2">
                        <Inbox className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="font-bold text-xs text-slate-600">Belum Ada Notifikasi</p>
                        <p className="text-[11px] text-slate-400">
                          Semua aktivitas setoran dan mutasi kas akan muncul di sini.
                        </p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                            n.unread ? "bg-blue-50/40" : ""
                          }`}
                          onClick={() => {
                            markOneAsRead(n.id);
                            setShowNotif(false);
                            if (!isSuper) navigate(n.targetPage);
                          }}
                        >
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              n.type === "submission"
                                ? "bg-amber-50 text-amber-600"
                                : n.type === "expense"
                                ? "bg-red-50 text-red-600"
                                : "bg-blue-50 text-blue-600"
                            }`}
                          >
                            {n.type === "submission" && <ArrowUpRight size={15} />}
                            {n.type === "expense" && <Receipt size={15} />}
                            {n.type === "reconciliation" && <Scale size={15} />}
                            {n.type === "system" && <Clock size={15} />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-[12.5px] font-bold text-[#0F172A] leading-snug truncate">
                                {n.title}
                              </p>
                              {n.unread && (
                                <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-[11.5px] text-slate-600 leading-snug mt-0.5">
                              {n.message}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium mt-1">
                              {n.time}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Desktop Install Prompt for PC/Mac */}
            <DesktopInstallPrompt />

            {/* Quick Guide / Coachmark Button */}
            {!isSuper && (
              <button
                onClick={() => setShowCoachmark(true)}
                title="Panduan Interaktif Alur Bendahara"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 hover:text-teal-800 bg-slate-50 hover:bg-teal-50/80 border border-slate-200 hover:border-teal-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                <HelpCircle size={14} className="text-[#0F766E]" />
                <span>Panduan</span>
              </button>
            )}

            {/* User Profile Avatar */}
            <button
              data-coachmark="header-profile"
              onClick={() => setShowProfileModal(true)}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center cursor-pointer hover:opacity-90 hover:ring-2 hover:ring-teal-500/40 transition-all ${
                isSuper ? "bg-amber-600" : "bg-[#0F766E]"
              }`}
              title={`Buka Profil: ${adminInfo?.display_name || "Admin"} (${isSuper ? "Super Admin" : "Admin Group"})`}
            >
              <span className="text-[11px] sm:text-xs font-bold text-white">
                {(adminInfo?.display_name || user?.email || "AD")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
            </button>
          </div>
        </header>

        {/* Page Content View */}
        <main className="flex-1 overflow-y-auto">
          {isSuper ? (
            <>
              {page === "superadmin_dashboard" && <SuperAdminGroups onNavigate={navigate} />}
              {page === "superadmin_admins" && <SuperAdminAdmins onNavigate={navigate} />}
              {page === "superadmin_storage" && <SuperAdminStorage />}
              {page === "superadmin_ai" && <SuperAdminAIConfigs />}
            </>
          ) : (
            <>
              {page === "dashboard" && <Dashboard onNavigate={navigate} />}
              {page === "verifikasi" && <Verifikasi />}
              {page === "siswa" && <SiswaSaldo />}
              {page === "pengeluaran" && <Pengeluaran />}
              {page === "rekonsiliasi" && <Rekonsiliasi />}
              {page === "laporan" && <Laporan />}
              {page === "pengaturan" && <Pengaturan />}
            </>
          )}
        </main>
      </div>

      {/* Profile & Settings Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onStartTour={() => setShowCoachmark(true)}
      />

      {/* Interactive Coachmark Onboarding Tour */}
      <AdminCoachmark
        isOpen={showCoachmark}
        onClose={() => setShowCoachmark(false)}
        onNavigate={(targetPage) => setPage(targetPage as Page)}
      />

      {/* PWA / App Version Update Banner */}
      <PwaUpdateBanner />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
