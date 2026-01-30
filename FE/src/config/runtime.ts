// src/config/runtime.ts
const ENV = ((import.meta as any).env ?? {}) as Record<string, unknown>;

const RAW_BASE_URL = typeof ENV.VITE_API_BASE_URL === "string" ? (ENV.VITE_API_BASE_URL as string).trim() : "";
const RAW_USE_MOCK = typeof ENV.VITE_USE_MOCK === "string" ? (ENV.VITE_USE_MOCK as string) : "";

const ORIGIN = typeof window !== "undefined" ? window.location.origin : "";

export const API_BASE_URL = RAW_BASE_URL; // ""이면 same-origin(/api...) 쓰는 방식도 가능
export const USE_MOCK =
  RAW_USE_MOCK === "true" ||
  !RAW_BASE_URL || // env 없으면 기본 mock
  RAW_BASE_URL === ORIGIN ||
  RAW_BASE_URL.includes("localhost:5173") ||
  Boolean((import.meta as any).env?.DEV);
