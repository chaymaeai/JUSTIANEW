import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { RegisterData, User, UserRole } from "@/types/auth";
import { getApiErrorMessage } from "@/services/api";
import * as authService from "@/services/authService";

export type LoginOptions = {
  /** Defaults to client. Provider = expert workspace; admin = full fournisseur + Equipe (gestion experts). */
  role?: Extract<UserRole, "client" | "provider" | "admin">;
};

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, options?: LoginOptions) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

const TOKEN_KEY = "justia_token";
const USER_KEY = "justia_user";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const REFRESH_KEY = "justia_refresh_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);

    if (token && rawUser) {
      try {
        setUser(JSON.parse(rawUser) as User);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, options?: LoginOptions) => {
    setIsLoading(true);
    try {
      const role: "client" | "expert" | "admin" = 
        options?.role === "admin" ? "admin" : 
        options?.role === "provider" ? "expert" : 
        "client";
      
      const result = await authService.login(email, password, role);
      const expectedRole: UserRole = options?.role ?? "client";
      const actualRole = result.user.role;
      
     const roleOk =
  expectedRole === "client"
    ? actualRole === "client"
    : expectedRole === "provider"
      ? actualRole === "expert" || actualRole === "provider" || actualRole === "admin"
      : actualRole === "admin";
      if (!roleOk) {
        throw new Error("Vous n'avez pas acces a cet espace.");
      }
      localStorage.setItem(TOKEN_KEY, result.token);
      localStorage.setItem(REFRESH_KEY, result.refresh);
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      setUser(result.user);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, "Identifiants incorrects."));
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setIsLoading(true);
    try {
      await authService.register(data);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout().catch(() => undefined);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      logout,
    }),
    [isLoading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
