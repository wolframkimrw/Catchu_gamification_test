// src/api/http.ts
import axios from "axios";
import type { AxiosInstance, AxiosResponse } from "axios";

export interface Pagination {
  page: number;
  page_size: number;
  total: number;
  has_next: boolean;
  has_previous?: boolean | null;
}

export interface Meta {
  api: string;
  success: boolean;
  code: string;
  message: string | null;
  pagination?: Pagination | null;
}

export interface ApiResponse<T> {
  meta: Meta;
  data: T;
}

export class ApiError extends Error {
  meta: Meta;
  status?: number;

  constructor(meta: Meta, status?: number) {
    super(meta.message || meta.code);
    this.meta = meta;
    this.status = status;
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 10000,
  withCredentials: true,
});

export const getBackendOrigin = () => {
  const base = import.meta.env.VITE_API_BASE_URL || "/api";
  if (base.startsWith("http://") || base.startsWith("https://")) {
    return new URL(base).origin;
  }
  return window.location.origin;
};

export const resolveMediaUrl = (url: string) => {
  if (url.startsWith("/media/")) {
    return `${getBackendOrigin()}${url}`;
  }
  return url;
};

const CSRF_HEADER_NAME = "X-CSRFToken";
const SAFE_METHODS = new Set(["get", "head", "options", "trace"]);

function getCookie(name: string): string | null {
  if (!document.cookie) {
    return null;
  }
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [rawName, ...valueParts] = cookie.trim().split("=");
    if (rawName === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }
  return null;
}

apiClient.interceptors.request.use((config) => {
  const method = config.method?.toLowerCase();
  if (method && !SAFE_METHODS.has(method)) {
    const csrfToken = getCookie("csrftoken");
    if (csrfToken) {
      config.headers = config.headers ?? {};
      config.headers[CSRF_HEADER_NAME] = csrfToken;
    }
  }
  return config;
});

export async function requestWithMeta<T>(
  promise: Promise<AxiosResponse<ApiResponse<T>>>
): Promise<T> {
  const response = await promise;
  const payload = response.data as ApiResponse<T> | T | null;
  if (!payload || typeof payload !== "object") {
    throw new Error("API 응답이 비어있습니다.");
  }

  // 메타 래핑이 없는 응답도 허용 (예: 외부 API, 레거시 엔드포인트)
  if (!("meta" in payload)) {
    return payload as T;
  }

  const { meta, data } = payload as ApiResponse<T>;
  if (!meta || !meta.success) {
    throw new ApiError(meta, response.status);
  }

  return data;
}
