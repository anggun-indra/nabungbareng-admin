import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing.");
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export interface ManagedGroup {
  group_id: string;
  group_name: string;
  school_name: string | null;
  public_slug: string | null;
  role: "group_admin" | "treasurer";
  status: string;
  monthly_target_idr: number;
  start_month?: string | null;
  logo_url?: string | null;
  member_id: string;
}

export interface AdminSessionInfo {
  authenticated: boolean;
  user_id?: string;
  display_name?: string;
  email?: string;
  avatar_url?: string | null;
  is_super_admin: boolean;
  is_group_admin: boolean;
  has_admin_access: boolean;
  managed_groups: ManagedGroup[];
  error?: string;
}
