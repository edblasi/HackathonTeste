import { supabase } from "./supabase";

const API_URL = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:8000" : "")).replace(/\/$/, "");

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new ApiError("Sessão não autenticada.", 401);
  return token;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers,
  });

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    let message = "Erro ao comunicar com o servidor.";
    if (typeof payload === "object" && payload) {
      const structured = payload as { detail?: unknown; field_errors?: Array<{ field?: string; message?: string }> };
      if (Array.isArray(structured.field_errors) && structured.field_errors.length) {
        message = structured.field_errors
          .map((item) => item.message)
          .filter((item): item is string => Boolean(item))
          .join(" ");
      } else if (Array.isArray(structured.detail)) {
        message = structured.detail
          .map((item) => {
            if (typeof item === "string") return item;
            if (item && typeof item === "object" && "msg" in item) return String((item as { msg: unknown }).msg).replace(/^Value error,\s*/i, "");
            return "";
          })
          .filter(Boolean)
          .join(" ");
      } else if (structured.detail) {
        message = String(structured.detail);
      }
    } else if (payload) {
      message = String(payload);
    }
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export async function apiPublicPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    let message = "Erro ao comunicar com o servidor.";
    if (typeof payload === "object" && payload) {
      const structured = payload as { detail?: unknown; field_errors?: Array<{ field?: string; message?: string }> };
      if (Array.isArray(structured.field_errors) && structured.field_errors.length) {
        message = structured.field_errors
          .map((item) => item.message)
          .filter((item): item is string => Boolean(item))
          .join(" ");
      } else if (structured.detail) {
        message = String(structured.detail);
      }
    } else if (payload) {
      message = String(payload);
    }
    throw new ApiError(message, response.status);
  }
  return payload as T;
}

export const apiGet = <T,>(path: string) => apiFetch<T>(path);
export const apiPost = <T,>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
export const apiPatch = <T,>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) });
export const apiDelete = <T,>(path: string) => apiFetch<T>(path, { method: "DELETE" });
