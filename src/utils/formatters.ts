/** Sayıyı 2 ondalık basamaklı string'e çevirir */
export function formatDecimal(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/** Tarih objesini YYYY-MM-DD formatına çevirir */
export function formatDate(date: Date | string): string {
  if (typeof date === 'string') return date;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** XML özel karakterlerini escape eder */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** String'in boş olup olmadığını kontrol eder */
export function isNonEmpty(value: string | undefined | null): value is string {
  return value !== undefined && value !== null && value.trim().length > 0;
}

/** String'in belirtilen uzunlukta olup olmadığını kontrol eder */
export function hasLength(value: string | undefined | null, length: number): boolean {
  return isNonEmpty(value) && value.length === length;
}

/** String'in tamamen numerik olup olmadığını kontrol eder */
export function isNumeric(value: string): boolean {
  return /^\d+$/.test(value);
}
