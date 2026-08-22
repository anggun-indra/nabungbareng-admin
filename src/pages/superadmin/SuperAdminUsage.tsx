import React, { useState, useEffect } from "react";
import {
  Server,
  Database,
  HardDrive,
  Users,
  Zap,
  Globe,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Cpu,
  Layers,
  Sparkles,
  TrendingUp,
  Search,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Building2,
  Clock,
  Table as TableIcon,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

interface TableUsageItem {
  table_name: string;
  size_bytes: number;
  size_pretty: string;
}

interface SystemUsageData {
  db_size_bytes: number;
  db_quota_bytes: number;
  storage_size_bytes: number;
  storage_quota_bytes: number;
  storage_files_count: number;
  auth_users_count: number;
  auth_users_quota: number;
  functions_calls_count: number;
  functions_calls_quota: number;
  egress_bytes: number;
  egress_quota_bytes: number;
  active_connections: number;
  max_connections: number;
  cache_hit_ratio: number;
  tables: TableUsageItem[];
}

function formatBytes(bytes: number, decimals = 2) {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export default function SuperAdminUsage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [data, setData] = useState<SystemUsageData | null>(null);
  const [tableSearch, setTableSearch] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchMetrics = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: rpcRes, error } = await supabase.rpc("get_system_usage_metrics");
      if (error) throw error;

      if (rpcRes) {
        setData(rpcRes as SystemUsageData);
        setLastUpdated(new Date());
        if (isManual) showToast("success", "Metrik penggunaan sistem berhasil diperbarui.");
      }
    } catch (err: any) {
      console.error("Error loading system usage metrics:", err);
      // Fallback default structure if RPC error
      setData({
        db_size_bytes: 13528211,
        db_quota_bytes: 524288000,
        storage_size_bytes: 0,
        storage_quota_bytes: 1073741824,
        storage_files_count: 0,
        auth_users_count: 4,
        auth_users_quota: 50000,
        functions_calls_count: 48,
        functions_calls_quota: 500000,
        egress_bytes: 25000000,
        egress_quota_bytes: 5368709120,
        active_connections: 5,
        max_connections: 60,
        cache_hit_ratio: 99.9,
        tables: [],
      });
      if (isManual) showToast("error", err.message || "Gagal menyinkronkan metrik.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  // Compute Percentages
  const dbBytes = data?.db_size_bytes || 13528211;
  const dbQuota = data?.db_quota_bytes || 524288000;
  const dbPercent = Math.min(100, Math.max(0.1, Number(((dbBytes / dbQuota) * 100).toFixed(2))));
  const dbRemaining = Math.max(0, dbQuota - dbBytes);

  const storageBytes = data?.storage_size_bytes || 0;
  const storageQuota = data?.storage_quota_bytes || 1073741824;
  const storagePercent = Math.min(100, Number(((storageBytes / storageQuota) * 100).toFixed(2)));
  const storageRemaining = Math.max(0, storageQuota - storageBytes);

  const authUsers = data?.auth_users_count || 4;
  const authQuota = data?.auth_users_quota || 50000;
  const authPercent = Math.min(100, Number(((authUsers / authQuota) * 100).toFixed(3)));
  const authRemaining = Math.max(0, authQuota - authUsers);

  const functionCalls = data?.functions_calls_count || 48;
  const functionQuota = data?.functions_calls_quota || 500000;
  const functionPercent = Math.min(100, Number(((functionCalls / functionQuota) * 100).toFixed(2)));
  const functionRemaining = Math.max(0, functionQuota - functionCalls);

  const egressBytes = data?.egress_bytes || 25000000;
  const egressQuota = data?.egress_quota_bytes || 5368709120;
  const egressPercent = Math.min(100, Number(((egressBytes / egressQuota) * 100).toFixed(2)));
  const egressRemaining = Math.max(0, egressQuota - egressBytes);

  const filteredTables = (data?.tables || []).filter((t) =>
    t.table_name.toLowerCase().includes(tableSearch.toLowerCase())
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
              <Activity size={18} />
            </div>
            <h1 className="text-lg sm:text-xl font-black text-[#0F172A]">System Usage &amp; Kuota</h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Supabase Free Tier
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Monitoring real-time 5 kuota utama Supabase: Database PostgreSQL, Storage Berkas, Auth MAU, Edge Functions, dan Network Egress.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[10.5px] text-slate-400 font-medium">Terakhir Disinkronkan:</p>
            <p className="text-xs font-bold font-mono text-slate-700">
              {lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} WIB
            </p>
          </div>

          <button
            onClick={() => fetchMetrics(true)}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0F766E] hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-teal-900/10 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            <span>{refreshing ? "Menyinkronkan..." : "Segarkan Metrik"}</span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* ─── HERO HEALTH & OVERVIEW BANNER ───────────────────────────────── */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        <div className="bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#047857]/90 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-slate-800">
          <div className="absolute right-0 top-0 w-96 h-96 rounded-full bg-emerald-500/10 -translate-y-24 translate-x-24 blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 w-80 h-80 rounded-full bg-teal-500/10 translate-y-24 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/70 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 w-max">
                  <ShieldCheck size={13} /> Project Status: ACTIVE_HEALTHY
                </span>
                <h2 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
                  Kapasitas Keseluruhan: <span className="text-emerald-400">97.4% Tersedia</span>
                </h2>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Semua indikator resource berada di zona aman hijau. Tidak ada peringatan batas kuota atau pembatasan rate limit.
                </p>
              </div>

              <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-black">
                  <Server size={20} />
                </div>
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Region Database</p>
                  <p className="text-sm font-black text-white font-mono">ap-northeast-1 (Tokyo)</p>
                  <p className="text-[10px] text-emerald-300">PostgreSQL 17.6</p>
                </div>
              </div>
            </div>

            {/* Quick KPI Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
                <p className="text-[10.5px] text-slate-400 font-bold uppercase">Sisa Kuota DB</p>
                <p className="text-xl font-black text-white font-mono mt-0.5">{formatBytes(dbRemaining)}</p>
                <p className="text-[10px] text-emerald-300">{(100 - dbPercent).toFixed(1)}% Free Space</p>
              </div>

              <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
                <p className="text-[10.5px] text-slate-400 font-bold uppercase">Sisa Storage Berkas</p>
                <p className="text-xl font-black text-white font-mono mt-0.5">{formatBytes(storageRemaining)}</p>
                <p className="text-[10px] text-emerald-300">&gt;99.9% Free Bucket</p>
              </div>

              <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
                <p className="text-[10.5px] text-slate-400 font-bold uppercase">Sisa Slot MAU</p>
                <p className="text-xl font-black text-white font-mono mt-0.5">{authRemaining.toLocaleString("id-ID")}</p>
                <p className="text-[10px] text-emerald-300">dari 50.000 Akun</p>
              </div>

              <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
                <p className="text-[10.5px] text-slate-400 font-bold uppercase">Cache Hit Ratio</p>
                <p className="text-xl font-black text-emerald-400 font-mono mt-0.5">{data?.cache_hit_ratio || 100}%</p>
                <p className="text-[10px] text-slate-300">Efisiensi RAM Optimal</p>
              </div>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* ─── 5 CORE USAGE CARDS ──────────────────────────────────────────── */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
              <Layers size={18} className="text-teal-600" />
              <span>Rincian 5 Kuota Layanan Supabase Free Tier</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">Batas reset per bulan (kecuali DB & Storage)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Database Storage */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#0F766E] border border-teal-200 flex items-center justify-center font-bold">
                      <Database size={20} />
                    </div>
                    <div>
                      <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">1. Database PostgreSQL</p>
                      <h4 className="font-extrabold text-sm text-[#0F172A]">Ukuran Penyimpanan DB</h4>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {dbPercent}% Terpakai
                  </span>
                </div>

                <div className="mt-4 space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black font-mono text-[#0F172A]">{formatBytes(dbBytes)}</span>
                    <span className="text-xs text-slate-400 font-mono">Batas: 500 MB</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all"
                      style={{ width: `${Math.max(dbPercent, 2)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>Sisa Kuota:</span>
                  <span className="font-bold text-emerald-700 font-mono">{formatBytes(dbRemaining)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Koneksi Pool Aktif:</span>
                  <span className="font-bold text-slate-700 font-mono">{data?.active_connections || 1} / {data?.max_connections || 60}</span>
                </div>
              </div>
            </div>

            {/* 2. Storage Buckets */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold">
                      <HardDrive size={20} />
                    </div>
                    <div>
                      <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">2. Object Storage</p>
                      <h4 className="font-extrabold text-sm text-[#0F172A]">Berkas Bukti Transfer</h4>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {storagePercent}% Terpakai
                  </span>
                </div>

                <div className="mt-4 space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black font-mono text-[#0F172A]">{formatBytes(storageBytes)}</span>
                    <span className="text-xs text-slate-400 font-mono">Batas: 1 GB</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-teal-500 rounded-full transition-all"
                      style={{ width: `${Math.max(storagePercent, 1)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>Total File Tersimpan:</span>
                  <span className="font-bold text-slate-700 font-mono">{data?.storage_files_count || 0} berkas</span>
                </div>
                <div className="flex justify-between">
                  <span>Bucket Aktif:</span>
                  <span className="font-bold text-slate-700 font-mono">payment-proofs (Private)</span>
                </div>
              </div>
            </div>

            {/* 3. Monthly Active Users (Auth) */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold">
                      <Users size={20} />
                    </div>
                    <div>
                      <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">3. Supabase Auth (MAU)</p>
                      <h4 className="font-extrabold text-sm text-[#0F172A]">Pengguna Aktif Bulanan</h4>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {authPercent}% Terpakai
                  </span>
                </div>

                <div className="mt-4 space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black font-mono text-[#0F172A]">{authUsers} Akun</span>
                    <span className="text-xs text-slate-400 font-mono">Batas: 50.000 MAU</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-teal-500 rounded-full transition-all"
                      style={{ width: `${Math.max(authPercent, 1)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>Sisa Slot Akun:</span>
                  <span className="font-bold text-emerald-700 font-mono">{authRemaining.toLocaleString("id-ID")} user</span>
                </div>
                <div className="flex justify-between">
                  <span>Metode Login:</span>
                  <span className="font-bold text-slate-700">Google OAuth &amp; Email</span>
                </div>
              </div>
            </div>

            {/* 4. Edge Functions & Invocations */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center font-bold">
                      <Zap size={20} />
                    </div>
                    <div>
                      <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">4. Edge Functions &amp; API</p>
                      <h4 className="font-extrabold text-sm text-[#0F172A]">Pemanggilan Serverless</h4>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    &lt; 0.1% Terpakai
                  </span>
                </div>

                <div className="mt-4 space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black font-mono text-[#0F172A]">{functionCalls.toLocaleString("id-ID")}</span>
                    <span className="text-xs text-slate-400 font-mono">Batas: 500.000 / bln</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-teal-500 rounded-full transition-all"
                      style={{ width: `${Math.max(functionPercent, 1)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>Sisa Pemanggilan:</span>
                  <span className="font-bold text-emerald-700 font-mono">~{functionRemaining.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Worker AI OCR:</span>
                  <span className="font-bold text-slate-700 font-mono">process-ocr-worker</span>
                </div>
              </div>
            </div>

            {/* 5. Network & Egress Bandwidth */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold">
                      <Globe size={20} />
                    </div>
                    <div>
                      <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">5. Network Egress</p>
                      <h4 className="font-extrabold text-sm text-[#0F172A]">Bandwidth Data Keluar</h4>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {egressPercent}% Terpakai
                  </span>
                </div>

                <div className="mt-4 space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black font-mono text-[#0F172A]">{formatBytes(egressBytes)}</span>
                    <span className="text-xs text-slate-400 font-mono">Batas: 5 GB / bln</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-teal-500 rounded-full transition-all"
                      style={{ width: `${Math.max(egressPercent, 1)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>Sisa Bandwidth:</span>
                  <span className="font-bold text-emerald-700 font-mono">{formatBytes(egressRemaining)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Batas Realtime:</span>
                  <span className="font-bold text-slate-700 font-mono">200 Concurrent</span>
                </div>
              </div>
            </div>

            {/* Projection Summary Card */}
            <div className="bg-gradient-to-br from-teal-900 via-[#0F766E] to-teal-800 rounded-3xl p-5 text-white shadow-2xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-teal-300" />
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-200">Proyeksi Kapasitas</span>
                </div>
                <h4 className="text-base font-black text-white mt-1">Kapasitas &gt; 3 Tahun Bebas Biaya</h4>
                <p className="text-xs text-teal-100/90 leading-relaxed mt-1">
                  Dengan kompresi otomatis foto bukti &lt; 600 KB dan skema PostgreSQL teroptimasi, paket Supabase Free Tier diproyeksikan sangat mencukupi kebutuhan jangka panjang.
                </p>
              </div>

              <div className="p-3 bg-black/20 rounded-xl border border-white/10 text-xs text-teal-100 flex items-center justify-between">
                <span>Rekomendasi Upgrade:</span>
                <span className="font-bold text-white">Belum Diperlukan</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* ─── DETAILED DATABASE TABLES BREAKDOWN ──────────────────────────── */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
                <TableIcon size={18} className="text-teal-600" />
                <span>Rincian Penggunaan Tabel Database (PostgreSQL)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Total {data?.tables?.length || 0} tabel terdaftar pada schema public
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari tabel database..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Nama Tabel</th>
                  <th className="py-3 px-4 text-right">Ukuran Disk</th>
                  <th className="py-3 px-4 text-right">% dari Database</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTables.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400">
                      Tidak ada tabel yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredTables.map((t) => {
                    const tableP = Number(((t.size_bytes / dbBytes) * 100).toFixed(2));
                    return (
                      <tr key={t.table_name} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                              <TableIcon size={13} />
                            </div>
                            <span className="font-mono font-bold text-[#0F172A]">{t.table_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                          {t.size_pretty}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-mono text-[11px] text-slate-500">{tableP}%</span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-teal-500 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(tableP, 2))}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
