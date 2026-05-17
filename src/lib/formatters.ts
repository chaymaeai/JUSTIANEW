import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

const DEFAULT_LOCALE = fr;

export function formatDate(
  input: string | Date | number,
  pattern = "d MMM yyyy",
  locale = DEFAULT_LOCALE
): string {
  const d = typeof input === "string" ? parseISO(input) : input instanceof Date ? input : new Date(input);
  if (!isValid(d)) return "—";
  return format(d, pattern, { locale });
}

export function formatDateTime(
  input: string | Date | number,
  pattern = "d MMM yyyy HH:mm",
  locale = DEFAULT_LOCALE
): string {
  return formatDate(input, pattern, locale);
}

export function formatRelativeTime(input: string | Date | number, locale = DEFAULT_LOCALE): string {
  const d = typeof input === "string" ? parseISO(input) : input instanceof Date ? input : new Date(input);
  if (!isValid(d)) return "—";
  return formatDistanceToNow(d, { addSuffix: true, locale });
}

export function formatCurrency(
  amount: number,
  currency = "MAD",
  locale = "fr-FR"
): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} Ko`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} Mo`;
  const gb = mb / 1024;
  return `${gb < 10 ? gb.toFixed(1) : Math.round(gb)} Go`;
}
