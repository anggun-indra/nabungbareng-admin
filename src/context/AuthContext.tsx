import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase, AdminSessionInfo, ManagedGroup } from "../lib/supabase";

export type AdminRole = "super_admin" | "group_admin";

interface AuthContextType {
  user: User | null;
  adminInfo: AdminSessionInfo | null;
  role: AdminRole | null;
  activeGroup: ManagedGroup | null;
  setActiveGroup: (group: ManagedGroup | null) => void;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: AdminRole }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACTIVE_GROUP_KEY = "nabungbareng_admin_active_group_id";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [adminInfo, setAdminInfo] = useState<AdminSessionInfo | null>(null);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [activeGroup, setActiveGroupState] = useState<ManagedGroup | null>(null);
  const [loading, setLoading] = useState(true);

  const setActiveGroup = (group: ManagedGroup | null) => {
    setActiveGroupState(group);
    if (group) {
      localStorage.setItem(ACTIVE_GROUP_KEY, group.group_id);
    } else {
      localStorage.removeItem(ACTIVE_GROUP_KEY);
    }
  };

  const fetchAdminSession = async (currentUser: User | null): Promise<AdminSessionInfo | null> => {
    if (!currentUser) {
      setAdminInfo(null);
      setRole(null);
      setActiveGroupState(null);
      return null;
    }

    try {
      const { data, error } = await supabase.rpc("get_admin_session_info");
      if (error) {
        console.error("Error fetching admin session info:", error);
        return null;
      }

      const info = data as AdminSessionInfo;

      if (!info || !info.has_admin_access) {
        // User does not have any admin access
        setAdminInfo(info || null);
        setRole(null);
        setActiveGroupState(null);
        return info;
      }

      setAdminInfo(info);

      if (info.is_super_admin) {
        setRole("super_admin");
        setActiveGroupState(null);
      } else if (info.is_group_admin && info.managed_groups.length > 0) {
        setRole("group_admin");
        // Restore previous selected group if valid, otherwise select the first group
        const savedGroupId = localStorage.getItem(ACTIVE_GROUP_KEY);
        const matched = info.managed_groups.find((g) => g.group_id === savedGroupId);
        const selected = matched || info.managed_groups[0];
        setActiveGroupState(selected);
        localStorage.setItem(ACTIVE_GROUP_KEY, selected.group_id);
      }

      return info;
    } catch (err) {
      console.error("Failed to load admin session:", err);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;
        if (mounted) {
          setUser(currentUser);
          if (currentUser) {
            const info = await fetchAdminSession(currentUser);
            if (info && !info.has_admin_access) {
              await supabase.auth.signOut();
              setUser(null);
              setAdminInfo(null);
              setRole(null);
            }
          }
        }
      } catch (err) {
        console.error("Error initializing auth:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      if (!mounted) return;

      setUser(currentUser);

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (currentUser) {
          const info = await fetchAdminSession(currentUser);
          if (info && !info.has_admin_access) {
            await supabase.auth.signOut();
            setUser(null);
            setAdminInfo(null);
            setRole(null);
          }
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setAdminInfo(null);
        setRole(null);
        setActiveGroupState(null);
        localStorage.removeItem(ACTIVE_GROUP_KEY);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; role?: AdminRole }> => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        let friendlyMsg = error.message;
        if (error.message.includes("Invalid login credentials")) {
          friendlyMsg = "Email atau kata sandi salah. Silakan periksa kembali.";
        } else if (error.message.includes("Email not confirmed")) {
          friendlyMsg = "Email belum dikonfirmasi. Silakan periksa kotak masuk email Anda.";
        }
        return { success: false, error: friendlyMsg };
      }

      if (!data.user) {
        return { success: false, error: "Gagal memproses sesi login." };
      }

      setUser(data.user);

      // Verify admin authorization
      const info = await fetchAdminSession(data.user);

      if (!info || !info.has_admin_access) {
        await supabase.auth.signOut();
        setUser(null);
        setAdminInfo(null);
        setRole(null);
        return {
          success: false,
          error: "Akses Ditolak: Akun Anda tidak memiliki izin Administrator (bukan Super Admin ataupun Admin Group).",
        };
      }

      const determinedRole: AdminRole = info.is_super_admin ? "super_admin" : "group_admin";
      return { success: true, role: determinedRole };
    } catch (err: any) {
      console.error("Login exception:", err);
      return {
        success: false,
        error: err?.message || "Terjadi kesalahan pada sistem saat login.",
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setUser(null);
      setAdminInfo(null);
      setRole(null);
      setActiveGroupState(null);
      localStorage.removeItem(ACTIVE_GROUP_KEY);
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    if (user) {
      await fetchAdminSession(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        adminInfo,
        role,
        activeGroup,
        setActiveGroup,
        loading,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
