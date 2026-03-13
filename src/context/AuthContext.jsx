import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(undefined);
const AUTH_STORAGE_KEY = "ecoclear_local_auth_session";

export function normalizeRole(role) {
  const value = String(role ?? "")
    .trim()
    .toLowerCase();

  if (value === "admin") return "admin";
  if (value === "scrutiny_team" || value === "scrutiny") return "scrutiny_team";
  if (value === "mom_team" || value === "mom") return "mom_team";
  return "proponent";
}

export function getRouteForRole(role) {
  const normalized = normalizeRole(role);
  if (normalized === "admin") return "/admin-dashboard";
  if (normalized === "scrutiny_team") return "/scrutiny-dashboard";
  if (normalized === "mom_team") return "/mom-dashboard";
  return "/proponent-dashboard";
}

function normalizeUserRecord(row) {
  return {
    id: row?.id ?? "",
    username: row?.username ?? "",
    email: row?.email ?? "",
    mobile_no: row?.mobile_no ?? "",
    full_name: row?.full_name ?? "",
    role: normalizeRole(row?.role),
    created_at: row?.created_at ?? null,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) {
        setLoading(false);
        return;
      }

      const parsed = JSON.parse(raw);
      if (parsed?.user && parsed?.profile) {
        setUser(parsed.user);
        setProfile(parsed.profile);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Failed to restore local auth session.", error);
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const persistSession = (nextUser, nextProfile) => {
    if (!nextUser || !nextProfile) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ user: nextUser, profile: nextProfile }),
    );
  };

  const signInWithCredentials = async ({ email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase
      .from("users")
      .select("id, username, email, mobile_no, full_name, role, created_at, password_hash")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (error) return { data: null, error };
    if (!data || data.password_hash !== password) {
      return { data: null, error: { message: "Invalid email or password." } };
    }

    const nextProfile = normalizeUserRecord(data);
    const nextUser = {
      id: nextProfile.id,
      email: nextProfile.email,
      username: nextProfile.username,
    };

    setUser(nextUser);
    setProfile(nextProfile);
    persistSession(nextUser, nextProfile);

    return { data: { user: nextUser, profile: nextProfile }, error: null };
  };

  const signUpWithCredentials = async (payload) => {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const username = payload.username.trim().toLowerCase();

    const { data, error } = await supabase
      .from("users")
      .insert({
        username,
        email: normalizedEmail,
        mobile_no: payload.mobile_no?.trim() ?? null,
        full_name: payload.full_name?.trim() ?? null,
        password_hash: payload.password,
        role: normalizeRole(payload.role),
      })
      .select("id, username, email, mobile_no, full_name, role, created_at")
      .single();

    if (error) return { data: null, error };

    const nextProfile = normalizeUserRecord(data);
    const nextUser = {
      id: nextProfile.id,
      email: nextProfile.email,
      username: nextProfile.username,
    };

    setUser(nextUser);
    setProfile(nextProfile);
    persistSession(nextUser, nextProfile);

    return { data: { user: nextUser, profile: nextProfile }, error: null };
  };

  const signOut = async () => {
    setUser(null);
    setProfile(null);
    persistSession(null, null);
  };

  const value = useMemo(
    () => ({
      user,
      profile,
      role: normalizeRole(profile?.role),
      loading,
      isAuthenticated: Boolean(user),
      signInWithCredentials,
      signUpWithCredentials,
      signOut,
    }),
    [user, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
