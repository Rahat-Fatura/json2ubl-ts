import type { ValidationError } from '../../errors/ubl-build-error';

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

/**
 * 5.1.0 — genel belge düzeyi iskonto/artırım KALDIRILDI.
 *
 * 5.0.0'da bu düzlem KDV'yi yeniden hesaplamadan matrahı kaydırıyor ve yanlış
 * vergi üretiyordu (KDVK md.25/a). Kütüphane dağıtım yardımcısı KOYMAZ:
 * iskontoyu kalemlere dağıtmak çağıranın kararıdır (hangi kaleme ne kadar).
 * Tek istisna HKS komisyoncu masraflarıdır; onlar ödenecekten düşülen
 * kesintidir, matraha dokunmaz.
 */
export function documentAllowanceChargeUnsupported(path: string, actual?: string): ValidationError {
  return {
    code: 'DOCUMENT_ALLOWANCE_CHARGE_UNSUPPORTED',
    message:
      'Belge düzeyi iskonto/artırım desteklenmiyor; iskontoyu satırlara dağıtın '
      + '(satır iskontosu: lines[].allowancePercent). Belge düzeyinde yalnız HKS komisyoncu '
      + 'masrafları verilebilir (ProfileID=HKS + KOMISYONCU veya EARSIVFATURA + HKSKOMISYONCU).',
    path,
    expected: 'Kalemlere dağıtılmış satır iskontosu',
    actual,
  };
}
