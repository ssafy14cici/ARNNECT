// FE\src\shared\config\env.ts

export const USE_MOCK = String(import.meta.env.VITE_USE_MOCK).toLowerCase() === "true";

export const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
