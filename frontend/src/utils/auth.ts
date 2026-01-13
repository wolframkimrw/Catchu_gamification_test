import type { AuthUser } from "../api/accounts";

const STORAGE_KEY = "catchu_auth_user";

export const getStoredUser = (): AuthUser | null => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export const setStoredUser = (user: AuthUser) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("authchange"));
};

export const clearStoredUser = () => {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("authchange"));
};
