import type { FieldErrors } from "./result";
import type { ISODate } from "./format";

/** Validaciones de cliente reutilizables (RQNF-002, RQNF-006, R11). El servidor deberá repetirlas. */
export const MSG = {
  required: "Este campo es obligatorio.",
  email: "Ingrese un correo electrónico válido.",
  date: "Ingrese una fecha válida.",
  futureDate: "La fecha no puede ser futura.",
  amount: "Ingrese un monto numérico mayor que cero.",
  number: "Ingrese un valor numérico válido.",
  negative: "El valor no puede ser negativo.",
} as const;

export const isBlank = (v: unknown) => v === undefined || v === null || String(v).trim() === "";

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

/** Fecha real del calendario, no solo con formato correcto (descarta 2026-02-31). */
export function isValidDate(v: string): v is ISODate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Acepta "1250.50" o "1 250,50". Devuelve null si no es numérico. */
export function parseNumber(v: string | number): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = v.trim().replace(/\s/g, "");
  if (!s) return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export const hasErrors = (e: FieldErrors) => Object.keys(e).length > 0;

/** Requisitos mínimos de contraseña: 12 caracteres, igual que el seed y el README del proyecto. */
export const PASSWORD_MIN_LENGTH = 12;
export const passwordProblem = (v: string): string | null =>
  v.length < PASSWORD_MIN_LENGTH ? `Debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.` : null;

/** Formatos y tamaño de archivos adjuntos. PENDIENTE: confirmar valores con la administración (HU-33, 37, 53). */
export const FILE_RULES = {
  allowedExtensions: ["pdf", "jpg", "jpeg", "png"],
  maxBytes: 5 * 1024 * 1024,
  label: "PDF, JPG o PNG de hasta 5 MB",
} as const;

export function fileProblem(file: File | null | undefined): string | null {
  if (!file) return null;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!(FILE_RULES.allowedExtensions as readonly string[]).includes(ext)) return `Formato no permitido. Se aceptan: ${FILE_RULES.label}.`;
  if (file.size > FILE_RULES.maxBytes) return `El archivo supera el tamaño máximo. Se aceptan: ${FILE_RULES.label}.`;
  return null;
}
