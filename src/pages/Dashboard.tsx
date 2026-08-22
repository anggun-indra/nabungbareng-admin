import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  Clock,
  TrendingDown,
  Wallet,
  ChevronRight,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Building2,
  Calendar,
  AlertTriangle,
  Scale,
  Sparkles,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

type Page = "verifikasi" | "pengeluaran" | "rekonsiliasi" | string;

interface DashboardProps {
  onNavigate: (page: Page) => void;
}

interface KPIData {
  cash_balance_idr: number;
  active_students_count: number;
  pending_submissions_count: number;
  monthly_expenses_idr: number;
  monthly_deposits_idr: number;
  monthly_target_per_student_idr: number;
  expected_monthly_total_idr: number;
  percent_achieved: number;
}

interface PendingSubmission {
  id: string;
  amount_idr: number;
  transfer_date: string;
  period_label: string;
  student_name: string;
  status: string;
  storage_path: string | null;
}

interface ReconciliationItem {
  id: string;
  statement_date: string;
  bank_balance_idr: number;
  app_balance_idr: number;
  difference_idr: number;
  note: string | null;
  created_at: string;
}

interface AuditLogItem {
  id: string;
  action: string;
  created_at: string;
  metadata: any;
  actor_user_id: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0F172A] text-white px-3 py-2 rounded-xl text-xs shadow-xl border border-slate-700">
        <p className="text-slate-400 text-[10px] mb-0.5">{label}</p>
        <p className="font-bold text-teal-400">Rp{Number(payload[0].value).toLocaleString("id-ID")}</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { activeGroup } = useAuth();

  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<KPIData>({
    cash_balance_idr: 0,
    active_students_count: 0,
    pending_submissions_count: 0,
    monthly_expenses_idr: 0,
    monthly_deposits_idr: 0,
    monthly_target_per_student_idr: 25000,
    expected_monthly_total_idr: 0,
    percent_achieved: 0,
  });
  const [pendingList, setPendingList] = useState<PendingSubmission[]>([]);
  const [lastReconciliation, setLastReconciliation] = useState<ReconciliationItem | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [monthlyChartData, setMonthlyChartData] = useState<{ bulan: string; setoran: number }[]>([]);

  const loadDashboardData = async () => {
    if (!activeGroup?.group_id) return;
    setLoading(true);

    try {
      // 1. Fetch KPI Summary RPC
      const { data: kpiRes, error: kpiErr } = await supabase.rpc("get_group_kpi_summary", {
        p_group_id: activeGroup.group_id,
      });

      if (!kpiErr && kpiRes) {
        setKpi({
          cash_balance_idr: Number(kpiRes.cash_balance_idr) || 0,
          active_students_count: Number(kpiRes.active_students_count) || 0,
          pending_submissions_count: Number(kpiRes.pending_submissions_count) || 0,
          monthly_expenses_idr: Number(kpiRes.monthly_expenses_idr) || 0,
          monthly_deposits_idr: Number(kpiRes.monthly_deposits_idr) || 0,
          monthly_target_per_student_idr: Number(kpiRes.monthly_target_per_student_idr) || 25000,
          expected_monthly_total_idr: Number(kpiRes.expected_monthly_total_idr) || 0,
          percent_achieved: Number(kpiRes.percent_achieved) || 0,
        });
      }

      // 2. Fetch Pending Submissions
      const { data: subsData } = await supabase
        .from("payment_submissions")
        .select(`
          id,
          amount_idr,
          transfer_date,
          period_label,
          status,
          storage_path,
          group_members (
            student_name,
            display_name
          )
        `)
        .eq("group_id", activeGroup.group_id)
        .eq("status", "submitted")
        .order("created_at", { ascending: false })
        .limit(5);

      if (subsData) {
        const formatted: PendingSubmission[] = subsData.map((s: any) => ({
          id: s.id,
          amount_idr: Number(s.amount_idr),
          transfer_date: s.transfer_date,
          period_label: s.period_label,
          student_name: s.group_members?.student_name || s.group_members?.display_name || "Siswa",
          status: s.status,
          storage_path: s.storage_path,
        }));
        setPendingList(formatted);
      }

      // 3. Fetch Last Reconciliation
      const { data: recData } = await supabase
        .from("reconciliations")
        .select("*")
        .eq("group_id", activeGroup.group_id)
        .order("statement_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recData) {
        setLastReconciliation({
          id: recData.id,
          statement_date: recData.statement_date,
          bank_balance_idr: Number(recData.bank_balance_idr),
          app_balance_idr: Number(recData.app_balance_idr),
          difference_idr: Number(recData.difference_idr),
          note: recData.note,
          created_at: recData.created_at,
        });
      }

      // 4. Fetch Audit Logs
      const { data: logsData } = await supabase
        .from("audit_events")
        .select("*")
        .eq("group_id", activeGroup.group_id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (logsData) {
        setAuditLogs(logsData);
      }

      // 5. Build Monthly Chart Data
      const { data: allVerified } = await supabase
        .from("payment_submissions")
        .select("amount_idr, transfer_date")
        .eq("group_id", activeGroup.group_id)
        .eq("status", "verified")
        .order("transfer_date", { ascending: true });

      if (allVerified && allVerified.length > 0) {
        const mapByMonth: Record<string, number> = {};
        for (const item of allVerified) {
          const d = new Date(item.transfer_date);
          const monthLabel = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
          mapByMonth[monthLabel] = (mapByMonth[monthLabel] || 0) + Number(item.amount_idr);
        }
        const chartArr = Object.entries(mapByMonth).map(([bulan, setoran]) => ({
          bulan,
          setoran,
        }));
        setMonthlyChartData(chartArr);
      } else {
        // Fallback default chart representation
        setMonthlyChartData([
          { bulan: "Bulan Ini", setoran: Number(kpiRes?.monthly_deposits_idr || 0) },
        ]);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [activeGroup?.group_id]);

  const kpis = [
    {
      label: "Saldo Kas Grup",
      value: `Rp${kpi.cash_balance_idr.toLocaleString("id-ID")}`,
      sub: `${kpi.active_students_count} member aktif terdaftar`,
      icon: Wallet,
      textColor: "text-[#0F766E]",
      bgLight: "bg-teal-50",
    },
    {
      label: "Setoran Bulan Ini",
      value: `Rp${kpi.monthly_deposits_idr.toLocaleString("id-ID")}`,
      sub: `${kpi.percent_achieved}% dari target tercapai`,
      icon: CheckCircle,
      textColor: "text-[#2563EB]",
      bgLight: "bg-blue-50",
    },
    {
      label: "Menunggu Verifikasi",
      value: `${kpi.pending_submissions_count} setoran`,
      sub: kpi.pending_submissions_count > 0 ? "Perlu segera ditinjau" : "Semua setoran bersih",
      icon: Clock,
      textColor: "text-[#D97706]",
      bgLight: "bg-amber-50",
      urgent: kpi.pending_submissions_count > 0,
    },
    {
      label: "Pengeluaran Bulan Ini",
      value: `Rp${kpi.monthly_expenses_idr.toLocaleString("id-ID")}`,
      sub: "Berdasarkan pos yang diposting",
      icon: TrendingDown,
      textColor: "text-[#DC2626]",
      bgLight: "bg-red-50",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#E2E8F0] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
              <Building2 size={12} /> {activeGroup?.group_name || "Grup Tabungan"}
            </span>
            <span className="text-xs text-slate-400">{activeGroup?.school_name || "Grup"}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0F172A]">Ringkasan Keuangan Grup</h1>
          <p className="text-xs text-slate-500">
            Target Iuran: Rp{kpi.monthly_target_per_student_idr.toLocaleString("id-ID")}/member per bulan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => onNavigate("verifikasi")}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-all shadow-md shadow-teal-900/10 cursor-pointer"
          >
            <CheckCircle size={15} />
            <span>Verifikasi ({kpi.pending_submissions_count})</span>
          </button>
          <button
            onClick={() => onNavigate("pengeluaran")}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 bg-[#0F172A] text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-md shadow-slate-900/10 cursor-pointer"
          >
            <Plus size={15} />
            <span>Catat Pengeluaran</span>
          </button>
          <button
            onClick={loadDashboardData}
            title="Muat Ulang"
            className="p-2.5 border border-[#E2E8F0] rounded-xl text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={`bg-white rounded-2xl border border-[#E2E8F0] p-5 flex flex-col justify-between gap-3 shadow-sm transition-all ${
                item.urgent ? "ring-2 ring-amber-400 bg-amber-50/20" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 ${item.bgLight} rounded-xl flex items-center justify-center`}>
                  <Icon size={20} className={item.textColor} />
                </div>
                {item.urgent && (
                  <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                    Perlu Aksi
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{item.label}</p>
                <p className="text-2xl font-black text-[#0F172A] mt-0.5">{item.value}</p>
                <p className="text-xs text-slate-400 mt-1">{item.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Row: Pending Submissions & Reconciliation Status */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Antrean Bukti Setoran */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A]">Antrean Bukti Setoran Baru</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {pendingList.length > 0 ? `${pendingList.length} bukti menunggu konfirmasi bendahara` : "Semua setoran bersih"}
              </p>
            </div>
            <button
              onClick={() => onNavigate("verifikasi")}
              className="flex items-center gap-1 text-xs font-bold text-[#0F766E] hover:text-teal-800 transition-colors cursor-pointer"
            >
              Buka Verifikasi <ChevronRight size={14} />
            </button>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : pendingList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <CheckCircle size={36} className="text-teal-500 mb-2" />
              <p className="text-sm font-bold text-slate-700">Semua Bukti Telah Diverifikasi</p>
              <p className="text-xs text-slate-400 mt-0.5">Tidak ada antrean setoran yang menunggu saat ini.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F1F5F9]">
              {pendingList.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => onNavigate("verifikasi")}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs">
                    {sub.student_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#0F172A] truncate">{sub.student_name}</p>
                    <p className="text-xs text-slate-400">
                      {sub.period_label} · Transfer: {new Date(sub.transfer_date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-[#0F766E] font-mono">
                      Rp{sub.amount_idr.toLocaleString("id-ID")}
                    </p>
                    <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                      Menunggu
                    </span>
                  </div>
                  <ArrowUpRight size={15} className="text-slate-300 group-hover:text-[#0F766E] transition-colors" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rekonsiliasi Terakhir Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 flex flex-col justify-between shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-center">
                  <Scale size={16} />
                </div>
                <h2 className="text-sm font-bold text-[#0F172A]">Status Rekonsiliasi</h2>
              </div>
              <span className="text-[10px] text-slate-400">
                {lastReconciliation ? new Date(lastReconciliation.statement_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "Belum Ada"}
              </span>
            </div>

            {lastReconciliation ? (
              <div className="space-y-2.5">
                <div className="flex justify-between items-center py-2 border-b border-[#F1F5F9] text-xs">
                  <span className="text-slate-500">Saldo Rekening Bank:</span>
                  <span className="font-bold text-[#0F172A] font-mono">
                    Rp{lastReconciliation.bank_balance_idr.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#F1F5F9] text-xs">
                  <span className="text-slate-500">Saldo Kas Sistem:</span>
                  <span className="font-bold text-[#0F172A] font-mono">
                    Rp{lastReconciliation.app_balance_idr.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#F1F5F9] text-xs">
                  <span className="text-slate-500">Selisih:</span>
                  <span
                    className={`font-black font-mono ${
                      lastReconciliation.difference_idr === 0
                        ? "text-teal-600"
                        : "text-red-600"
                    }`}
                  >
                    Rp{lastReconciliation.difference_idr.toLocaleString("id-ID")}
                  </span>
                </div>

                <div
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold ${
                    lastReconciliation.difference_idr === 0
                      ? "bg-teal-50 text-teal-800 border border-teal-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {lastReconciliation.difference_idr === 0 ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                  <span>
                    {lastReconciliation.difference_idr === 0
                      ? "Saldo Rekening & Sistem Sesuai"
                      : `Terdapat Selisih Rp${Math.abs(lastReconciliation.difference_idr).toLocaleString("id-ID")}`}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500 space-y-1">
                <p className="font-semibold">Belum Ada Rekonsiliasi</p>
                <p className="text-[11px] text-slate-400">Lakukan rekonsiliasi bulanan untuk memastikan kecocokan kas bank.</p>
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate("rekonsiliasi")}
            className="w-full mt-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-[#E2E8F0] transition-colors cursor-pointer"
          >
            Buka Rekonsiliasi &rarr;
          </button>
        </div>
      </div>

      {/* Bottom Row: Monthly Chart & Audit Trail */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Monthly Chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-[#0F172A]">Tren Setoran Terverifikasi</h2>
            <p className="text-xs text-slate-400 mt-0.5">Total nominal iuran masuk per bulan</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyChartData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="bulan"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#94A3B8" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#94A3B8" }}
                tickFormatter={(v) => `Rp${v / 1000}k`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
              <Bar dataKey="setoran" fill="#0F766E" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Audit Log */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-[#E2E8F0]">
            <h2 className="text-sm font-bold text-[#0F172A]">Aktivitas Audit Terbaru</h2>
            <p className="text-xs text-slate-400 mt-0.5">Catatan mutasi &amp; aksi bendahara</p>
          </div>

          <div className="divide-y divide-[#F1F5F9]">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">Belum ada catatan aktivitas.</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-4 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0F172A] font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {log.metadata && (
                    <p className="text-slate-500 text-[11px] truncate">
                      {JSON.stringify(log.metadata)}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
