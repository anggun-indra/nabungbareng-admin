import React, { useState, useEffect } from "react";
import {
  HardDrive,
  Database,
  Trash2,
  ZoomIn,
  RefreshCw,
  Filter,
  Search,
  FileImage,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  Clock,
  ShieldAlert,
  FileCheck,
  Receipt,
  ArrowUpRight,
  Activity,
  Cpu,
  Server,
  Zap,
  Table,
  Play,
  Settings2,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Check,
  History,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

interface StorageStats {
  total_bytes_used: number;
  total_files: number;
  quota_bytes: number;
  available_bytes: number;
  usage_percent: number;
  buckets: {
    bucket_id: string;
    bucket_name: string;
    is_public: boolean;
    total_files: number;
    total_bytes: number;
  }[];
}

interface StorageFile {
  id: string;
  bucket_id: string;
  name: string;
  size_bytes: number;
  mimetype: string;
  created_at: string;
  updated_at: string;
  payment_submission_id: string | null;
  expense_id: string | null;
  student_name: string | null;
  group_name: string | null;
  amount_idr: number | null;
  status: string | null;
}

interface DatabaseTableStat {
  table_name: string;
  estimated_rows: number;
  table_bytes: number;
  index_bytes: number;
  total_bytes: number;
}

interface DatabaseHealthStats {
  database_size_bytes: number;
  quota_bytes: number;
  available_bytes: number;
  usage_percent: number;
  active_connections: number;
  max_connections: number;
  connection_usage_percent: number;
  cache_hit_ratio: number;
  total_tables: number;
  tables: DatabaseTableStat[];
}

interface CronJobItem {
  jobid: number;
  jobname: string;
  schedule: string;
  command: string;
  active: boolean;
  database: string;
  last_status: string | null;
  last_return_message: string | null;
  last_run_time: string | null;
  last_duration_ms: number | null;
}

interface CronStats {
  total_jobs: number;
  active_jobs: number;
  success_runs_24h: number;
  failed_runs_24h: number;
  jobs: CronJobItem[];
}

interface CronRunLog {
  runid: number;
  jobid: number;
  jobname: string;
  status: string;
  return_message: string;
  start_time: string;
  end_time: string;
  duration_ms: number;
}

function formatBytes(bytes: number, decimals = 2) {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function translateCronSchedule(schedule: string): string {
  switch (schedule.trim()) {
    case "*/2 * * * *":
      return "Setiap 2 menit";
    case "*/5 * * * *":
      return "Setiap 5 menit";
    case "*/10 * * * *":
      return "Setiap 10 menit";
    case "*/15 * * * *":
      return "Setiap 15 menit";
    case "0 * * * *":
      return "Setiap 1 jam";
    case "0 0 * * *":
      return "Setiap hari (pkl 00:00)";
    case "0 2 * * 0":
      return "Setiap Minggu (pkl 02:00)";
    case "0 1 1 * *":
      return "Setiap tgl 1 (pkl 01:00)";
    default:
      return schedule;
  }
}

function getJobDescription(jobname: string): string {
  switch (jobname) {
    case "worker-auto-ocr":
      return "Pemicu otomatis pemrosesan AI OCR struk transfer & keep-alive Supabase";
    case "daily-balance-audit":
      return "Audit otomatis integritas saldo siswa vs total kas kelas setiap tengah malam";
    case "cleanup-orphan-storage":
      return "Pemeriksaan dan audit pembersihan berkas storage yang tidak tertaut";
    default:
      return "Tugas terjadwal latar belakang PostgreSQL";
  }
}

export default function SuperAdminStorage() {
  const [activeTab, setActiveTab] = useState<"cron" | "database" | "storage">("cron");

  // Cron State
  const [cronStats, setCronStats] = useState<CronStats | null>(null);
  const [cronLogs, setCronLogs] = useState<CronRunLog[]>([]);
  const [runningJobId, setRunningJobId] = useState<number | null>(null);
  const [jobToEdit, setJobToEdit] = useState<CronJobItem | null>(null);
  const [newSchedule, setNewSchedule] = useState<string>("");
  const [isUpdatingSchedule, setIsUpdatingSchedule] = useState(false);

  // Storage State
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [totalFilesCount, setTotalFilesCount] = useState(0);
  const [selectedBucket, setSelectedBucket] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Database Health State
  const [dbStats, setDbStats] = useState<DatabaseHealthStats | null>(null);
  const [dbSearch, setDbSearch] = useState("");

  // Common UI State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    file: StorageFile;
    signedUrl: string | null;
  } | null>(null);
  const [fileToDelete, setFileToDelete] = useState<StorageFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Fetch Cron Stats
      const { data: cronData, error: cronErr } = await supabase.rpc("get_cron_jobs_stats");
      if (!cronErr && cronData) {
        setCronStats(cronData as CronStats);
      }

      // Fetch Cron Run History
      const { data: logsData, error: logsErr } = await supabase.rpc("get_cron_run_history", {
        p_limit: 20,
      });
      if (!logsErr && logsData) {
        setCronLogs(logsData as CronRunLog[]);
      }

      // 2. Fetch Database Health Stats
      const { data: dbData, error: dbErr } = await supabase.rpc("get_database_health_stats");
      if (!dbErr && dbData) {
        setDbStats(dbData as DatabaseHealthStats);
      }

      // 3. Fetch Storage Stats
      const { data: statsData, error: statsErr } = await supabase.rpc("get_storage_usage_stats");
      if (!statsErr && statsData) {
        setStorageStats(statsData as StorageStats);
      }

      // 4. Fetch Storage Files List
      const bucketParam = selectedBucket === "all" ? null : selectedBucket;
      const searchParam = search.trim() || null;
      const offset = (page - 1) * pageSize;

      const { data: filesData, error: filesErr } = await supabase.rpc("get_storage_files_list", {
        p_bucket_id: bucketParam,
        p_search: searchParam,
        p_limit: pageSize,
        p_offset: offset,
      });

      if (!filesErr && filesData) {
        const res = filesData as { total: number; files: StorageFile[] };
        setFiles(res.files || []);
        setTotalFilesCount(res.total || 0);
      }
    } catch (err: any) {
      console.error("Error loading infrastructure metrics:", err);
      showToast("error", err.message || "Gagal memuat data sistem.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBucket, page]);

  // Cron Handlers
  const handleTriggerJob = async (job: CronJobItem) => {
    setRunningJobId(job.jobid);
    try {
      const { data, error } = await supabase.rpc("superadmin_trigger_cron_job", {
        p_jobid: job.jobid,
      });
      if (error) throw error;

      const res = data as any;
      if (res?.success) {
        showToast("success", `Job "${job.jobname}" berhasil dijalankan (${res.duration_ms || 0}ms).`);
      } else {
        showToast("error", `Gagal menjalankan "${job.jobname}": ${res?.message || res?.error}`);
      }
      await loadData();
    } catch (err: any) {
      showToast("error", err.message || "Gagal menjalankan cron job.");
    } finally {
      setRunningJobId(null);
    }
  };

  const handleToggleJob = async (job: CronJobItem) => {
    try {
      const newActive = !job.active;
      const { error } = await supabase.rpc("superadmin_toggle_cron_job", {
        p_jobid: job.jobid,
        p_active: newActive,
      });
      if (error) throw error;

      showToast(
        "success",
        `Job "${job.jobname}" berhasil ${newActive ? "diaktifkan" : "dijeda"}.`
      );
      await loadData();
    } catch (err: any) {
      showToast("error", err.message || "Gagal mengubah status cron.");
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobToEdit || !newSchedule.trim()) return;

    setIsUpdatingSchedule(true);
    try {
      const { data, error } = await supabase.rpc("superadmin_update_cron_schedule", {
        p_jobid: jobToEdit.jobid,
        p_schedule: newSchedule.trim(),
      });
      if (error) throw error;

      const res = data as any;
      if (res?.error) throw new Error(res.error);

      showToast("success", `Jadwal "${jobToEdit.jobname}" berhasil diubah ke: ${newSchedule}`);
      setJobToEdit(null);
      await loadData();
    } catch (err: any) {
      showToast("error", err.message || "Gagal mengubah jadwal cron.");
    } finally {
      setIsUpdatingSchedule(false);
    }
  };

  // Storage Handlers
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleOpenPreview = async (file: StorageFile) => {
    try {
      const { data, error } = await supabase.storage
        .from(file.bucket_id)
        .createSignedUrl(file.name, 3600);

      if (error) throw error;
      setPreviewFile({
        file,
        signedUrl: data?.signedUrl || null,
      });
    } catch (err: any) {
      showToast("error", "Gagal membuat URL preview: " + err.message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);

    try {
      const { data, error } = await supabase.rpc("superadmin_delete_storage_file", {
        p_bucket_id: fileToDelete.bucket_id,
        p_name: fileToDelete.name,
      });

      if (error) throw error;

      showToast("success", `Berkas "${fileToDelete.name.split("/").pop()}" berhasil dihapus dari storage.`);
      setFileToDelete(null);
      await loadData();
    } catch (err: any) {
      console.error("Delete error:", err);
      showToast("error", err.message || "Gagal menghapus berkas.");
    } finally {
      setIsDeleting(false);
    }
  };

  const totalPages = Math.ceil(totalFilesCount / pageSize) || 1;
  const storageUsagePercent = storageStats?.usage_percent || 0;
  const estimatedCapacityLeft = Math.floor((storageStats?.available_bytes || 0) / (60 * 1024));

  const filteredDbTables = (dbStats?.tables || []).filter((t) =>
    t.table_name.toLowerCase().includes(dbSearch.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] overflow-y-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white ${
            toast.type === "success" ? "bg-[#0F766E]" : "bg-[#DC2626]"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-[#E2E8F0] px-4 sm:px-6 py-4 sm:py-5 sticky top-0 z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-teal-50 text-[#0F766E] rounded-xl flex items-center justify-center font-bold">
              <Server size={18} />
            </div>
            <h1 className="text-lg sm:text-xl font-black text-[#0F172A]">Kapasitas & Kesehatan Sistem</h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              Super Admin
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Monitoring cron worker background, performa database PostgreSQL, dan kapasitas storage Supabase.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          {/* Triple-Tab Switcher with horizontal scroll on mobile */}
          <div className="overflow-x-auto scrollbar-hide py-0.5">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 min-w-max">
              <button
                onClick={() => setActiveTab("cron")}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "cron"
                    ? "bg-white text-teal-800 shadow-xs border border-slate-200/60"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Clock size={14} className={activeTab === "cron" ? "text-teal-600" : ""} />
                <span>Cron Jobs ({cronStats?.total_jobs || 0})</span>
              </button>
              <button
                onClick={() => setActiveTab("database")}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "database"
                    ? "bg-white text-teal-800 shadow-xs border border-slate-200/60"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Database size={14} className={activeTab === "database" ? "text-teal-600" : ""} />
                <span>Database PostgreSQL</span>
              </button>
              <button
                onClick={() => setActiveTab("storage")}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "storage"
                    ? "bg-white text-teal-800 shadow-xs border border-slate-200/60"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <HardDrive size={14} className={activeTab === "storage" ? "text-teal-600" : ""} />
                <span>Object Storage</span>
              </button>
            </div>
          </div>

          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin text-teal-600" : ""} />
            <span>{refreshing ? "Menyinkronkan..." : "Segarkan"}</span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl w-full mx-auto">
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* ─── TAB 1: CRON JOBS & SCHEDULER MONITORING ─────────────────────── */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === "cron" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Hero Cron Status Card */}
            <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#047857] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-slate-800">
              <div className="absolute right-0 top-0 w-80 h-80 rounded-full bg-emerald-500/10 -translate-y-20 translate-x-20 blur-2xl pointer-events-none" />
              <div className="absolute left-1/3 bottom-0 w-64 h-64 rounded-full bg-teal-500/10 translate-y-20 blur-2xl pointer-events-none" />

              <div className="relative z-10 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 w-max">
                      <Zap size={12} /> Supabase PostgreSQL pg_cron & pg_net
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
                      {cronStats?.active_jobs || 0} dari {cronStats?.total_jobs || 0} Cron Aktif
                    </h2>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-slate-300 block">Status Eksekusi 24 Jam</span>
                    <div className="flex items-center sm:justify-end gap-2 mt-1">
                      <span className="text-xl font-black text-emerald-400 font-mono">
                        {cronStats?.success_runs_24h || 0} Sukses
                      </span>
                      {cronStats?.failed_runs_24h ? (
                        <span className="text-sm font-black text-red-400 font-mono">
                          / {cronStats.failed_runs_24h} Gagal
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[11px] text-emerald-200 block mt-0.5">
                      Keep-Alive & Worker Otomatis Berjalan
                    </span>
                  </div>
                </div>

                {/* Quick Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                    <p className="text-[11px] text-slate-300 font-semibold uppercase tracking-wider">Interval AI OCR</p>
                    <p className="text-2xl font-black text-white mt-1 font-mono">Setiap 5 Menit</p>
                    <p className="text-[10.5px] text-slate-400 mt-0.5">Worker `process-ocr-worker`</p>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                    <p className="text-[11px] text-slate-300 font-semibold uppercase tracking-wider">Keep-Alive Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                      <p className="text-2xl font-black text-emerald-300">Aktif (Warm)</p>
                    </div>
                    <p className="text-[10.5px] text-slate-400 mt-0.5">Mencegah auto-pause Free Tier</p>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                    <p className="text-[11px] text-slate-300 font-semibold uppercase tracking-wider">Audit Kas & Saldo</p>
                    <p className="text-2xl font-black text-white mt-1 font-mono">Tiap 00:00 WIB</p>
                    <p className="text-[10.5px] text-slate-400 mt-0.5">Auto-reconciliation harian</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cron Jobs Management Table */}
            <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden space-y-4 p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
                    <Clock size={18} className="text-teal-600" />
                    <span>Daftar Tugas Terjadwal (Cron Jobs)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Kelola jadwal otomatis, jalankan tugas secara manual, atau jeda tugas kapan saja
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Nama Job & Fungsi</th>
                      <th className="py-3 px-3">Jadwal (Expression)</th>
                      <th className="py-3 px-3">Status Aktif</th>
                      <th className="py-3 px-3">Eksekusi Terakhir</th>
                      <th className="py-3 px-4 text-right">Aksi Super Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(cronStats?.jobs || []).map((job) => (
                      <tr key={job.jobid} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold flex-shrink-0 ${
                                job.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              <Zap size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-extrabold text-[#0F172A] font-mono text-[13px]">{job.jobname}</p>
                              <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                                {getJobDescription(job.jobname)}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-bold text-[#0F172A] block">{translateCronSchedule(job.schedule)}</span>
                          <span className="font-mono text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 inline-block mt-0.5">
                            {job.schedule}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <button
                            onClick={() => handleToggleJob(job)}
                            className="flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-colors"
                            title={job.active ? "Klik untuk Menjeda" : "Klik untuk Mengaktifkan"}
                          >
                            {job.active ? (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Aktif
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-slate-400" />
                                Dijeda
                              </span>
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-3">
                          {job.last_run_time ? (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    job.last_status === "succeeded" ? "bg-emerald-500" : "bg-red-500"
                                  }`}
                                />
                                <span className="font-bold capitalize text-slate-700">{job.last_status}</span>
                                {job.last_duration_ms !== null && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    ({job.last_duration_ms}ms)
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {new Date(job.last_run_time).toLocaleString("id-ID")}
                              </p>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Menunggu jadwal run</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setJobToEdit(job);
                                setNewSchedule(job.schedule);
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              title="Ubah Jadwal Cron"
                            >
                              <Settings2 size={13} />
                              <span className="hidden sm:inline">Jadwal</span>
                            </button>

                            <button
                              onClick={() => handleTriggerJob(job)}
                              disabled={runningJobId === job.jobid}
                              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                              title="Jalankan Sekarang"
                            >
                              <Play size={12} className={runningJobId === job.jobid ? "animate-spin" : ""} />
                              <span>{runningJobId === job.jobid ? "Menjalankan..." : "Run Now"}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cron Run History Logs */}
            <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden space-y-4 p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
                  <History size={18} className="text-slate-600" />
                  <span>Log Riwayat Eksekusi Pekerjaan</span>
                </h3>
                <span className="text-xs text-slate-400">20 Riwayat Terakhir</span>
              </div>

              {cronLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <Clock size={32} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">Belum ada riwayat eksekusi cron yang tercatat</p>
                  <p className="text-[11px] text-slate-400">
                    Gunakan tombol "Run Now" di atas untuk menguji coba eksekusi langsung.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3">Waktu Mulai</th>
                        <th className="py-2.5 px-3">Nama Job</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Durasi</th>
                        <th className="py-2.5 px-3">Pesan Output / Respons</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cronLogs.map((log) => (
                        <tr key={log.runid} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                            {new Date(log.start_time).toLocaleString("id-ID")}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#0F172A]">{log.jobname || "-"}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                log.status === "succeeded"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-red-50 text-red-700 border border-red-200"
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{log.duration_ms} ms</td>
                          <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px] max-w-md truncate" title={log.return_message}>
                            {log.return_message}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* ─── TAB 2: DATABASE POSTGRESQL METRICS & HEALTH ─────────────────── */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === "database" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Database Hero Meter Card */}
            <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#1E3A8A] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-slate-800">
              <div className="absolute right-0 top-0 w-80 h-80 rounded-full bg-blue-500/10 -translate-y-20 translate-x-20 blur-2xl pointer-events-none" />
              <div className="absolute left-1/3 bottom-0 w-64 h-64 rounded-full bg-teal-500/10 translate-y-20 blur-2xl pointer-events-none" />

              <div className="relative z-10 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300 bg-blue-950/60 border border-blue-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 w-max">
                      <Database size={12} /> PostgreSQL Database Storage
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
                      {formatBytes(dbStats?.database_size_bytes || 0)} <span className="text-slate-400 text-lg font-normal">/ {formatBytes(dbStats?.quota_bytes || 524288000)}</span>
                    </h2>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-slate-300 block">Sisa Kuota Database</span>
                    <span className="text-2xl font-black text-emerald-400 font-mono">
                      {formatBytes(dbStats?.available_bytes || 0)}
                    </span>
                    <span className="text-[11px] text-blue-200 block mt-0.5">
                      ({(100 - (dbStats?.usage_percent || 0)).toFixed(2)}% Ruang Bebas)
                    </span>
                  </div>
                </div>

                {/* Database Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">Penggunaan Kuota: {dbStats?.usage_percent || 0}%</span>
                    <span className="text-blue-300 font-mono">Batas: 500 MB (Supabase Free Tier)</span>
                  </div>
                  <div className="w-full h-3.5 bg-slate-900/80 rounded-full overflow-hidden p-0.5 border border-white/10 shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        (dbStats?.usage_percent || 0) > 90
                          ? "bg-red-500 shadow-lg shadow-red-500/50"
                          : (dbStats?.usage_percent || 0) > 70
                          ? "bg-amber-400 shadow-lg shadow-amber-400/50"
                          : "bg-gradient-to-r from-blue-400 to-teal-400 shadow-lg shadow-blue-500/50"
                      }`}
                      style={{ width: `${Math.max(1, Math.min(100, dbStats?.usage_percent || 0))}%` }}
                    />
                  </div>
                </div>

                {/* Health Metrics 4-Box Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-slate-300 font-semibold uppercase tracking-wider">Cache Hit Ratio</p>
                      <Zap size={15} className="text-yellow-400" />
                    </div>
                    <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">{dbStats?.cache_hit_ratio || 99.9}%</p>
                    <p className="text-[10.5px] text-slate-400 mt-0.5">Efisiensi I/O RAM &gt; 99%</p>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-slate-300 font-semibold uppercase tracking-wider">Koneksi Aktif</p>
                      <Activity size={15} className="text-teal-400" />
                    </div>
                    <p className="text-2xl font-black text-white mt-1 font-mono">
                      {dbStats?.active_connections || 0} <span className="text-sm font-normal text-slate-400">/ {dbStats?.max_connections || 60}</span>
                    </p>
                    <p className="text-[10.5px] text-teal-300 mt-0.5">{dbStats?.connection_usage_percent || 0}% pool terpakai</p>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-slate-300 font-semibold uppercase tracking-wider">Total Tabel Schema</p>
                      <Table size={15} className="text-blue-400" />
                    </div>
                    <p className="text-2xl font-black text-white mt-1 font-mono">{dbStats?.total_tables || 0} Tabel</p>
                    <p className="text-[10.5px] text-slate-400 mt-0.5">Schema public terindeks</p>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-slate-300 font-semibold uppercase tracking-wider">Status Kesehatan</p>
                      <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <p className="text-xl font-bold text-white mt-1">Sangat Sehat</p>
                    <p className="text-[10.5px] text-slate-400 mt-0.5">Semua indeks bekerja optimal</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Database Tables Breakdown Card */}
            <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden space-y-4 p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
                    <Table size={18} className="text-blue-600" />
                    <span>Rincian Kapasitas & Baris per Tabel</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Memantau ukuran data fisik, ukuran index B-Tree, dan estimasi jumlah record per tabel
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Cari nama tabel..."
                    value={dbSearch}
                    onChange={(e) => setDbSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Nama Tabel (`public`)</th>
                      <th className="py-3 px-3">Estimasi Baris</th>
                      <th className="py-3 px-3">Ukuran Tabel</th>
                      <th className="py-3 px-3">Ukuran Index</th>
                      <th className="py-3 px-4 text-right">Total Ukuran Relasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDbTables.map((t) => (
                      <tr key={t.table_name} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-mono font-bold text-[11px] flex-shrink-0">
                              SQL
                            </div>
                            <div>
                              <p className="font-bold text-[#0F172A] font-mono">{t.table_name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-700">
                          {t.estimated_rows.toLocaleString("id-ID")} baris
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">
                          {formatBytes(t.table_bytes)}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500">
                          {formatBytes(t.index_bytes)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-blue-800">
                          {formatBytes(t.total_bytes)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* ─── TAB 3: OBJECT STORAGE (BERKAS & STRUK) ──────────────────────── */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === "storage" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Storage Hero Meter Card */}
            <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F766E] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-slate-800">
              <div className="absolute right-0 top-0 w-80 h-80 rounded-full bg-teal-500/10 -translate-y-20 translate-x-20 blur-2xl pointer-events-none" />
              <div className="absolute left-1/3 bottom-0 w-64 h-64 rounded-full bg-blue-500/10 translate-y-20 blur-2xl pointer-events-none" />

              <div className="relative z-10 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-teal-300 bg-teal-950/60 border border-teal-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 w-max">
                      <HardDrive size={12} /> Supabase Object Storage (S3-Compatible)
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
                      {formatBytes(storageStats?.total_bytes_used || 0)} <span className="text-slate-400 text-lg font-normal">/ {formatBytes(storageStats?.quota_bytes || 1073741824)}</span>
                    </h2>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-slate-300 block">Sisa Ruang Tersedia</span>
                    <span className="text-2xl font-black text-emerald-400 font-mono">
                      {formatBytes(storageStats?.available_bytes || 0)}
                    </span>
                    <span className="text-[11px] text-teal-200 block mt-0.5">
                      ({(100 - storageUsagePercent).toFixed(2)}% Bebas)
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">Penggunaan Kuota: {storageUsagePercent}%</span>
                    <span className="text-teal-300 font-mono">Batas: 1.00 GB (Free Plan)</span>
                  </div>
                  <div className="w-full h-3.5 bg-slate-900/80 rounded-full overflow-hidden p-0.5 border border-white/10 shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        storageUsagePercent > 90
                          ? "bg-red-500 shadow-lg shadow-red-500/50"
                          : storageUsagePercent > 70
                          ? "bg-amber-400 shadow-lg shadow-amber-400/50"
                          : "bg-gradient-to-r from-teal-400 to-emerald-400 shadow-lg shadow-teal-500/50"
                      }`}
                      style={{ width: `${Math.max(1, Math.min(100, storageUsagePercent))}%` }}
                    />
                  </div>
                </div>

                {/* Quick Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                    <p className="text-[11px] text-slate-300 font-semibold uppercase tracking-wider">Total Berkas Tersimpan</p>
                    <p className="text-2xl font-black text-white mt-1 font-mono">{storageStats?.total_files || 0} File</p>
                    <p className="text-[10.5px] text-slate-400 mt-0.5">Struk setoran & nota kas</p>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                    <p className="text-[11px] text-slate-300 font-semibold uppercase tracking-wider">Estimasi Daya Tampung</p>
                    <p className="text-2xl font-black text-teal-300 mt-1 font-mono">±{estimatedCapacityLeft.toLocaleString("id-ID")}</p>
                    <p className="text-[10.5px] text-slate-400 mt-0.5">Berkas struk baru (~60 KB/file)</p>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                    <p className="text-[11px] text-slate-300 font-semibold uppercase tracking-wider">Status Penyimpanan</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                      <p className="text-xl font-bold text-white">Sangat Aman</p>
                    </div>
                    <p className="text-[10.5px] text-slate-400 mt-0.5">Kapasitas jauh di bawah limit</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bucket Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {storageStats?.buckets.map((b) => {
                const isPayment = b.bucket_id === "payment-proofs";
                return (
                  <div
                    key={b.bucket_id}
                    onClick={() => {
                      setSelectedBucket(b.bucket_id);
                      setPage(1);
                    }}
                    className={`bg-white rounded-3xl p-5 border transition-all cursor-pointer shadow-sm hover:shadow-md ${
                      selectedBucket === b.bucket_id
                        ? "border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/20"
                        : "border-slate-200/80 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                            isPayment ? "bg-blue-50 text-blue-600" : "bg-teal-50 text-teal-600"
                          }`}
                        >
                          {isPayment ? <ArrowUpRight size={20} /> : <Receipt size={20} />}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-[#0F172A]">
                            {isPayment ? "Bukti Setoran Siswa" : "Nota Pengeluaran Kas"}
                          </h3>
                          <p className="text-xs text-slate-400 font-mono">{b.bucket_name}</p>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          selectedBucket === b.bucket_id
                            ? "bg-teal-100 text-teal-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {selectedBucket === b.bucket_id ? "Sedang Dipilih" : "Private Bucket"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Total Berkas</span>
                        <p className="text-base font-black text-[#0F172A] font-mono">{b.total_files} File</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Total Ukuran</span>
                        <p className="text-base font-black text-[#0F766E] font-mono">{formatBytes(b.total_bytes)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* File Explorer Table */}
            <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden space-y-4 p-5 sm:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
                    <Layers size={18} className="text-teal-600" />
                    <span>Daftar Berkas & File Explorer</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Menampilkan {files.length} dari total {totalFilesCount} berkas tersimpan
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select
                      value={selectedBucket}
                      onChange={(e) => {
                        setSelectedBucket(e.target.value);
                        setPage(1);
                      }}
                      className="pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none cursor-pointer"
                    >
                      <option value="all">Semua Bucket</option>
                      <option value="payment-proofs">payment-proofs (Setoran)</option>
                      <option value="expense-receipts">expense-receipts (Nota Kas)</option>
                    </select>
                  </div>

                  <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Cari nama file / path..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                    />
                  </form>
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center text-slate-400 space-y-3">
                  <RefreshCw size={28} className="mx-auto text-teal-600 animate-spin" />
                  <p className="text-xs font-bold text-slate-600">Memuat berkas dari Supabase Storage...</p>
                </div>
              ) : files.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <FileImage size={36} className="mx-auto text-slate-300" />
                  <p className="font-bold text-sm text-slate-600">Tidak ada berkas ditemukan</p>
                  <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian atau filter bucket.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-4">Nama File / Storage Path</th>
                        <th className="py-3 px-3">Bucket</th>
                        <th className="py-3 px-3">Terkait Transaksi</th>
                        <th className="py-3 px-3">Ukuran</th>
                        <th className="py-3 px-3">Tanggal Unggah</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {files.map((file) => {
                        const fileName = file.name.split("/").pop() || file.name;
                        return (
                          <tr key={file.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5 min-w-0 max-w-xs sm:max-w-md">
                                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0 font-bold">
                                  <FileImage size={15} />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-[#0F172A] truncate" title={file.name}>
                                    {fileName}
                                  </p>
                                  <p className="text-[10px] text-slate-400 truncate font-mono" title={file.name}>
                                    {file.name}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <span
                                className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                                  file.bucket_id === "payment-proofs"
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : "bg-teal-50 text-teal-700 border border-teal-200"
                                }`}
                              >
                                {file.bucket_id}
                              </span>
                            </td>

                            <td className="py-3 px-3">
                              {file.student_name ? (
                                <div>
                                  <p className="font-bold text-[#0F172A]">{file.student_name}</p>
                                  <p className="text-[10.5px] text-slate-400">{file.group_name || "Grup"}</p>
                                </div>
                              ) : file.expense_id ? (
                                <div>
                                  <p className="font-bold text-[#0F172A]">Pengeluaran Kas</p>
                                  <p className="text-[10.5px] text-slate-400">{file.group_name || "Grup"}</p>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">Tidak terikat</span>
                              )}
                            </td>

                            <td className="py-3 px-3 font-mono font-bold text-slate-700">
                              {formatBytes(file.size_bytes)}
                            </td>

                            <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                              {new Date(file.created_at).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenPreview(file)}
                                  className="p-1.5 hover:bg-teal-50 text-slate-600 hover:text-teal-700 rounded-lg transition-colors cursor-pointer"
                                  title="Lihat Foto Bukti"
                                >
                                  <ZoomIn size={15} />
                                </button>
                                <button
                                  onClick={() => setFileToDelete(file)}
                                  className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus Berkas Permanen"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-400">
                    Halaman {page} dari {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL: EDIT CRON SCHEDULE ───────────────────────────────────── */}
      {jobToEdit && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-6 space-y-4 border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                  <Clock size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[#0F172A]">Ubah Jadwal Eksekusi</h3>
                  <p className="text-xs text-slate-400 font-mono">{jobToEdit.jobname}</p>
                </div>
              </div>
              <button
                onClick={() => setJobToEdit(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 cursor-pointer rounded-xl hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Pilih Preset Jadwal Cepat</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Setiap 2 Menit", expr: "*/2 * * * *" },
                    { label: "Setiap 5 Menit", expr: "*/5 * * * *" },
                    { label: "Setiap 15 Menit", expr: "*/15 * * * *" },
                    { label: "Setiap 1 Jam", expr: "0 * * * *" },
                    { label: "Tiap Malam (00:00)", expr: "0 0 * * *" },
                    { label: "Tiap Minggu (02:00)", expr: "0 2 * * 0" },
                  ].map((preset) => (
                    <button
                      key={preset.expr}
                      type="button"
                      onClick={() => setNewSchedule(preset.expr)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border text-left transition-all cursor-pointer ${
                        newSchedule === preset.expr
                          ? "bg-teal-50 border-teal-500 text-teal-800 ring-2 ring-teal-500/20"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <p className="font-extrabold">{preset.label}</p>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">{preset.expr}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Ekspresi Cron Kustom (5-Field Format)
                </label>
                <input
                  type="text"
                  value={newSchedule}
                  onChange={(e) => setNewSchedule(e.target.value)}
                  placeholder="e.g. */5 * * * *"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                  required
                />
                <p className="text-[10.5px] text-slate-400 mt-1">
                  Format: <span className="font-mono">Menit Jam Hari Bulan HariDalamMinggu</span>
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setJobToEdit(null)}
                  disabled={isUpdatingSchedule}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingSchedule}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-teal-900/10 cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingSchedule ? "Menyimpan..." : "Simpan Jadwal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: PREVIEW IMAGE ────────────────────────────────────────── */}
      {previewFile && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl space-y-4 border border-slate-200 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm text-[#0F172A] truncate">
                  {previewFile.file.name.split("/").pop()}
                </h3>
                <p className="text-xs text-slate-400">
                  Bucket: <span className="font-mono font-bold text-teal-700">{previewFile.file.bucket_id}</span> · {formatBytes(previewFile.file.size_bytes)}
                </p>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 cursor-pointer rounded-xl hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] flex items-center justify-center">
              {previewFile.signedUrl ? (
                <img
                  src={previewFile.signedUrl}
                  alt="Preview"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <p className="text-xs text-slate-500">Memuat gambar...</p>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="text-[11px] text-slate-400">
                Diunggah pada: {new Date(previewFile.file.created_at).toLocaleString("id-ID")}
              </div>
              <button
                onClick={() => {
                  setFileToDelete(previewFile.file);
                  setPreviewFile(null);
                }}
                className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 size={13} />
                <span>Hapus Berkas Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CONFIRM DELETE FILE ──────────────────────────────────── */}
      {fileToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-6 space-y-4 border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center font-bold flex-shrink-0">
                <ShieldAlert size={22} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#0F172A]">Hapus Berkas dari Storage?</h3>
                <p className="text-xs text-slate-400">Tindakan ini permanen dan tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Berkas:</span>
                <span className="font-bold text-[#0F172A] truncate max-w-[200px]" title={fileToDelete.name}>
                  {fileToDelete.name.split("/").pop()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bucket:</span>
                <span className="font-mono font-bold text-teal-700">{fileToDelete.bucket_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ukuran:</span>
                <span className="font-mono font-bold text-[#0F172A]">{formatBytes(fileToDelete.size_bytes)}</span>
              </div>
              {fileToDelete.student_name && (
                <div className="flex justify-between border-t border-slate-200 pt-1.5">
                  <span className="text-slate-500">Terkait Siswa:</span>
                  <span className="font-bold text-blue-700">{fileToDelete.student_name}</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-[11.5px] text-amber-900 leading-snug">
              <p className="font-bold flex items-center gap-1.5 mb-0.5">
                <AlertTriangle size={13} className="text-amber-700 flex-shrink-0" />
                Catatan Keamanan:
              </p>
              Jika berkas ini terhubung dengan setoran / pengeluaran, referensi foto akan dilepas secara aman tanpa merusak saldo dan histori transaksi siswa.
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-900/10 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus Permanen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
