import { apiClient, requestWithMeta } from "./http";
import type { ApiResponse } from "./http";

export type AuthUser = {
  id: number;
  email: string;
  name: string;
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
