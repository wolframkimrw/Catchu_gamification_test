import { apiClient, requestWithMeta } from "./http";
import type { ApiResponse } from "./http";

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  is_staff?: boolean;
};

export async function loginAccount(params: {
  email: string;
  password: string;
}) {
  const response = await requestWithMeta(
    apiClient.post<
      ApiResponse<{
        status: string;
        user: AuthUser;
      }>
    >("/accounts/login/", params)
  );
  return response;
}

export async function signupAccount(params: {
  name: string;
  email: string;
  password: string;
  password_confirm: string;
}) {
  const response = await requestWithMeta(
    apiClient.post<
      ApiResponse<{
        status: string;
        user: AuthUser;
      }>
    >("/accounts/signup/", params)
  );
  return response;
}

export async function resetPassword(params: { email: string }) {
  const response = await requestWithMeta(
    apiClient.post<
      ApiResponse<{
        status: string;
      }>
    >("/accounts/password/reset/", params)
  );
  return response;
}

export type AdminUser = {
  id: number;
  email: string;
  name: string;
  is_active: boolean;
  is_staff: boolean;
  created_at: string;
  profile: { nickname: string; level: number; exp: number } | null;
};

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const response = await requestWithMeta(
    apiClient.get<ApiResponse<{ users: AdminUser[] }>>("/accounts/admin/users/")
  );
  return response.users || [];
}
