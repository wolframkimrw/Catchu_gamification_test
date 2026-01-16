import { apiClient, requestWithMeta, setCsrfToken } from "./http";
import type { ApiResponse } from "./http";

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  is_staff?: boolean;
  provider?: string;
};

export async function fetchCsrfToken() {
  const response = await requestWithMeta(
    apiClient.get<ApiResponse<{ token: string }>>("/accounts/csrf/")
  );
  if (response.token) {
    setCsrfToken(response.token);
    apiClient.defaults.headers.common["X-CSRFToken"] = response.token;
  }
  return response.token;
}

export async function loginAccount(params: {
  email: string;
  password: string;
  csrfToken?: string | null;
}) {
  const { csrfToken, ...body } = params;
  const response = await requestWithMeta(
    apiClient.post<
      ApiResponse<{
        status: string;
        user: AuthUser;
      }>
    >("/accounts/login/", body, {
      headers: csrfToken ? { "X-CSRFToken": csrfToken } : undefined,
    })
  );
  return response;
}

export async function signupAccount(params: {
  name: string;
  email: string;
  password: string;
  password_confirm: string;
  csrfToken?: string | null;
}) {
  const { csrfToken, ...body } = params;
  const response = await requestWithMeta(
    apiClient.post<
      ApiResponse<{
        status: string;
        user: AuthUser;
      }>
    >("/accounts/signup/", body, {
      headers: csrfToken ? { "X-CSRFToken": csrfToken } : undefined,
    })
  );
  return response;
}

export async function resetPassword(params: { email: string; csrfToken?: string | null }) {
  const { csrfToken, ...body } = params;
  const response = await requestWithMeta(
    apiClient.post<
      ApiResponse<{
        status: string;
      }>
    >("/accounts/password/reset/", body, {
      headers: csrfToken ? { "X-CSRFToken": csrfToken } : undefined,
    })
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

export async function updateAdminUser(
  userId: number,
  payload: { is_active?: boolean; is_staff?: boolean }
): Promise<AdminUser> {
  const response = await requestWithMeta(
    apiClient.patch<ApiResponse<{ user: AdminUser }>>(`/accounts/admin/users/${userId}/`, payload)
  );
  return response.user;
}
