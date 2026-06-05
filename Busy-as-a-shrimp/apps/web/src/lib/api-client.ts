"use client";

import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { loadClientEnv } from "../config/env";
import { useUserStore } from "../stores/user-store";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

interface ApiErrorPayload {
  statusCode?: number;
  message?: string | string[];
  errorCode?: string;
  code?: string;
}

export class ApiClientError extends Error {
  readonly errorCode: string;
  readonly statusCode?: number;
  readonly payload?: ApiErrorPayload;

  constructor(message: string, errorCode: string, statusCode?: number, payload?: ApiErrorPayload) {
    super(message);
    this.name = "ApiClientError";
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.payload = payload;
  }
}

function readCookieToken(cookieKey: string): string {
  if (typeof document === "undefined") {
    return "";
  }
  const chunks = document.cookie.split(";").map((item) => item.trim());
  const found = chunks.find((item) => item.startsWith(`${cookieKey}=`));
  if (!found) {
    return "";
  }
  return decodeURIComponent(found.split("=")[1] ?? "");
}

function attachAuthHeader(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const tokenFromStore = useUserStore.getState().getValidToken();
  const tokenFromCookie = readCookieToken("airp_token");
  const token = tokenFromStore || tokenFromCookie;

  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  return config;
}

function normalizeError(error: unknown): never {
  const axiosError = error as AxiosError<ApiErrorPayload>;
  const payload = axiosError.response?.data;
  const statusCode = payload?.statusCode ?? axiosError.response?.status;
  const messageSource = payload?.message;
  const message = Array.isArray(messageSource)
    ? messageSource[0]
    : messageSource || axiosError.message || "请求失败";
  const errorCode = payload?.errorCode || payload?.code || `HTTP_${statusCode ?? 500}`;

  throw new ApiClientError(message, errorCode, statusCode, payload);
}

function extractPayload<T>(responseData: ApiEnvelope<T> | T): T {
  if (
    typeof responseData === "object" &&
    responseData !== null &&
    "success" in responseData &&
    "data" in responseData
  ) {
    const envelope = responseData as ApiEnvelope<T>;
    if (!envelope.success) {
      throw new ApiClientError(envelope.message || "请求失败", "BUSINESS_ERROR");
    }
    return envelope.data;
  }
  return responseData as T;
}

function createApiClient(): AxiosInstance {
  const env = loadClientEnv();
  const client = axios.create({
    baseURL: env.apiBaseUrl,
    timeout: 15000
  });

  client.interceptors.request.use(attachAuthHeader);
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401 && typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        const isAuthFlowPage =
          currentPath.startsWith("/auth") ||
          currentPath.startsWith("/register") ||
          currentPath.startsWith("/forgot-password") ||
          currentPath.startsWith("/terms") ||
          currentPath.startsWith("/privacy");

        if (isAuthFlowPage) {
          return Promise.reject(error);
        }

        useUserStore.getState().logout();
        const redirect = `${window.location.pathname}${window.location.search}`;
        window.location.href = `/auth?redirect=${encodeURIComponent(redirect)}`;
      }
      return Promise.reject(error);
    }
  );

  return client;
}

const clientSingleton = createApiClient();

export const apiClient = {
  async get<T>(path: string, config?: Record<string, unknown>): Promise<T> {
    try {
      const response = await clientSingleton.get<ApiEnvelope<T> | T>(path, config);
      return extractPayload(response.data);
    } catch (error) {
      normalizeError(error);
    }
  },
  async post<T>(path: string, payload?: unknown, config?: Record<string, unknown>): Promise<T> {
    try {
      const response = await clientSingleton.post<ApiEnvelope<T> | T>(path, payload, config);
      return extractPayload(response.data);
    } catch (error) {
      normalizeError(error);
    }
  },
  async put<T>(path: string, payload?: unknown, config?: Record<string, unknown>): Promise<T> {
    try {
      const response = await clientSingleton.put<ApiEnvelope<T> | T>(path, payload, config);
      return extractPayload(response.data);
    } catch (error) {
      normalizeError(error);
    }
  }
};
