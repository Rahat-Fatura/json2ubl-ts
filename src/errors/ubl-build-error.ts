/** Validasyon hatası detayı */
export interface ValidationError {
  /** Hata kodu (ör: 'MISSING_FIELD', 'INVALID_FORMAT', 'CROSS_MATRIX') */
  code: string;
  /** Hata mesajı */
  message: string;
  /** Hatalı alan yolu (ör: 'supplier.vknTckn', 'lines[0].item.name') */
  path?: string;
  /** Beklenen değer veya format */
  expected?: string;
  /** Gerçek değer */
  actual?: string;
}

/** UBL XML oluşturma hatası */
export class UblBuildError extends Error {
  /** Validasyon hataları listesi */
  public readonly errors: ValidationError[];

  constructor(errors: ValidationError[]) {
    const summary = errors.length === 1
      ? errors[0].message
      : `${errors.length} validasyon hatası bulundu`;
    super(summary);
    this.name = 'UblBuildError';
    this.errors = errors;
  }

  /** Hataları okunabilir formatta döndürür */
  toDetailedString(): string {
    return this.errors
      .map((e, i) => {
        let detail = `${i + 1}. [${e.code}]`;
        if (e.path) detail += ` ${e.path}:`;
        detail += ` ${e.message}`;
        if (e.expected) detail += ` (beklenen: ${e.expected})`;
        if (e.actual) detail += ` (gelen: ${e.actual})`;
        return detail;
      })
      .join('\n');
  }
}
