import React, { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  KeyRound,
  ShieldCheck,
  Building2,
  Lock,
  Eye,
  EyeOff,
  Crown,
  Calendar,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

interface GroupOption {
  id: string;
  name: string;
  school_name: string | null;
}

interface GroupAdminUser {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  group_id: string;
  group_name: string;
  school_name: string | null;
  role: string;
  created_at: string;
}

interface SuperAdminAdminsProps {
  onNavigate?: (page: string) => void;
}

export default function SuperAdminAdmins({ onNavigate }: SuperAdminAdminsProps) {
  const [adminUsers, setAdminUsers] = useState<GroupAdminUser[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal: Create Admin
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminDisplayName, setAdminDisplayName] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [adminRole, setAdminRole] = useState<"group_admin" | "treasurer">("group_admin");

  // Modal: Reset Password
  const [selectedAdminForReset, setSelectedAdminForReset] = useState<GroupAdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordText, setShowPasswordText] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch groups for dropdown
      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select("id, name, school_name")
        .order("name", { ascending: true });

      if (groupsError) throw groupsError;
      setGroups(groupsData || []);
      if (groupsData && groupsData.length > 0 && !selectedGroupId) {
        setSelectedGroupId(groupsData[0].id);
      }

      // 2. Fetch all group admin users
      const { data: membersData, error: membersError } = await supabase
        .from("group_members")
        .select(`
          id,
          user_id,
          display_name,
          role,
          created_at,
          group_id,
          groups (
            name,
            school_name
          ),
          profiles (
            email
          )
        `)
        .in("role", ["group_admin", "treasurer"])
        .order("created_at", { ascending: false });

      if (membersError) throw membersError;

      if (membersData) {
        const formatted: GroupAdminUser[] = membersData.map((m: any) => ({
          id: m.id,
          user_id: m.user_id,
          display_name: m.display_name || "Admin",
          email: m.profiles?.email || "-",
          group_id: m.group_id,
          group_name: m.groups?.name || "Grup",
          school_name: m.groups?.school_name || null,
          role: m.role,
          created_at: m.created_at,
        }));
        setAdminUsers(formatted);
      }
    } catch (err: any) {
      console.error("Error loading admin users:", err);
      showToast("error", err.message || "Gagal memuat data admin group.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminPassword || !selectedGroupId) return;

    if (adminPassword.length < 6) {
      showToast("error", "Kata sandi minimal 6 karakter.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("admin_create_group_admin", {
        p_email: adminEmail.trim(),
        p_password: adminPassword,
        p_display_name: adminDisplayName.trim() || adminEmail.split("@")[0],
        p_group_id: selectedGroupId,
        p_role: adminRole,
      });

      if (error) throw error;

      showToast("success", `Akun Admin Group untuk ${adminEmail} berhasil dibuat!`);
      setShowCreateModal(false);
      setAdminEmail("");
      setAdminPassword("");
      setAdminDisplayName("");
      loadData();
    } catch (err: any) {
      showToast("error", err.message || "Gagal membuat akun Admin Group.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdminForReset) return;

    if (!newPassword || newPassword.length < 6) {
      showToast("error", "Kata sandi baru minimal 6 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("error", "Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("admin_reset_user_password", {
        p_target_user_id: selectedAdminForReset.user_id,
        p_new_password: newPassword,
      });

      if (error) throw error;

      showToast("success", `Kata sandi untuk ${selectedAdminForReset.display_name} (${selectedAdminForReset.email}) berhasil direset!`);
      setSelectedAdminForReset(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      showToast("error", err.message || "Gagal mereset kata sandi.");
    } finally {
      setSubmitting(false);
    }
  };

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = adminUsers.filter(
    (a) =>
      a.display_name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.group_name.toLowerCase().includes(search.toLowerCase()) ||
      (a.school_name && a.school_name.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedAdmins = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
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

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0F172A] p-4 sm:p-6 rounded-2xl sm:rounded-3xl text-white shadow-xl border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold px-2.5 py-0.5 rounded-full">
              <ShieldCheck size={12} /> User Access Control
            </span>
            <span className="text-xs text-slate-400">Pengelola Grup</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Kelola User Admin Group</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Daftar administrator dan bendahara yang bertugas di setiap grup tabungan (termasuk reset password)
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-900/30 transition-all cursor-pointer"
          >
            <UserPlus size={16} /> Tambah Admin Group
          </button>
          <button
            onClick={loadData}
            title="Refresh Data"
            className="p-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Admin Group</p>
            <p className="text-2xl font-extrabold text-[#0F172A] mt-0.5">{adminUsers.length}</p>
            <p className="text-xs text-blue-600 font-medium mt-0.5">Admin &amp; Bendahara aktif</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-50 text-teal-700 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Grup Terdistribusi</p>
            <p className="text-2xl font-extrabold text-[#0F172A] mt-0.5">
              {new Set(adminUsers.map((a) => a.group_id)).size}
            </p>
            <p className="text-xs text-teal-600 font-medium mt-0.5">Grup yang sudah memiliki admin</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center flex-shrink-0">
            <KeyRound size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Manajemen Keamanan</p>
            <p className="text-sm font-bold text-[#0F172A] mt-0.5">Reset Password Kapan Saja</p>
            <p className="text-xs text-amber-600 font-medium mt-0.5">Klik tombol reset pada baris tabel</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-[#E2E8F0]">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama admin, email, atau nama grup..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>
        <p className="text-xs font-semibold text-slate-400 pr-2">
          Menampilkan {filtered.length} dari {adminUsers.length} admin
        </p>
      </div>

      {/* Admin Users Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-slate-400 text-xs uppercase font-bold tracking-wider">
                <th className="px-6 py-4">Nama Admin</th>
                <th className="px-6 py-4">Email Login</th>
                <th className="px-6 py-4">Grup yang Dikelola</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Terdaftar</th>
                <th className="px-6 py-4 text-right">Aksi Super Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Memuat data admin group...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Tidak ada Admin Group yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                paginatedAdmins.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-[#0F172A] flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs">
                        {a.display_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="leading-tight font-bold text-[#0F172A]">{a.display_name}</p>
                        <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded font-medium border border-teal-200/60">
                          Aktif
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                      {a.email}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#0F172A]">{a.group_name}</p>
                      {a.school_name && (
                        <p className="text-xs text-slate-400 mt-0.5">{a.school_name}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                        {a.role === "group_admin" ? "Admin Group" : "Bendahara"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} className="text-slate-300" />
                        {new Date(a.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedAdminForReset(a);
                          setNewPassword("");
                          setConfirmPassword("");
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300/80 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
                      >
                        <KeyRound size={13} />
                        <span>Reset Password</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filtered.length > 0 && (
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
              <span>per halaman · Menampilkan {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filtered.length)} dari {filtered.length} admin</span>
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

      {/* Modal: Reset Password */}
      {selectedAdminForReset && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-fadeIn border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#0F172A]">Reset Password Admin</h3>
                  <p className="text-xs text-slate-400">Atur ulang kata sandi login admin group</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAdminForReset(null)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              {/* Target info card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Target Akun</p>
                <p className="text-sm font-bold text-[#0F172A]">{selectedAdminForReset.display_name}</p>
                <p className="text-xs text-slate-500 font-mono">{selectedAdminForReset.email}</p>
                <p className="text-xs text-teal-700 font-medium pt-1">
                  Grup: {selectedAdminForReset.group_name}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kata Sandi Baru <span className="text-teal-600">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={15} />
                  </div>
                  <input
                    type={showPasswordText ? "text" : "password"}
                    required
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPasswordText ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Konfirmasi Kata Sandi Baru <span className="text-teal-600">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={15} />
                  </div>
                  <input
                    type={showPasswordText ? "text" : "password"}
                    required
                    placeholder="Ketik ulang kata sandi baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedAdminForReset(null)}
                  className="flex-1 py-2.5 border border-[#E2E8F0] rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-amber-900/20"
                >
                  {submitting ? "Menyimpan..." : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tambah Admin Group Baru */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-fadeIn border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#0F172A]">Tambah Admin Group Baru</h3>
                  <p className="text-xs text-slate-400">Buat akun login &amp; berikan wewenang pada grup tertentu</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pilih Group yang Dikelola <span className="text-teal-600">*</span>
                </label>
                <select
                  required
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
                >
                  <option value="" disabled>-- Pilih Group --</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.school_name || "Umum"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Lengkap Admin / Bendahara <span className="text-teal-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bu Rini Kartika"
                  value={adminDisplayName}
                  onChange={(e) => setAdminDisplayName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Login <span className="text-teal-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin.kelas4b@sekolah.sch.id"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kata Sandi Sementara <span className="text-teal-600">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimal 6 karakter"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Wewenang Role
                </label>
                <select
                  value={adminRole}
                  onChange={(e) => setAdminRole(e.target.value as "group_admin" | "treasurer")}
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
                >
                  <option value="group_admin">Admin Group (Wewenang Penuh Grup)</option>
                  <option value="treasurer">Bendahara (Verifikasi &amp; Keuangan)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 border border-[#E2E8F0] rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-900/20"
                >
                  {submitting ? "Membuat Akun..." : "Simpan Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
