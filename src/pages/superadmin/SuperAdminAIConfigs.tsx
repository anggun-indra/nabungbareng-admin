import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Bot,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Globe,
  Sliders,
  ShieldCheck,
  Server,
  Layers,
  ArrowRight,
  HelpCircle,
  Cpu,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

interface AIConfigItem {
  id: string;
  provider: string;
  is_enabled: boolean;
  api_key: string;
  base_url: string | null;
  model_name: string;
  priority: number;
  timeout_ms: number;
  metadata?: any;
  updated_at?: string;
}

export default function SuperAdminAIConfigs() {
  const [configs, setConfigs] = useState<AIConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form states per provider
  const [formData, setFormData] = useState<Record<string, AIConfigItem>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; message: string; latency_ms?: number }>
  >({});

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadConfigs = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data, error } = await supabase.rpc("superadmin_get_ai_configs");
      if (error) throw error;

      if (data) {
        const list = data as AIConfigItem[];
        setConfigs(list);

        const formMap: Record<string, AIConfigItem> = {};
        list.forEach((item) => {
          formMap[item.id] = { ...item };
        });
        setFormData(formMap);
      }
    } catch (err: any) {
      console.error("Error loading AI configs:", err);
      showToast("error", err.message || "Gagal memuat konfigurasi AI.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const handleInputChange = (id: string, field: keyof AIConfigItem, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleCopyKey = (id: string, key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2500);
  };

  const handleSaveConfig = async (id: string) => {
    const item = formData[id];
    if (!item) return;

    if (!item.api_key.trim()) {
      showToast("error", "API Key tidak boleh kosong.");
      return;
    }

    setSavingId(id);
    try {
      const { data, error } = await supabase.rpc("superadmin_save_ai_config", {
        p_id: item.id,
        p_provider: item.provider,
        p_is_enabled: item.is_enabled,
        p_api_key: item.api_key.trim(),
        p_base_url: item.base_url?.trim() || null,
        p_model_name: item.model_name.trim(),
        p_priority: Number(item.priority) || 1,
        p_timeout_ms: Number(item.timeout_ms) || 12000,
        p_metadata: item.metadata || {},
      });

      if (error) throw error;

      showToast("success", `Konfigurasi AI "${id}" berhasil diperbarui!`);
      await loadConfigs();
    } catch (err: any) {
      console.error("Error saving AI config:", err);
      showToast("error", err.message || "Gagal menyimpan konfigurasi.");
    } finally {
      setSavingId(null);
    }
  };

  const handleTestConnection = async (id: string) => {
    const item = formData[id];
    if (!item || !item.api_key.trim()) {
      showToast("error", "Isi API Key terlebih dahulu sebelum menguji.");
      return;
    }

    setTestingId(id);
    setTestResults((prev) => ({ ...prev, [id]: undefined as any }));

    const startTime = performance.now();
    try {
      if (item.provider === "gemini") {
        // Test Gemini API endpoint
        const model = item.model_name || "gemini-2.5-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${item.api_key.trim()}`;
        const res = await fetch(url);
        const data = await res.json();
        const duration = Math.round(performance.now() - startTime);

        if (res.ok) {
          setTestResults((prev) => ({
            ...prev,
            [id]: {
              success: true,
              message: `Terhubung sukses! Model: ${data.displayName || model}`,
              latency_ms: duration,
            },
          }));
          showToast("success", `Koneksi Gemini berhasil diverifikasi (${duration}ms).`);
        } else {
          throw new Error(data.error?.message || `HTTP ${res.status}: Gagal terhubung`);
        }
      } else {
        // Test OpenAI-compatible / Cosmoshub endpoint
        const baseUrl = (item.base_url || "https://api.cosmoshub.tech/v1").replace(/\/$/, "");
        const url = `${baseUrl}/models`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${item.api_key.trim()}`,
          },
        });
        const duration = Math.round(performance.now() - startTime);

        if (res.ok) {
          setTestResults((prev) => ({
            ...prev,
            [id]: {
              success: true,
              message: `Terhubung sukses ke ${baseUrl}!`,
              latency_ms: duration,
            },
          }));
          showToast("success", `Koneksi Cosmoshub/OpenAI berhasil (${duration}ms).`);
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `HTTP ${res.status}: Autentikasi gagal`);
        }
      }
    } catch (err: any) {
      const duration = Math.round(performance.now() - startTime);
      setTestResults((prev) => ({
        ...prev,
        [id]: {
          success: false,
          message: err.message || "Koneksi gagal",
          latency_ms: duration,
        },
      }));
      showToast("error", `Uji koneksi gagal: ${err.message}`);
    } finally {
      setTestingId(null);
    }
  };

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
      <div className="bg-white border-b border-[#E2E8F0] px-4 sm:px-6 py-4 sm:py-5 sticky top-0 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-purple-50 text-purple-700 rounded-xl flex items-center justify-center font-bold">
              <Bot size={18} />
            </div>
            <h1 className="text-lg sm:text-xl font-black text-[#0F172A]">Pengaturan API Key &amp; Model AI</h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              Super Admin
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Konfigurasi kredensial Google Gemini (Primary) dan Cosmoshub / OpenAI-Compatible (Fallback) untuk OCR struk setoran.
          </p>
        </div>

        <button
          onClick={() => loadConfigs(true)}
          disabled={refreshing}
          className="flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin text-purple-600" : ""} />
          <span>{refreshing ? "Menyinkronkan..." : "Segarkan"}</span>
        </button>
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-6xl w-full mx-auto">
        {/* ─── AI ARCHITECTURE BANNER ─────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#4C1D95] rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 rounded-full bg-purple-500/10 -translate-y-20 translate-x-20 blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-900/60 border border-purple-400/30 text-purple-300 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={12} /> Dual-Provider AI Architecture
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white">
              Sistem AI OCR Cerdas Berkecepatan Tinggi &amp; Tahan Gagal
            </h2>

            <p className="text-xs sm:text-sm text-purple-200/90 leading-relaxed max-w-3xl">
              Sistem menggunakan <strong>Google Gemini</strong> sebagai engine utama. Jika terjadi lonjakan antrean atau limit kuota, sistem secara otomatis mengalihkan proses ke <strong>Cosmoshub AI (Fallback)</strong> tanpa gangguan bagi admin dan siswa.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Primary: Google Gemini</p>
                  <p className="text-[11px] text-purple-200">Kecepatan tinggi, akurasi OCR 98%+</p>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Fallback: Cosmoshub / OpenAI</p>
                  <p className="text-[11px] text-purple-200">Jaminan ketersediaan 24/7 saat fallback</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── PROVIDER CARDS ─────────────────────────────────────────────── */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3 bg-white rounded-3xl border border-slate-200">
            <RefreshCw size={28} className="mx-auto text-purple-600 animate-spin" />
            <p className="text-xs font-bold text-slate-600">Memuat konfigurasi AI dari database...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {configs.map((config) => {
              const current = formData[config.id] || config;
              const isGemini = current.provider === "gemini";
              const isShowKey = showKeys[config.id] || false;
              const testRes = testResults[config.id];

              return (
                <div
                  key={config.id}
                  className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-6 space-y-5 flex flex-col justify-between"
                >
                  <div className="space-y-5">
                    {/* Card Header */}
                    <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold ${
                            isGemini
                              ? "bg-blue-50 text-blue-600"
                              : "bg-purple-50 text-purple-600"
                          }`}
                        >
                          {isGemini ? <Zap size={22} /> : <Bot size={22} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-base text-[#0F172A]">
                              {isGemini ? "Google Gemini Vision" : "Cosmoshub AI"}
                            </h3>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isGemini
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-purple-100 text-purple-800"
                              }`}
                            >
                              {isGemini ? "Primary #1" : "Fallback #2"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {config.id}</p>
                        </div>
                      </div>

                      {/* Enable/Disable Toggle */}
                      <button
                        type="button"
                        onClick={() => handleInputChange(config.id, "is_enabled", !current.is_enabled)}
                        className="flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                        title={current.is_enabled ? "Aktif" : "Nonaktif"}
                      >
                        {current.is_enabled ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Aktif
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                            Nonaktif
                          </span>
                        )}
                      </button>
                    </div>

                    {/* API Key Input */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <KeyRound size={13} className="text-slate-400" />
                          <span>API Key Token</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyKey(config.id, current.api_key)}
                            className="text-[11px] font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedKeyId === config.id ? (
                              <>
                                <Check size={12} className="text-teal-600" />
                                <span className="text-teal-600">Disalin!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Salin</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        <input
                          type={isShowKey ? "text" : "password"}
                          value={current.api_key}
                          onChange={(e) => handleInputChange(config.id, "api_key", e.target.value)}
                          placeholder="Masukkan API Key..."
                          className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowKeys((prev) => ({ ...prev, [config.id]: !isShowKey }))
                          }
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {isShowKey ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    {/* Base URL (if not standard Gemini) */}
                    {!isGemini && (
                      <div>
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                          <Globe size={13} className="text-slate-400" />
                          <span>Base URL (OpenAI-Compatible Endpoint)</span>
                        </label>
                        <input
                          type="text"
                          value={current.base_url || ""}
                          onChange={(e) => handleInputChange(config.id, "base_url", e.target.value)}
                          placeholder="https://api.cosmoshub.tech/v1"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                        />
                      </div>
                    )}

                    {/* Model Name & Presets */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                        <Cpu size={13} className="text-slate-400" />
                        <span>Nama Model AI</span>
                      </label>
                      <input
                        type="text"
                        value={current.model_name}
                        onChange={(e) => handleInputChange(config.id, "model_name", e.target.value)}
                        placeholder={isGemini ? "gemini-2.5-flash" : "gemini-3.7-flash"}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                      />

                      {/* Quick Model Presets */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-[10px] text-slate-400 font-bold">Preset:</span>
                        {(isGemini
                          ? ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.5-pro"]
                          : ["gemini-3.7-flash", "gpt-4o-mini", "gpt-4o"]
                        ).map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleInputChange(config.id, "model_name", preset)}
                            className={`px-2 py-0.5 rounded-lg text-[10.5px] font-mono font-bold transition-colors cursor-pointer ${
                              current.model_name === preset
                                ? "bg-purple-100 text-purple-800 border border-purple-300"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Advanced Grid: Priority & Timeout */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          Prioritas Eksekusi
                        </label>
                        <select
                          value={current.priority}
                          onChange={(e) =>
                            handleInputChange(config.id, "priority", parseInt(e.target.value) || 1)
                          }
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                        >
                          <option value="1">1 (Utama / Primary)</option>
                          <option value="2">2 (Cadangan / Fallback)</option>
                          <option value="3">3 (Pilihan Ketiga)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          Timeout Request (ms)
                        </label>
                        <input
                          type="number"
                          value={current.timeout_ms}
                          onChange={(e) =>
                            handleInputChange(config.id, "timeout_ms", parseInt(e.target.value) || 12000)
                          }
                          step={1000}
                          min={3000}
                          max={60000}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    {/* Test Results Output */}
                    {testRes && (
                      <div
                        className={`p-3.5 rounded-2xl text-xs border flex items-start gap-2.5 animate-in fade-in ${
                          testRes.success
                            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                            : "bg-red-50 border-red-200 text-red-900"
                        }`}
                      >
                        {testRes.success ? (
                          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-bold">{testRes.message}</p>
                          {testRes.latency_ms && (
                            <p className="text-[10.5px] text-slate-500 font-mono mt-0.5">
                              Latensi: {testRes.latency_ms} ms
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center gap-2 pt-5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleTestConnection(config.id)}
                      disabled={testingId === config.id || savingId === config.id}
                      className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Zap size={13} className={testingId === config.id ? "animate-spin text-purple-600" : ""} />
                      <span>{testingId === config.id ? "Menguji..." : "Uji Koneksi"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveConfig(config.id)}
                      disabled={savingId === config.id || testingId === config.id}
                      className="flex-1 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-900/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {savingId === config.id ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <Check size={14} />
                          <span>Simpan Pengaturan</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
