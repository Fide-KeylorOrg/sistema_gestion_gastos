/** Fechas de negocio como "YYYY-MM-DD" (sin zona horaria, igual que @db.Date). */
export type ISODate = string;

const colones = new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", minimumFractionDigits: 2 });
export const formatCRC = (n: number) => colones.format(n);

export function formatDate(iso: ISODate | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const monthName = (m0: number) => MONTHS[m0];
export const formatMonthYear = (year: number, m0: number) => `${MONTHS[m0][0].toUpperCase()}${MONTHS[m0].slice(1)} ${year}`;

export const toISO = (y: number, m0: number, d: number): ISODate =>
  `${y}-${String(m0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function addDays(iso: ISODate, days: number): ISODate {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return toISO(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
}

export function diffDays(a: ISODate, b: ISODate): number {
  const t = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((t(b) - t(a)) / 86_400_000);
}

export const formatBytes = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
