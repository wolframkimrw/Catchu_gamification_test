import { useCallback, useEffect, useState } from "react";
import type { AuthUser } from "../api/accounts";
import { clearStoredUser, getStoredUser } from "../utils/auth";

export function useAuthUser() {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());

  const refresh = useCallback(() => {
    setUser(getStoredUser());
  }, []);

  const logout = useCallback(() => {
    clearStoredUser();
    setUser(null);
  }, []);

  useEffect(() => {
    refresh();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === "catchu_auth_user") {
        refresh();
      }
    };
    const handleAuthChange = () => refresh();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("authchange", handleAuthChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("authchange", handleAuthChange);
    };
  }, [refresh]);

  return { user, logout, refresh };
}
