import React, { useState, useEffect } from "react";
import {
  Search,
  X,
  Download,
  ChevronUp,
  ChevronDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Users,
  Building2,
  FileText,
  CreditCard,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import MemberKartuIuranModal from "../components/MemberKartuIuranModal";

interface StudentItem {
  id: string;
  user_id: string;
  student_name: string;
  parent_name: string;
  parent_email: string;
  balance_idr: number;
  monthly_deposit_idr: number;
  status: "lunas" | "aktif" | "nunggak";
  paid_months: string[];
  last_activity_date: string;
  created_at: string;
  effective_start_month?: string;
}

interface StudentJournalItem {
  id: string;
  tipe: "setoran" | "pengeluaran";
  label: string;
  nominal: number;
  tanggal: string;
  status: string;
}

const statusClass: Record<string, string> = {
  aktif: "bg-teal-50 text-teal-700 border border-teal-200",
  nunggak: "bg-red-50 text-red-700 border border-red-200",
  lunas: "bg-blue-50 text-blue-700 border border-blue-200",
};

const statusLabel: Record<string, string> = {
  aktif: "Aktif Menabung",
  nunggak: "Belum Iuran",
  lunas: "Lunas Bulan Ini",
};

function StudentDetailDrawer({
  student,
  groupId,
  onClose,
}: {
  student: StudentItem;
  groupId: string;
  onClose: () => void;
}) {
  const [journal, setJournal] = useState<StudentJournalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadJournal = async () => {
      setLoading(true);
      try {
        const items: StudentJournalItem[] = [];

        // 1. Fetch deposits
        const { data: subs } = await supabase
          .from("payment_submissions")
          .select("id, amount_idr, transfer_date, period_label, period_allocations, status")
          .eq("group_member_id", student.id)
          .order("transfer_date", { ascending: false });

        if (subs) {
          subs.forEach((s) => {
            const allocations = (s.period_allocations as Array<{ period: string; amount_idr: number }>) || [];
            if (allocations && allocations.length > 1) {
              allocations.forEach((alloc, idx) => {
                items.push({
                  id: `${s.id}-p${idx}`,
                  tipe: "setoran",
                  label: `Iuran ${alloc.period} (Bagian ${idx + 1}/${allocations.length})`,
                  nominal: Number(alloc.amount_idr),
                  tanggal: s.transfer_date,
                  status: s.status === "verified" ? "Terverifikasi" : s.status,
                });
              });
            } else {
              items.push({
                id: s.id,
                tipe: "setoran",
                label: `Setoran Iuran ${s.period_label}`,
                nominal: Number(s.amount_idr),
                tanggal: s.transfer_date,
                status: s.status === "verified" ? "Terverifikasi" : s.status,
              });
            }
          });
        }

        // 2. Fetch expenses allocated to this member
        const { data: allocs } = await supabase
          .from("expense_allocations")
          .select(`
            id,
            amount_idr,
            created_at,
            expenses (
              description,
              expense_date,
              category
            )
          `)
          .eq("group_member_id", student.id)
          .order("created_at", { ascending: false });

        if (allocs) {
          allocs.forEach((a: any) => {
            const exp = a.expenses;
            if (exp) {
              items.push({
                id: a.id,
                tipe: "pengeluaran",
                label: `Biaya: ${exp.description}`,
                nominal: -Number(a.amount_idr),
                tanggal: exp.expense_date || a.created_at,
                status: "Diposting",
              });
            }
          });
        }

        // Sort all by date descending
        items.sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));
        setJournal(items);
      } catch (err) {
        console.error("Error loading member journal:", err);
      } finally {
        setLoading(false);
      }
    };

    loadJournal();
  }, [student.id, groupId]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-fade-in">
      <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col animate-slide-left">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              {student.student_name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#0F172A]">{student.student_name}</h3>
              <p className="text-xs text-slate-400">Akun: {student.parent_name} ({student.parent_email})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Balance Overview Card */}
        <div className="p-6 border-b border-[#E2E8F0] space-y-4">
          <div className="bg-gradient-to-br from-slate-900 via-[#1E293B] to-slate-900 rounded-2xl p-5 text-white shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
              <span>Saldo Simpanan Member</span>
              <span className="text-emerald-400 flex items-center gap-1 font-mono">
                <CheckCircle size={12} /> Terverifikasi
              </span>
            </div>
            <p className="text-3xl font-black font-mono">Rp{student.balance_idr.toLocaleString("id-ID")}</p>
            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-slate-300">
              <span>Setoran Bulan Ini:</span>
              <span className="font-bold text-emerald-400 font-mono">
                Rp{student.monthly_deposit_idr.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold ${statusClass[student.status]}`}>
              <CheckCircle size={14} />
              <span>{statusLabel[student.status]}</span>
            </div>

            {student.paid_months && student.paid_months.length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Bulan Iuran Terbayar ({student.paid_months.length} Bulan):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {student.paid_months.map((m) => (
                    <span
                      key={m}
                      className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold"
                    >
                      ✓ {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timeline / Mutations */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Riwayat Transaksi Member
          </h4>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : journal.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Belum ada mutasi transaksi untuk member ini.
            </div>
          ) : (
            <div className="space-y-3">
              {journal.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <p className="font-bold text-[#0F172A]">{item.label}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(item.tanggal).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className={`font-black font-mono ${
                        item.nominal > 0 ? "text-[#0F766E]" : "text-red-600"
                      }`}
                    >
                      {item.nominal > 0 ? "+" : ""}Rp{Math.abs(item.nominal).toLocaleString("id-ID")}
                    </p>
                    <span className="text-[10px] text-slate-400">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E2E8F0] bg-slate-50 text-center">
          <p className="text-[11px] text-slate-400">
            Perubahan saldo member terjadi otomatis saat verifikasi setoran atau posting pengeluaran kas.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SiswaSaldo() {
  const { activeGroup } = useAuth();

  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [sortKey, setSortKey] = useState<"nama" | "saldo">("nama");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [selectedMemberForCard, setSelectedMemberForCard] = useState<StudentItem | null>(null);

  const loadStudents = async () => {
    if (!activeGroup?.group_id) return;
    setLoading(true);

    try {
      const targetIdr = activeGroup.monthly_target_idr || 25000;

      // 1. Fetch group members
      const { data: membersData, error: membersErr } = await supabase
        .from("group_members")
        .select("id, user_id, student_name, display_name, created_at")
        .eq("group_id", activeGroup.group_id)
        .eq("role", "member")
        .eq("active", true)
        .order("student_name", { ascending: true });

      if (membersErr) {
        console.error("membersErr:", membersErr);
        throw membersErr;
      }

      // 2. Fetch member balances for this group
      const { data: balancesData, error: balancesErr } = await supabase
        .from("member_balances")
        .select("group_member_id, balance_idr")
        .eq("group_id", activeGroup.group_id);

      if (balancesErr) console.warn("Balances fetch warning:", balancesErr);

      // 3. Fetch verified payment submissions for this group
      const { data: paymentsData, error: paymentsErr } = await supabase
        .from("payment_submissions")
        .select("group_member_id, amount_idr, transfer_date, period_label, period_allocations, status")
        .eq("group_id", activeGroup.group_id)
        .in("status", ["verified", "Disetujui"]);

      if (paymentsErr) console.warn("Payments fetch warning:", paymentsErr);

      // 4. Fetch profiles for email
      const userIds = (membersData || []).map((m: any) => m.user_id).filter(Boolean);
      const profilesMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", userIds);
        if (profilesData) {
          profilesData.forEach((p: any) => profilesMap.set(p.id, p.email));
        }
      }

      const balancesMap = new Map<string, number>();
      if (balancesData) {
        balancesData.forEach((b: any) => balancesMap.set(b.group_member_id, Number(b.balance_idr)));
      }

      const paymentsMap = new Map<string, any[]>();
      if (paymentsData) {
        paymentsData.forEach((p: any) => {
          const arr = paymentsMap.get(p.group_member_id) || [];
          arr.push(p);
          paymentsMap.set(p.group_member_id, arr);
        });
      }

      if (membersData) {
        const now = new Date();
        const currentMonthName = `${new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(now)} ${now.getFullYear()}`.toLowerCase();

        const list: StudentItem[] = membersData.map((gm: any) => {
          const balance = balancesMap.get(gm.id) ?? 0;
          const studentName = gm.student_name || gm.display_name || "Member";
          const parentEmail = profilesMap.get(gm.user_id) || "-";
          const parentName = gm.display_name || "Akun Member";

          let monthlyDep = 0;
          let lastDate = gm.created_at;
          const paidMonthsSet = new Set<string>();

          const subs = paymentsMap.get(gm.id) || [];
          subs.forEach((s) => {
            if (s.transfer_date > lastDate) lastDate = s.transfer_date;

            const allocs = s.period_allocations as Array<{ period: string; amount_idr: number }>;
            if (allocs && allocs.length > 0) {
              allocs.forEach((a) => {
                paidMonthsSet.add(a.period.trim());
                if (a.period.trim().toLowerCase() === currentMonthName) {
                  monthlyDep += Number(a.amount_idr);
                }
              });
            } else if (s.period_label) {
              s.period_label.split(",").forEach((p: string) => {
                paidMonthsSet.add(p.trim());
                if (p.trim().toLowerCase() === currentMonthName) {
                  monthlyDep += Number(s.amount_idr);
                }
              });
            }
          });

          let status: "lunas" | "aktif" | "nunggak" = "nunggak";
          if (monthlyDep >= targetIdr) {
            status = "lunas";
          } else if (monthlyDep > 0 || balance > 0) {
            status = "aktif";
          }

          return {
            id: gm.id,
            user_id: gm.user_id,
            student_name: studentName,
            parent_name: parentName,
            parent_email: parentEmail,
            balance_idr: Number(balance),
            monthly_deposit_idr: monthlyDep,
            status,
            paid_months: Array.from(paidMonthsSet),
            last_activity_date: lastDate,
            created_at: gm.created_at,
            effective_start_month: gm.created_at ? gm.created_at.slice(0, 7) : undefined,
          };
        });

        setStudents(list);
      }
    } catch (err) {
      console.error("Error loading members:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [activeGroup?.group_id]);

  const handleExportCSV = () => {
    if (students.length === 0) return;

    const headers = [
      "Nama Member",
      "Akun Login",
      "Email",
      "Saldo Simpanan (Rp)",
      "Setoran Bulan Ini (Rp)",
      "Status Iuran",
      "Jumlah Bulan Lunas",
      "Aktivitas Terakhir",
    ];

    const rows = students.map((s) => [
      `"${s.student_name}"`,
      `"${s.parent_name}"`,
      `"${s.parent_email}"`,
      s.balance_idr,
      s.monthly_deposit_idr,
      `"${statusLabel[s.status]}"`,
      s.paid_months?.length || 0,
      `"${new Date(s.last_activity_date).toISOString().split("T")[0]}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `buku_induk_member_${activeGroup?.group_name || "tabungan"}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = students
    .filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
        s.student_name.toLowerCase().includes(q) ||
        s.parent_name.toLowerCase().includes(q) ||
        s.parent_email.toLowerCase().includes(q);

      const matchStatus = filterStatus === "semua" ? true : s.status === filterStatus;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortKey === "nama") return a.student_name.localeCompare(b.student_name) * mul;
      return (a.balance_idr - b.balance_idr) * mul;
    });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedStudents = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, pageSize]);

  const toggleSort = (key: "nama" | "saldo") => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: "nama" | "saldo" }) =>
    sortKey === col ? (
      sortDir === "asc" ? (
        <ChevronUp size={13} className="text-[#0F766E]" />
      ) : (
        <ChevronDown size={13} className="text-[#0F766E]" />
      )
    ) : (
      <ChevronDown size={13} className="text-slate-300" />
    );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#E2E8F0] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
              <Building2 size={12} /> {activeGroup?.group_name || "Grup Tabungan"}
            </span>
            <span className="text-xs text-slate-400">Buku Induk Tabungan Member</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0F172A]">Daftar Member &amp; Saldo</h1>
          <p className="text-xs text-slate-400">
            Total {students.length} member terdaftar · Target Iuran: Rp{Number(activeGroup?.monthly_target_idr || 25000).toLocaleString("id-ID")}/bln
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleExportCSV}
            disabled={students.length === 0}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <Download size={15} />
            <span>Ekspor CSV</span>
          </button>
          <button
            onClick={loadStudents}
            title="Refresh"
            className="p-2.5 border border-[#E2E8F0] rounded-xl text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-9 pr-4 py-2.5 border border-[#E2E8F0] rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E] bg-white shadow-sm"
            placeholder="Cari nama member, akun login, atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {["semua", "lunas", "aktif", "nunggak"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                filterStatus === s
                  ? "bg-[#0F172A] text-white shadow-sm"
                  : "bg-white border border-[#E2E8F0] text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s === "semua" ? "Semua" : statusLabel[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-slate-400 text-xs uppercase font-bold tracking-wider">
                <th
                  className="px-6 py-4 cursor-pointer select-none"
                  onClick={() => toggleSort("nama")}
                >
                  <span className="flex items-center gap-1.5">
                    Nama Member <SortIcon col="nama" />
                  </span>
                </th>
                <th className="px-6 py-4">Akun Login</th>
                <th
                  className="px-6 py-4 text-right cursor-pointer select-none"
                  onClick={() => toggleSort("saldo")}
                >
                  <span className="flex items-center justify-end gap-1.5">
                    Saldo Tabungan <SortIcon col="saldo" />
                  </span>
                </th>
                <th className="px-6 py-4 text-right">Setoran Bulan Ini</th>
                <th className="px-6 py-4 text-center">Status Iuran</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400">
                    <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Memuat data member...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400">
                    <Users size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-xs text-slate-600">Tidak ada member ditemukan</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Gunakan menu Undangan &amp; Akses untuk mengundang anggota bergabung.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-teal-50/40 transition-colors"
                  >
                    <td className="px-6 py-4 font-bold text-[#0F172A] flex items-center gap-3">
                      <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs">
                        {s.student_name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-[#0F172A]">{s.student_name}</span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <p className="font-semibold text-slate-700">{s.parent_name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{s.parent_email}</p>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-[#0F172A] font-mono">
                      Rp{s.balance_idr.toLocaleString("id-ID")}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs">
                      <span className={`font-bold ${s.monthly_deposit_idr > 0 ? "text-[#0F766E]" : "text-slate-300"}`}>
                        {s.monthly_deposit_idr > 0 ? `Rp${s.monthly_deposit_idr.toLocaleString("id-ID")}` : "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block text-[10.5px] font-bold px-2.5 py-0.5 rounded-full ${statusClass[s.status]}`}>
                        {statusLabel[s.status]}
                      </span>
                      {s.paid_months && s.paid_months.length > 0 && (
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">
                          {s.paid_months.length} Bulan Lunas
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(s)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Lihat Mutasi & Saldo"
                        >
                          <FileText size={13} />
                          <span>Detail</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedMemberForCard(s)}
                          className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-[#0F766E] border border-teal-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="Lihat Kartu Iuran Digital"
                        >
                          <CreditCard size={13} />
                          <span>Kartu Iuran</span>
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
              <span>per halaman · Menampilkan {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filtered.length)} dari {filtered.length} member</span>
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

      {/* Detail Drawer */}
      {selectedStudent && (
        <StudentDetailDrawer
          student={selectedStudent}
          groupId={activeGroup?.group_id || ""}
          onClose={() => setSelectedStudent(null)}
        />
      )}

      {/* Member Kartu Iuran Modal */}
      {selectedMemberForCard && activeGroup && (
        <MemberKartuIuranModal
          isOpen={Boolean(selectedMemberForCard)}
          onClose={() => setSelectedMemberForCard(null)}
          member={{
            id: selectedMemberForCard.id,
            student_name: selectedMemberForCard.student_name,
            parent_name: selectedMemberForCard.parent_name,
            parent_email: selectedMemberForCard.parent_email,
            effective_start_month: selectedMemberForCard.effective_start_month,
          }}
          group={{
            id: activeGroup.group_id,
            name: activeGroup.group_name,
            school: activeGroup.school_name,
            logo_url: activeGroup.logo_url,
            target_bulanan: Number(activeGroup.monthly_target_idr || 25000),
            start_month: activeGroup.start_month,
          }}
        />
      )}
    </div>
  );
}
