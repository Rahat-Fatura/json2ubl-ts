import type { ValidationError } from '../errors/ubl-build-error';

/** Validasyon hatası oluşturucu yardımcıları */
export function missingField(path: string, message?: string): ValidationError {
  return {
    code: 'MISSING_FIELD',
    message: message || `Zorunlu alan eksik: ${path}`,
    path,
  };
}

export function invalidFormat(path: string, expected: string, actual?: string): ValidationError {
  return {
    code: 'INVALID_FORMAT',
    message: `Geçersiz format: ${path}`,
    path,
    expected,
    actual,
  };
}

export function invalidValue(path: string, expected: string, actual?: string): ValidationError {
  return {
    code: 'INVALID_VALUE',
    message: `Geçersiz değer: ${path}`,
    path,
    expected,
    actual,
  };
}

export function crossMatrixError(profileId: string, typeCode: string): ValidationError {
  return {
    code: 'CROSS_MATRIX',
    message: `ProfileID '${profileId}' ile InvoiceTypeCode '${typeCode}' birlikte kullanılamaz`,
    path: 'profileId/invoiceTypeCode',
    expected: `Geçerli Profil×Tip kombinasyonu`,
    actual: `${profileId} × ${typeCode}`,
  };
}

export function profileRequirement(profileId: string, path: string, message: string): ValidationError {
  return {
    code: 'PROFILE_REQUIREMENT',
    message: `[${profileId}] ${message}`,
    path,
  };
}

export function typeRequirement(typeCode: string, path: string, message: string): ValidationError {
  return {
    code: 'TYPE_REQUIREMENT',
    message: `[${typeCode}] ${message}`,
    path,
  };
}

// Sprint 8f.3 (Bug #3): YATIRIMTESVIK profili / EARSIV+YTB tiplerinde YTBNO zorunluluğu
// Semantik olarak "ContractDocumentReference" değil "YTBNO" kavramı — ayrı error code.
export function yatirimTesvikRequiresYtbNo(path: string, message: string): ValidationError {
  return {
    code: 'YATIRIMTESVIK_REQUIRES_YTBNO',
    message,
    path,
  };
}
