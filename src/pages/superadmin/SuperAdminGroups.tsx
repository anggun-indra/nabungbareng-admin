import React, { useEffect, useState } from "react";
import {
  Building2,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Crown,
  School,
  Calendar,
  Layers,
  ArrowUpRight,
  UploadCloud,
  Edit3,
  Trash2,
  Users,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

interface GroupItem {
  id: string;
  name: string;
  school_name: string | null;
  public_slug: string | null;
  monthly_target_idr: number;
  public_report_enabled: boolean;
  status: string;
  created_at: string;
  logo_url?: string | null;
}

interface SuperAdminGroupsProps {
  onNavigate?: (page: string) => void;
}

export default function SuperAdminGroups({ onNavigate }: SuperAdminGroupsProps) {
  const { setActiveGroup } = useAuth();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal create/edit group
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupItem | null>(null);
  const [groupName, setGroupName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [targetIdr, setTargetIdr] = useState("25000");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleOpenCreate = () => {
    setEditingGroup(null);
    setGroupName("");
    setSchoolName("");
    setTargetIdr("25000");
    setLogoUrl(null);
    setLogoFile(null);
    setLogoPreview(null);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (g: GroupItem) => {
    setEditingGroup(g);
    setGroupName(g.name);
    setSchoolName(g.school_name || "");
    setTargetIdr(g.monthly_target_idr?.toString() || "25000");
    setLogoUrl(g.logo_url || null);
    setLogoFile(null);
    setLogoPreview(g.logo_url || null);
    setShowCreateModal(true);
  };

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

  const loadGroups = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGroups((data as GroupItem[]) || []);
    } catch (err: any) {
      console.error("Error loading groups:", err);
      showToast("error", err.message || "Gagal memuat daftar grup.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setSubmitting(true);
    try {
      let finalLogoUrl = logoUrl;

      if (editingGroup) {
        // Handle edit
        if (logoFile) {
          const fileExt = logoFile.name.split(".").pop() || "png";
          const filePath = `groups/${editingGroup.id}/logo-${Date.now()}.${fileExt}`;
          const { error: uploadErr } = await supabase.storage
            .from("group-logos")
            .upload(filePath, logoFile, { contentType: logoFile.type, upsert: true });

          if (uploadErr) throw uploadErr;

          const { data: publicData } = supabase.storage.from("group-logos").getPublicUrl(filePath);
          finalLogoUrl = publicData.publicUrl;
        }

        const { error } = await supabase
          .from("groups")
          .update({
            name: groupName.trim(),
            school_name: schoolName.trim() || null,
            monthly_target_idr: parseInt(targetIdr) || 25000,
            logo_url: finalLogoUrl || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingGroup.id);

        if (error) throw error;

        showToast("success", `Grup "${groupName}" berhasil diperbarui!`);
      } else {
        // Handle create
        const { data: created, error } = await supabase
          .from("groups")
          .insert({
            name: groupName.trim(),
            school_name: schoolName.trim() || null,
            monthly_target_idr: parseInt(targetIdr) || 25000,
            status: "active",
          })
          .select()
          .single();

        if (error) throw error;

        if (logoFile && created) {
          const fileExt = logoFile.name.split(".").pop() || "png";
          const filePath = `groups/${created.id}/logo-${Date.now()}.${fileExt}`;
          const { error: uploadErr } = await supabase.storage
            .from("group-logos")
            .upload(filePath, logoFile, { contentType: logoFile.type, upsert: true });

          if (!uploadErr) {
            const { data: publicData } = supabase.storage.from("group-logos").getPublicUrl(filePath);
            await supabase.from("groups").update({ logo_url: publicData.publicUrl }).eq("id", created.id);
          }
        }

        showToast("success", `Grup "${groupName}" berhasil dibuat!`);
      }

      setShowCreateModal(false);
      setEditingGroup(null);
      setGroupName("");
      setSchoolName("");
      setTargetIdr("25000");
      setLogoUrl(null);
      setLogoFile(null);
      setLogoPreview(null);
      loadGroups();
    } catch (err: any) {
      showToast("error", err.message || "Gagal menyimpan grup.");
    } finally {
      setSubmitting(false);
    }
  };

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      (g.school_name && g.school_name.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedGroups = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#E2E8F0] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
              <Crown size={12} /> Super Admin Control
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0F172A]">Manajemen Grup &amp; Sekolah</h1>
          <p className="text-xs text-slate-400">
            Daftar seluruh grup tabungan kelas / organisasi di dalam platform NabungBareng
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleOpenCreate}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-[#0F766E] hover:bg-teal-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-teal-900/20 transition-all cursor-pointer"
          >
            <Plus size={16} /> Buat Grup Baru
          </button>
          <button
            onClick={loadGroups}
            title="Refresh Data"
            className="p-2.5 border border-[#E2E8F0] rounded-xl text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-50 text-teal-700 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Group</p>
            <p className="text-2xl font-extrabold text-[#0F172A] mt-0.5">{groups.length}</p>
            <p className="text-xs text-teal-600 font-medium mt-0.5">Grup aktif beroperasi</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center flex-shrink-0">
            <School size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sekolah / Instansi</p>
            <p className="text-2xl font-extrabold text-[#0F172A] mt-0.5">
              {new Set(groups.map((g) => g.school_name).filter(Boolean)).size}
            </p>
            <p className="text-xs text-blue-600 font-medium mt-0.5">Lembaga terhubung</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Langkah Lanjutan</p>
            <button
              onClick={() => onNavigate?.("superadmin_admins")}
              className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 mt-1 cursor-pointer"
            >
              Atur Admin Group &rarr;
            </button>
            <p className="text-[11px] text-slate-400 mt-0.5">Tugaskan bendahara ke grup</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-[#E2E8F0]">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama grup atau nama sekolah..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
          />
        </div>
        <p className="text-xs font-semibold text-slate-400 pr-2">
          Menampilkan {filtered.length} dari {groups.length} grup
        </p>
      </div>

      {/* Groups Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-slate-400 text-xs uppercase font-bold tracking-wider">
                <th className="px-6 py-4">Logo &amp; Nama Group</th>
                <th className="px-6 py-4">Sekolah / Instansi</th>
                <th className="px-6 py-4">Target Iuran Bulanan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Dibuat Pada</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Memuat data grup...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Tidak ada grup ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedGroups.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-[#0F172A] flex items-center gap-3">
                      {g.logo_url ? (
                        <img
                          src={g.logo_url}
                          alt={g.name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs flex-shrink-0 bg-white"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-teal-50 text-teal-700 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs">
                          {g.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="leading-tight font-bold text-[#0F172A]">{g.name}</p>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">ID: {g.id.slice(0, 8)}...</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {g.school_name ? (
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <School size={14} className="text-slate-400" />
                          {g.school_name}
                        </span>
                      ) : (
                        <span className="text-slate-300 italic">Tidak ada sekolah</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-[#0F766E] font-mono">
                      Rp{Number(g.monthly_target_idr).toLocaleString("id-ID")}/bln
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 rounded-full">
                        {g.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} className="text-slate-300" />
                        {new Date(g.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveGroup({
                              group_id: g.id,
                              group_name: g.name,
                              school_name: g.school_name || "",
                              public_slug: g.public_slug || "",
                              role: "super_admin",
                              status: g.status,
                              monthly_target_idr: g.monthly_target_idr,
                              start_month: g.created_at ? g.created_at.slice(0, 7) : "2026-08",
                              member_id: "",
                              logo_url: g.logo_url,
                            });
                            onNavigate?.("siswa");
                          }}
                          className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title="Kelola Member & Saldo Grup Ini"
                        >
                          <Users size={13} />
                          <span>Member & Saldo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(g)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 size={13} />
                          <span>Edit / Logo</span>
                        </button>
                      </div>
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
              <span>per halaman · Menampilkan {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filtered.length)} dari {filtered.length} grup</span>
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

      {/* Modal: Buat / Edit Group */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-fadeIn border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-50 text-teal-700 rounded-2xl flex items-center justify-center">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#0F172A]">
                    {editingGroup ? "Edit Group & Logo" : "Buat Group Baru"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingGroup ? "Ubah nama, target iuran, atau logo sekolah/grup" : "Tambahkan grup tabungan sekolah / kelas baru"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Group <span className="text-teal-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kelas 5A / Komite Kegiatan 2026"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Sekolah / Instansi
                </label>
                <input
                  type="text"
                  placeholder="Contoh: SDN 01 Merdeka / MIT Raudlatul Ulum"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Target Iuran Bulanan per Siswa (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={targetIdr}
                  onChange={(e) => setTargetIdr(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Logo Upload */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Logo Group / Sekolah (Opsional)
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-2xs">
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
                      <label className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors border border-slate-200 flex items-center gap-1.5">
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
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-xl transition-colors border border-red-200 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={13} />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Maks. 2MB (PNG, JPG, WebP, SVG). Ditampilkan di portal admin dan aplikasi member.
                    </p>
                  </div>
                </div>
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
                  className="flex-1 py-2.5 bg-teal-700 hover:bg-teal-600 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-teal-900/10"
                >
                  {submitting ? "Menyimpan..." : editingGroup ? "Simpan Perubahan" : "Simpan Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
