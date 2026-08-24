import React, { useState, useEffect } from "react";
import {
  Shield,
  Mail,
  Trash2,
  Plus,
  CheckCircle,
  AlertTriangle,
  Crown,
  Copy,
  Check,
  RefreshCw,
  Search,
  UserPlus,
  MessageSquare,
  Sparkles,
  Users,
  Calendar,
  X,
  Building2,
  UploadCloud,
  Image as ImageIcon,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

interface InvitationItem {
  id: string;
  group_id: string;
  email: string;
  invite_code: string;
  student_name: string;
  role: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  invited_by: string | null;
}

interface GroupAdminMember {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  role: string;
  created_at: string;
}

export default function Pengaturan() {
  const { activeGroup, role, refreshSession } = useAuth();

  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [admins, setAdmins] = useState<GroupAdminMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("semua");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Group Financial & Logo Settings State
  const [monthlyTarget, setMonthlyTarget] = useState<number>(activeGroup?.monthly_target_idr || 50000);
  const [startMonth, setStartMonth] = useState<string>(activeGroup?.start_month || "2026-08");
  const [schoolName, setSchoolName] = useState<string>(activeGroup?.school_name || "");
  const [logoUrl, setLogoUrl] = useState<string | null>(activeGroup?.logo_url || null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (activeGroup) {
      setMonthlyTarget(activeGroup.monthly_target_idr || 50000);
      setStartMonth(activeGroup.start_month || "2026-08");
      setSchoolName(activeGroup.school_name || "");
      setLogoUrl(activeGroup.logo_url || null);
      setLogoFile(null);
      setLogoPreview(null);
    }
  }, [activeGroup]);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        showToast("error", "Ukuran logo maksimal 2 MB.");
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveGroupSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup?.group_id) return;
    setIsSavingSettings(true);
    try {
      let finalLogoUrl = logoUrl;

      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop() || "png";
        const filePath = `groups/${activeGroup.group_id}/logo-${Date.now()}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from("group-logos")
          .upload(filePath, logoFile, { contentType: logoFile.type, upsert: true });

        if (uploadErr) throw uploadErr;

        const { data: publicData } = supabase.storage.from("group-logos").getPublicUrl(filePath);
        finalLogoUrl = publicData.publicUrl;
      }

      const { error } = await supabase.rpc("update_group_settings", {
        p_group_id: activeGroup.group_id,
        p_monthly_target_idr: monthlyTarget,
        p_start_month: startMonth,
        p_school_name: schoolName.trim() || undefined,
        p_group_name: activeGroup.group_name || undefined,
        p_logo_url: finalLogoUrl || undefined,
      });
      if (error) throw error;
      showToast("success", "Pengaturan grup & logo berhasil disimpan!");
      setLogoUrl(finalLogoUrl);
      setLogoFile(null);
      setLogoPreview(null);
      await refreshSession();
    } catch (err: any) {
      console.error("Error updating group settings:", err);
      showToast("error", err.message || "Gagal menyimpan pengaturan grup.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Form State for creating invitation
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "treasurer">("member");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success Modal with Generated Code
  const [createdInvitation, setCreatedInvitation] = useState<InvitationItem | null>(null);

  // Copy feedbacks
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [copiedWAMsg, setCopiedWAMsg] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    if (!activeGroup?.group_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch invitations using RPC
      const { data: invData, error: invError } = await supabase.rpc("get_group_invitations", {
        p_group_id: activeGroup.group_id,
      });

      if (invError) throw invError;
      setInvitations((invData as InvitationItem[]) || []);

      // 2. Fetch group admins / treasurers
      const { data: adminData, error: adminError } = await supabase
        .from("group_members")
        .select(`
          id,
          user_id,
          display_name,
          role,
          created_at,
          profiles (
            email
          )
        `)
        .eq("group_id", activeGroup.group_id)
        .in("role", ["group_admin", "treasurer"])
        .order("role", { ascending: true });

      if (adminError) throw adminError;

      if (adminData) {
        const formattedAdmins: GroupAdminMember[] = adminData.map((m: any) => ({
          id: m.id,
          user_id: m.user_id,
          display_name: m.display_name || "Admin",
          email: m.profiles?.email || "-",
          role: m.role,
          created_at: m.created_at,
        }));
        setAdmins(formattedAdmins);
      }
    } catch (err: any) {
      console.error("Error loading group settings data:", err);
      showToast("error", err.message || "Gagal memuat data undangan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeGroup?.group_id]);

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup?.group_id || !studentName.trim() || !parentEmail.trim()) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("create_group_invitation", {
        p_group_id: activeGroup.group_id,
        p_email: parentEmail.trim(),
        p_student_name: studentName.trim(),
        p_role: inviteRole,
      });

      if (error) throw error;

      const newInv = data as InvitationItem;
      setCreatedInvitation(newInv);
      setShowCreateModal(false);
      setStudentName("");
      setParentEmail("");
      setInviteRole("member");

      showToast("success", `Kode undangan ${newInv.invite_code} berhasil dibuat!`);
      loadData();
    } catch (err: any) {
      showToast("error", err.message || "Gagal membuat undangan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!confirm("Apakah Anda yakin ingin membatalkan kode undangan ini?")) return;

    try {
      const { data, error } = await supabase.rpc("revoke_group_invitation", {
        p_invitation_id: invitationId,
      });

      if (error) throw error;

      showToast("success", "Undangan berhasil dibatalkan.");
      loadData();
    } catch (err: any) {
      showToast("error", err.message || "Gagal membatalkan undangan.");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const copyWAMessage = (inv: InvitationItem) => {
    const groupName = activeGroup?.group_name || "Grup Tabungan";
    const msg = `Halo Ayah/Bunda ${inv.student_name},\n\nBerikut adalah kode undangan untuk bergabung ke grup tabungan kelas NabungBareng:\n📌 Kelas: *${groupName}*\n👶 Nama Siswa: *${inv.student_name}*\n🔑 Kode Undangan: *${inv.invite_code}*\n\nSilakan buka aplikasi NabungBareng Member dan masukkan kode di atas untuk mulai memantau tabungan. Terima kasih! 🙏`;

    navigator.clipboard.writeText(msg);
    setCopiedWAMsg(true);
    showToast("success", "Format pesan WhatsApp berhasil disalin!");
    setTimeout(() => setCopiedWAMsg(false), 2500);
  };

  const filteredInvitations = invitations.filter((inv) => {
    const matchSearch =
      inv.student_name.toLowerCase().includes(search.toLowerCase()) ||
      inv.email.toLowerCase().includes(search.toLowerCase()) ||
      inv.invite_code.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === "semua" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filteredInvitations.length / pageSize) || 1;
  const paginatedInvitations = filteredInvitations.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, pageSize]);

  const getStatusBadge = (status: InvitationItem["status"]) => {
    switch (status) {
      case "accepted":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-0.5 rounded-full">
            <CheckCircle size={11} /> Sudah Digunakan
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full">
            <Sparkles size={11} /> Menunggu / Aktif
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-0.5 rounded-full">
            Kedaluwarsa
          </span>
        );
      case "revoked":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-red-50 text-red-600 border border-red-200 px-2.5 py-0.5 rounded-full">
            Dibatalkan
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Toast */}
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0F172A] p-4 sm:p-6 rounded-2xl sm:rounded-3xl text-white shadow-xl border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold px-2.5 py-0.5 rounded-full">
              <Building2 size={12} /> {activeGroup?.group_name || "Grup Aktif"}
            </span>
            <span className="text-xs text-slate-400">{activeGroup?.school_name || "Tabungan Kelas"}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Manajemen Undangan &amp; Akses</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Buat kode join 6-digit untuk wali murid baru &amp; kelola wewenang bendahara kelas
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-teal-900/30 transition-all cursor-pointer"
          >
            <Plus size={16} /> Buat Undangan Baru
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 bg-teal-50 text-teal-700 rounded-xl flex items-center justify-center font-bold">
            <UserPlus size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Undangan</p>
            <p className="text-xl font-extrabold text-[#0F172A]">{invitations.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center font-bold">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Menunggu Join</p>
            <p className="text-xl font-extrabold text-amber-600">
              {invitations.filter((i) => i.status === "pending").length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
            <CheckCircle size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sudah Bergabung</p>
            <p className="text-xl font-extrabold text-emerald-600">
              {invitations.filter((i) => i.status === "accepted").length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center font-bold">
            <Shield size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Admin &amp; Bendahara</p>
            <p className="text-xl font-extrabold text-blue-700">{admins.length}</p>
          </div>
        </div>
      </div>

      {/* Group Financial & Start Month Configuration Section */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-50 text-[#0F766E] rounded-xl flex items-center justify-center font-bold">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Pengaturan Parameter Tabungan &amp; Mulai Iuran</h2>
              <p className="text-xs text-slate-400">
                Atur target iuran bulanan dan bulan awal perhitungan kewajiban tabungan bagi anggota
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveGroupSettings} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Target Iuran Bulanan (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                Rp
              </span>
              <input
                type="number"
                min="1000"
                step="1000"
                value={monthlyTarget}
                onChange={(e) => setMonthlyTarget(Number(e.target.value) || 0)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-[#E2E8F0] rounded-xl text-sm font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Nominal iuran standar per anggota per bulan</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Bulan Mulai Tabungan (Start Month)
            </label>
            <input
              type="month"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">Bulan awal perhitungan tagihan iuran</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nama Instansi / Komunitas (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: SDN 1 Nusantara / Komite Warga"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">Ditampilkan pada laporan dan kartu iuran anggota</p>
          </div>

          {/* Logo Upload Section */}
          <div className="sm:col-span-3 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Logo Group / Lembaga (Opsional)
            </label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-2xs">
                {logoPreview || logoUrl ? (
                  <img
                    src={logoPreview || logoUrl || ""}
                    alt="Logo Group"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 size={24} className="text-slate-400" />
                )}
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors border border-slate-200 flex items-center gap-1.5">
                    <UploadCloud size={14} />
                    <span>{logoPreview || logoUrl ? "Ganti Logo" : "Upload Logo"}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                  </label>
                  {(logoPreview || logoUrl) && (
                    <button
                      type="button"
                      onClick={() => {
                        setLogoFile(null);
                        setLogoPreview(null);
                        setLogoUrl(null);
                      }}
                      className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-xl transition-colors border border-red-200 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Format: PNG, JPG, WebP, SVG (Maks. 2MB). Ditampilkan pada kop kartu iuran siswa, beranda member, dan laporan.
                </p>
              </div>
            </div>
          </div>

          <div className="sm:col-span-3 flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingSettings}
              className="px-6 py-2.5 bg-[#0F766E] hover:bg-teal-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-teal-900/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <CheckCircle size={15} />
              <span>{isSavingSettings ? "Menyimpan..." : "Simpan Pengaturan Grup"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Main Section: Invitations List */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        {/* Table Header Controls */}
        <div className="p-5 border-b border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">Daftar Kode Undangan Grup</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Kode 6-digit yang dapat dimasukkan wali murid pada aplikasi NabungBareng Member
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
              {[
                { id: "semua", label: "Semua" },
                { id: "pending", label: "Menunggu" },
                { id: "accepted", label: "Digunakan" },
                { id: "revoked", label: "Batal" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === tab.id
                      ? "bg-white text-[#0F172A] shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-60">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari siswa/kode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Invitations Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-slate-400 text-xs uppercase font-bold tracking-wider">
                <th className="px-6 py-3.5">Nama Siswa</th>
                <th className="px-6 py-3.5">Email Wali Murid</th>
                <th className="px-6 py-3.5">Kode Undangan (6-Digit)</th>
                <th className="px-6 py-3.5">Peran</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Tanggal</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Memuat daftar kode undangan...
                  </td>
                </tr>
              ) : filteredInvitations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <UserPlus size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">Belum ada undangan pada grup ini</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Klik tombol &quot;Buat Undangan Baru&quot; di atas untuk membuat kode join 6 digit.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedInvitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-[#0F172A] flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#0F172A] text-white rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {inv.student_name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-[#0F172A]">{inv.student_name}</span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-600">{inv.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-slate-900 text-teal-400 font-mono font-black text-xs rounded-lg tracking-widest border border-slate-800 shadow-inner">
                          {inv.invite_code}
                        </span>
                        <button
                          onClick={() => copyToClipboard(inv.invite_code, inv.id)}
                          title="Salin Kode"
                          className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                        >
                          {copiedCodeId === inv.id ? (
                            <Check size={14} className="text-teal-600" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-700">
                        {inv.role === "member" ? "Wali Murid" : "Bendahara Bantu"}
                      </span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(inv.status)}</td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} className="text-slate-300" />
                        {new Date(inv.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* WA Share button */}
                        <button
                          onClick={() => copyWAMessage(inv)}
                          title="Salin Pesan WhatsApp"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <MessageSquare size={13} />
                          <span className="hidden sm:inline">Pesan WA</span>
                        </button>

                        {/* Revoke button if still pending */}
                        {inv.status === "pending" && (
                          <button
                            onClick={() => handleRevokeInvitation(inv.id)}
                            title="Batalkan Undangan"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredInvitations.length > 0 && (
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
              <span>per halaman · Menampilkan {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredInvitations.length)} dari {filteredInvitations.length} undangan</span>
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

      {/* Admin & Bendahara Aktif Section */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#0F172A]">Daftar Pengelola Grup (Admin &amp; Bendahara)</h2>
            <p className="text-xs text-slate-400">Pengguna yang memiliki hak verifikasi setoran &amp; catat kas di grup ini</p>
          </div>
          <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
            {admins.length} Pengelola
          </span>
        </div>

        <div className="divide-y divide-[#E2E8F0]">
          {admins.map((adm) => (
            <div key={adm.id} className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-xs">
                  {adm.display_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-[#0F172A]">{adm.display_name}</p>
                    {adm.role === "group_admin" && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        <Crown size={10} /> Admin Utama
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-mono">{adm.email}</p>
                </div>
              </div>

              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  adm.role === "group_admin"
                    ? "bg-teal-50 text-teal-700 border border-teal-200"
                    : "bg-blue-50 text-blue-700 border border-blue-200"
                }`}
              >
                {adm.role === "group_admin" ? "Admin Group" : "Bendahara"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Buat Undangan Baru */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-fadeIn border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-50 text-teal-700 rounded-2xl flex items-center justify-center">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#0F172A]">Buat Undangan Baru</h3>
                  <p className="text-xs text-slate-400">Generate kode join 6-digit untuk wali murid</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInvitation} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Siswa / Anak <span className="text-teal-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Aditya Pratama / Dewi Kusuma"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Nama anak yang akan dicatat di buku tabungan kelas.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Wali Murid / Orang Tua <span className="text-teal-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="orangtua.aditya@gmail.com"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Email yang digunakan wali murid saat login ke aplikasi Member.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Peran / Akses
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "member" | "treasurer")}
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white cursor-pointer"
                >
                  <option value="member">Wali Murid (Hanya lihat tabungan anak)</option>
                  <option value="treasurer">Bendahara Bantu (Bisa verifikasi setoran)</option>
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
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-[#0F766E] hover:bg-teal-600 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-teal-900/20"
                >
                  {isSubmitting ? "Membuat Kode..." : "Generate Kode"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tampilan Sukses Kode Undangan yang baru dibuat */}
      {createdInvitation && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-fadeIn border border-slate-100 text-center p-6 space-y-5">
            <div className="w-16 h-16 bg-teal-50 text-teal-700 rounded-3xl flex items-center justify-center mx-auto">
              <Sparkles size={32} />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-[#0F172A]">Kode Undangan Berhasil Dibuat!</h3>
              <p className="text-xs text-slate-500">
                Berikan kode ini kepada wali murid untuk dimasukkan di aplikasi NabungBareng Member.
              </p>
            </div>

            {/* Big Code Card */}
            <div className="p-5 bg-slate-900 rounded-2xl text-white space-y-2 border border-slate-800 shadow-inner">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">
                Kode Join 6-Digit
              </p>
              <p className="text-3xl font-black font-mono tracking-widest text-teal-400">
                {createdInvitation.invite_code}
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  onClick={() => copyToClipboard(createdInvitation.invite_code, "modal")}
                  className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  {copiedCodeId === "modal" ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedCodeId === "modal" ? "Tersalin!" : "Salin Kode"}</span>
                </button>
              </div>
            </div>

            {/* Target details */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-1">
              <p className="text-slate-500">
                <strong className="text-slate-700">Nama Siswa:</strong> {createdInvitation.student_name}
              </p>
              <p className="text-slate-500">
                <strong className="text-slate-700">Email Terdaftar:</strong> {createdInvitation.email}
              </p>
              <p className="text-slate-500">
                <strong className="text-slate-700">Masa Berlaku:</strong> 30 Hari
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => copyWAMessage(createdInvitation)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-900/20 cursor-pointer"
              >
                <MessageSquare size={16} />
                <span>{copiedWAMsg ? "Format Pesan WA Tersalin!" : "Salin Pesan Format WhatsApp"}</span>
              </button>

              <button
                onClick={() => setCreatedInvitation(null)}
                className="w-full py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
