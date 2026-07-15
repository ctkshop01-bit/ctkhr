export function createId(prefix: string) {
  const base = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return `${prefix}_${base}`;
}

export function nowISO() {
  return new Date().toISOString();
}

export function toDateISO(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function toMonthISO(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  return `${y}-${m}`;
}

export function monthISOFromDateTimeISO(iso: string) {
  const match = iso.match(/^(\d{4}-\d{2})/);
  if (match) return match[1];
  return toMonthISO(new Date(iso));
}

export function formatTimeHM(iso: string | undefined) {
  if (!iso) return "--:--";
  const d = new Date(iso);
  const hh = `${d.getHours()}`.padStart(2, "0");
  const mm = `${d.getMinutes()}`.padStart(2, "0");
  return `${hh}:${mm}`;
}

export function formatDateCN(isoDateOrDateTime: string | Date) {
  const d = isoDateOrDateTime instanceof Date ? isoDateOrDateTime : new Date(isoDateOrDateTime);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}.${m}.${day}`;
}

export function minutesBetween(startISO: string, endISO: string) {
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  return Math.max(0, Math.round((end - start) / 60000));
}

export function roundMoneyCents(value: number) {
  return Math.round(value);
}

export function formatTHBFromCents(cents: number) {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `฿${amount.toFixed(2)}`;
  }
}

export function formatCNYFromCents(cents: number) {
  return formatTHBFromCents(cents);
}

export async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  return [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
}
