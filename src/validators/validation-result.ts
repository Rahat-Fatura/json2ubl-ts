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
