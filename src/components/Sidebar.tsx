import React from "react";
import {
  LayoutDashboard,
  CheckCircle,
  Users,
  Receipt,
  Scale,
  FileBarChart2,
  Settings,
  PiggyBank,
  LogOut,
  Building2,
  Crown,
  ShieldCheck,
  UserPlus,
  HardDrive,
  Server,
  Bot,
  X,
  ChevronRight,
} from "lucide-react";
import NabungBarengLogo from "./NabungBarengLogo";
import { useAuth } from "../context/AuthContext";

export type Page =
  | "dashboard"
  | "verifikasi"
  | "siswa"
  | "pengeluaran"
  | "rekonsiliasi"
  | "laporan"
  | "pengaturan"
  | "superadmin_dashboard"
  | "superadmin_admins"
  | "superadmin_storage"
  | "superadmin_ai";

interface SidebarProps {
  active: Page;
  onNavigate: (page: Page) => void;
  mobileOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  pendingVerificationCount?: number;
  onOpenProfile?: () => void;
}

export default function Sidebar({
  active,
  onNavigate,
  mobileOpen,
  onClose,
  collapsed,
  onToggleCollapse,
  pendingVerificationCount = 0,
  onOpenProfile,
}: SidebarProps) {
  const { role, adminInfo, activeGroup, logout } = useAuth();
  const w = collapsed ? "w-[68px]" : "w-72 lg:w-64";

  const isSuper = role === "super_admin";

  const groupAdminNav = [
    { page: "dashboard" as Page, label: "Dashboard", icon: LayoutDashboard },
    {
      page: "verifikasi" as Page,
      label: "Verifikasi Setoran",
      icon: CheckCircle,
      badge: pendingVerificationCount > 0 ? pendingVerificationCount : undefined,
    },
    { page: "siswa" as Page, label: "Member & Saldo", icon: Users },
    { page: "pengeluaran" as Page, label: "Pengeluaran", icon: Receipt },
    { page: "rekonsiliasi" as Page, label: "Rekonsiliasi", icon: Scale },
    { page: "laporan" as Page, label: "Laporan & Ekspor", icon: FileBarChart2 },
  ];

  const superAdminNav = [
    { page: "superadmin_dashboard" as Page, label: "Grup & Sekolah", icon: Building2 },
    { page: "superadmin_admins" as Page, label: "Kelola Admin Group", icon: Users },
    { page: "superadmin_storage" as Page, label: "Storage & Database", icon: Server },
    { page: "superadmin_ai" as Page, label: "Pengaturan AI API", icon: Bot },
  ];

  const currentNav = isSuper ? superAdminNav : groupAdminNav;

  const initials = (adminInfo?.display_name || "AD")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          flex flex-col bg-[#0F172A] text-white
          ${
            mobileOpen
              ? "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-2xl animate-in slide-in-from-left duration-200"
              : "w-full h-full"
          }
        `}
      >
        {/* Logo & Brand Header */}
        <div
          className={`flex items-center justify-between border-b border-white/10 flex-shrink-0 ${
            collapsed ? "justify-center px-0 py-5" : "gap-3 px-5 py-5"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {isSuper ? (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-600 shadow-md shadow-amber-900/40">
                <Crown size={18} className="text-white" />
              </div>
            ) : activeGroup?.logo_url ? (
              <img
                src={activeGroup.logo_url}
                alt={activeGroup.group_name}
                className="w-10 h-10 rounded-xl object-cover border border-white/20 shadow-xs flex-shrink-0 bg-white"
              />
            ) : (
              <NabungBarengLogo size={50} primaryColor="#0F766E" className="flex-shrink-0 drop-shadow-sm" />
            )}
            {!collapsed && (
              <div className="min-w-0 overflow-hidden">
                <p className="text-[13px] font-bold text-white leading-tight whitespace-nowrap">
                  {isSuper ? "Super Admin" : "NabungBareng"}
                </p>
                <p className="text-[11px] text-slate-400 whitespace-nowrap truncate">
                  {isSuper
                    ? "Platform Control"
                    : activeGroup
                    ? activeGroup.group_name
                    : "Admin Group"}
                </p>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          {mobileOpen && !collapsed && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="Tutup Menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation items */}
        <nav className={`flex-1 py-4 space-y-0.5 overflow-y-auto scrollbar-hide ${collapsed ? "px-2" : "px-3"}`}>
          {!collapsed && (
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 mb-3">
              {isSuper ? "Manajemen Platform" : "Menu Utama"}
            </p>
          )}
          {collapsed && <div className="mb-3" />}

          {currentNav.map(({ page, label, icon: Icon, badge }: any) => {
            const isActive = active === page;
            return (
              <div key={page} className="relative group/item">
                <button
                  data-coachmark={`nav-${page}`}
                  onClick={() => {
                    onNavigate(page);
                    onClose();
                  }}
                  title={collapsed ? label : undefined}
                  className={`
                    w-full flex items-center rounded-xl text-left
                    transition-all duration-150 cursor-pointer
                    ${collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"}
                    ${
                      isActive
                        ? isSuper
                          ? "bg-amber-600 text-white font-bold"
                          : "bg-[#0F766E] text-white font-bold"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }
                  `}
                >
                  <Icon size={17} className="flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="text-[13.5px] font-medium flex-1 whitespace-nowrap overflow-hidden">
                        {label}
                      </span>
                      {badge !== undefined && (
                        <span
                          className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                            isActive ? "bg-white/20 text-white" : "bg-amber-500 text-white"
                          }`}
                        >
                          {badge}
                        </span>
                      )}
                    </>
                  )}
                  {collapsed && badge !== undefined && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />
                  )}
                </button>

                {/* Tooltip when collapsed */}
                {collapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 pointer-events-none opacity-0 group-hover/item:opacity-100 transition-opacity duration-150">
                    <div className="bg-[#0F172A] border border-white/10 text-white text-[12px] font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl flex items-center gap-2">
                      {label}
                      {badge !== undefined && (
                        <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {badge}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Group Admin Configuration section */}
          {!isSuper && (
            <div className="pt-4 mt-2 border-t border-white/10">
              {!collapsed && (
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 mb-3">
                  Konfigurasi Grup
                </p>
              )}
              {collapsed && <div className="mb-3" />}

              <div className="relative group/item">
                <button
                  data-coachmark="nav-pengaturan"
                  onClick={() => {
                    onNavigate("pengaturan");
                    onClose();
                  }}
                  title={collapsed ? "Undangan & Akses" : undefined}
                  className={`
                    w-full flex items-center rounded-xl text-left
                    transition-all duration-150 cursor-pointer
                    ${collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"}
                    ${
                      active === "pengaturan"
                        ? "bg-[#0F766E] text-white font-bold"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }
                  `}
                >
                  <UserPlus size={17} className="flex-shrink-0" />
                  {!collapsed && (
                    <span className="text-[13.5px] font-medium whitespace-nowrap">
                      Undangan &amp; Akses
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
        </nav>

        {/* User profile & Settings footer */}
        <div className={`border-t border-white/10 flex-shrink-0 ${collapsed ? "px-2 py-3" : "px-3 py-3"}`}>
          {collapsed ? (
            <div className="flex flex-col items-center">
              <button
                onClick={() => onOpenProfile?.()}
                title={`Profil: ${adminInfo?.display_name || "Admin"}`}
                className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer hover:opacity-90 hover:ring-2 hover:ring-teal-400/40 transition-all ${
                  isSuper ? "bg-amber-600" : "bg-[#0F766E]"
                }`}
              >
                <span className="text-[12px] font-bold text-white">{initials}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => onOpenProfile?.()}
              className="w-full text-left flex items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform ${
                  isSuper ? "bg-amber-600" : "bg-[#0F766E]"
                }`}
              >
                <span className="text-[11px] font-bold text-white">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-bold text-white truncate group-hover:text-teal-200 transition-colors">
                  {adminInfo?.display_name || "Admin"}
                </p>
                <p className="text-[10px] text-teal-400 font-medium truncate flex items-center gap-1">
                  {isSuper ? (
                    <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                      <Crown size={10} /> Super Admin
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5">
                      <ShieldCheck size={10} /> Admin Group
                    </span>
                  )}
                </p>
              </div>
              <ChevronRight size={14} className="text-slate-500 group-hover:text-white transition-colors flex-shrink-0" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
