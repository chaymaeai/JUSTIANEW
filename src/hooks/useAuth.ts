import { useCallback } from "react";
import { useAuth as useAuthContext } from "@/context/AuthContext";
import * as authService from "@/services/authService";
import { getApiErrorMessage } from "@/services/api";

export function useAuth() {
  const ctx = useAuthContext();

  const refreshMe = useCallback(async () => {
    try {
      return await authService.me();
    } catch (e) {
      throw new Error(getApiErrorMessage(e));
    }
  }, []);

  return { ...ctx, refreshMe };
}
