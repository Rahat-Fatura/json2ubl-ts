/**
 * Reaktif kurallar motoru — fatura tipi, profil ve UI state derivation.
 *
 * Frontend bu bilgileri kullanarak:
 * - Hangi alanların gösterileceğini
 * - Hangi seçeneklerin aktif olduğunu
 * - Validasyon mesajlarını
 * belirler.
 */

import { configManager } from './config-manager';
import type { WithholdingTaxDefinition } from './withholding-config';
import type { ExemptionDefinition } from './exemption-config';

// ─── Profil-Tip Uyumluluk Kuralları ─────────────────────────────────────────

/** Profil bazında izin verilen fatura tipleri (Schematron kuralları) */
const PROFILE_TYPE_MAP: Record<string, string[]> = {
  TEMELFATURA: ['SATIS', 'IADE', 'ISTISNA', 'IHRACKAYITLI', 'OZELMATRAH', 'TEVKIFAT', 'SGK', 'KOMISYONCU', 'KONAKLAMAVERGISI'],
  TICARIFATURA: ['SATIS', 'IADE', 'ISTISNA', 'IHRACKAYITLI', 'OZELMATRAH', 'TEVKIFAT', 'SGK', 'KOMISYONCU', 'KONAKLAMAVERGISI'],
  EARSIVFATURA: ['SATIS', 'IADE', 'ISTISNA', 'IHRACKAYITLI', 'OZELMATRAH', 'TEVKIFAT', 'KOMISYONCU', 'TEKNOLOJIDESTEK', 'KONAKLAMAVERGISI',
    'HKSSATIS', 'HKSKOMISYONCU', 'YTBSATIS', 'YTBIADE', 'YTBISTISNA', 'YTBTEVKIFAT', 'YTBTEVKIFATIADE'],
  IHRACAT: ['SATIS', 'ISTISNA', 'IHRACKAYITLI'],
  YOLCUBERABERFATURA: ['SATIS', 'ISTISNA'],
  KAMU: ['SATIS', 'ISTISNA', 'TEVKIFAT', 'IHRACKAYITLI', 'OZELMATRAH', 'KONAKLAMAVERGISI'],
  OZELFATURA: ['SATIS', 'ISTISNA'],
  HKS: ['SATIS', 'KOMISYONCU'],
  ILAC_TIBBICIHAZ: ['SATIS', 'ISTISNA', 'TEVKIFAT', 'TEVKIFATIADE', 'IADE', 'IHRACKAYITLI'],
  YATIRIMTESVIK: ['SATIS', 'ISTISNA', 'IADE', 'TEVKIFAT', 'TEVKIFATIADE'],
  ENERJI: ['SARJ', 'SARJANLIK'],
  IDIS: ['SATIS', 'ISTISNA', 'IADE', 'TEVKIFAT', 'TEVKIFATIADE', 'IHRACKAYITLI'],
};

/** Tip bazında izin verilen profiller */
const TYPE_PROFILE_MAP: Record<string, string[]> = {
  SATIS: ['TEMELFATURA', 'TICARIFATURA', 'EARSIVFATURA', 'IHRACAT', 'YOLCUBERABERFATURA', 'KAMU', 'OZELFATURA', 'HKS', 'ILAC_TIBBICIHAZ', 'YATIRIMTESVIK', 'IDIS'],
  IADE: ['TEMELFATURA', 'EARSIVFATURA', 'ILAC_TIBBICIHAZ', 'YATIRIMTESVIK', 'IDIS'],
  TEVKIFAT: ['TEMELFATURA', 'TICARIFATURA', 'EARSIVFATURA', 'KAMU', 'ILAC_TIBBICIHAZ', 'YATIRIMTESVIK', 'IDIS'],
  ISTISNA: ['TEMELFATURA', 'TICARIFATURA', 'EARSIVFATURA', 'IHRACAT', 'YOLCUBERABERFATURA', 'KAMU', 'OZELFATURA', 'ILAC_TIBBICIHAZ', 'YATIRIMTESVIK', 'IDIS'],
  IHRACKAYITLI: ['TEMELFATURA', 'TICARIFATURA', 'EARSIVFATURA', 'IHRACAT', 'KAMU', 'ILAC_TIBBICIHAZ', 'IDIS'],
  OZELMATRAH: ['TEMELFATURA', 'TICARIFATURA', 'EARSIVFATURA', 'KAMU'],
  SGK: ['TEMELFATURA', 'TICARIFATURA'],
  TEKNOLOJIDESTEK: ['EARSIVFATURA'],
  KOMISYONCU: ['TEMELFATURA', 'TICARIFATURA', 'EARSIVFATURA', 'HKS'],
  KONAKLAMAVERGISI: ['TEMELFATURA', 'TICARIFATURA', 'EARSIVFATURA', 'KAMU'],
  SARJ: ['ENERJI'],
  SARJANLIK: ['ENERJI'],
};

// ─── UI Field Visibility ─────────────────────────────────────────────────────

/** Hangi fatura tipinde hangi ek alanların gösterileceğini belirler */
export interface FieldVisibility {
  /** İade fatura referansı (billingReference) alanı gösterilsin mi? */
  showBillingReference: boolean;
  /** Tevkifat kodu seçici gösterilsin mi? (satır bazında) */
  showWithholdingTaxSelector: boolean;
  /** İstisna kodu seçici gösterilsin mi? */
  showExemptionCodeSelector: boolean;
  /** Özel matrah alanları gösterilsin mi? */
  showOzelMatrah: boolean;
  /** SGK bilgi alanları gösterilsin mi? */
  showSgkInfo: boolean;
  /** İhracat alıcı bilgisi (buyerCustomer) gösterilsin mi? */
  showBuyerCustomer: boolean;
  /** Teslimat bilgileri (delivery) gösterilsin mi? (satır bazında) */
  showLineDelivery: boolean;
  /** Ödeme bilgisi (paymentMeans + IBAN) gösterilsin mi? */
  showPaymentMeans: boolean;
  /** IBAN zorunlu mu? */
  requireIban: boolean;
  /** Döviz kuru alanı gösterilsin mi? */
  showExchangeRate: boolean;
  /** e-Arşiv gönderim bilgisi gösterilsin mi? */
  showEArchiveInfo: boolean;
  /** Online satış bilgisi gösterilsin mi? */
  showOnlineSale: boolean;
  /** Fatura dönemi gösterilsin mi? */
  showInvoicePeriod: boolean;
  /** Yatırım teşvik numarası gösterilsin mi? */
  showYatirimTesvikNo: boolean;
  /** Satır bazında ek tanımlayıcılar (IMEI, KUNYENO vb.) gösterilsin mi? */
  showAdditionalItemIdentifications: boolean;
  /** Satır bazında CommodityClassification gösterilsin mi? */
  showCommodityClassification: boolean;
  /** TaxRepresentativeParty gösterilsin mi? */
  showTaxRepresentativeParty: boolean;
}

// ─── Validation Warning ──────────────────────────────────────────────────────

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

// ─── UI State ────────────────────────────────────────────────────────────────

export interface InvoiceUIState {
  /** Mevcut tip için izin verilen profiller */
  allowedProfiles: string[];
  /** Mevcut profil için izin verilen tipler */
  allowedTypes: string[];
  /** Mevcut seçimlere göre alan görünürlükleri */
  fields: FieldVisibility;
  /** Kullanılabilir tevkifat kodları */
  availableWithholdingTaxes: WithholdingTaxDefinition[];
  /** Kullanılabilir istisna kodları (tip bazında filtrelenmiş) */
  availableExemptions: ExemptionDefinition[];
  /** Validasyon uyarıları */
  warnings: ValidationWarning[];
}

// ─── Kural Fonksiyonları ─────────────────────────────────────────────────────

/**
 * Belirli bir fatura tipi için izin verilen profilleri döndürür.
 */
export function getAllowedProfilesForType(type: string): string[] {
  return TYPE_PROFILE_MAP[type] ?? ['TEMELFATURA', 'TICARIFATURA'];
}

/**
 * Belirli bir profil için izin verilen tipleri döndürür.
 */
export function getAllowedTypesForProfile(profile: string): string[] {
  return PROFILE_TYPE_MAP[profile] ?? ['SATIS'];
}

/**
 * Tip değiştiğinde profilin hala geçerli olup olmadığını kontrol eder.
 * Geçerli değilse uyumlu bir profil önerir.
 */
export function resolveProfileForType(currentProfile: string | undefined, newType: string): string {
  const allowed = getAllowedProfilesForType(newType);
  if (currentProfile && allowed.includes(currentProfile)) return currentProfile;

  // IADE → otomatik TEMELFATURA (Schematron kuralı)
  if (newType === 'IADE') return 'TEMELFATURA';
  if (newType === 'SGK') return 'TEMELFATURA';
  if (newType === 'TEKNOLOJIDESTEK') return 'EARSIVFATURA';
  if (newType === 'SARJ' || newType === 'SARJANLIK') return 'ENERJI';

  return allowed[0] ?? 'TICARIFATURA';
}

/**
 * Profil değiştiğinde tipin hala geçerli olup olmadığını kontrol eder.
 * Geçerli değilse uyumlu bir tip önerir.
 */
export function resolveTypeForProfile(currentType: string | undefined, newProfile: string): string {
  const allowed = getAllowedTypesForProfile(newProfile);
  if (currentType && allowed.includes(currentType)) return currentType;
  return allowed[0] ?? 'SATIS';
}

/**
 * Tip ve profile göre alan görünürlüklerini hesaplar.
 */
export function deriveFieldVisibility(type: string, profile: string, currencyCode?: string): FieldVisibility {
  const isIade = type === 'IADE' || type === 'YTBIADE' || type === 'TEVKIFATIADE' || type === 'YTBTEVKIFATIADE';
  const isTevkifat = type === 'TEVKIFAT' || type === 'YTBTEVKIFAT';
  const isIstisna = type === 'ISTISNA' || type === 'YTBISTISNA';
  const isIhracKayitli = type === 'IHRACKAYITLI';
  const isOzelMatrah = type === 'OZELMATRAH';
  const isSgk = type === 'SGK';
  const isIhracat = profile === 'IHRACAT';
  const isKamu = profile === 'KAMU';
  const isEarsiv = profile === 'EARSIVFATURA';
  const isYatirimTesvik = profile === 'YATIRIMTESVIK';
  const isIlacTibbi = profile === 'ILAC_TIBBICIHAZ';
  const isTeknolojiDestek = type === 'TEKNOLOJIDESTEK';
  const isYolcuBeraber = profile === 'YOLCUBERABERFATURA';
  const isForeign = currencyCode && currencyCode !== 'TRY';

  return {
    showBillingReference: isIade,
    showWithholdingTaxSelector: isTevkifat || isIade,
    showExemptionCodeSelector: isIstisna || isIhracKayitli || isOzelMatrah,
    showOzelMatrah: isOzelMatrah,
    showSgkInfo: isSgk,
    showBuyerCustomer: isIhracat || isYolcuBeraber,
    showLineDelivery: isIhracat || isIhracKayitli,
    showPaymentMeans: true,
    requireIban: isKamu,
    showExchangeRate: !!isForeign,
    showEArchiveInfo: isEarsiv,
    showOnlineSale: isEarsiv,
    showInvoicePeriod: isSgk,
    showYatirimTesvikNo: isYatirimTesvik,
    showAdditionalItemIdentifications: isIlacTibbi || isTeknolojiDestek,
    showCommodityClassification: isYatirimTesvik,
    showTaxRepresentativeParty: isYolcuBeraber,
  };
}

/**
 * Tip bazında kullanılabilir istisna kodlarını döndürür.
 */
export function getAvailableExemptions(type: string): ExemptionDefinition[] {
  switch (type) {
    case 'ISTISNA':
    case 'YTBISTISNA':
      return configManager.getExemptionsByDocumentType('ISTISNA');
    case 'IHRACKAYITLI':
      return configManager.getExemptionsByDocumentType('IHRACKAYITLI');
    case 'OZELMATRAH':
      return configManager.getExemptionsByDocumentType('OZELMATRAH');
    case 'SGK':
      return configManager.getExemptionsByDocumentType('SGK');
    default:
      return [];
  }
}

/**
 * Mevcut fatura state'ine göre validasyon uyarıları üretir.
 */
export function validateInvoiceState(state: {
  type: string;
  profile: string;
  currencyCode?: string;
  exchangeRate?: number;
  billingReferenceId?: string;
  paymentAccountNumber?: string;
  kdvExemptionCode?: string;
  hasWithholdingLines?: boolean;
  hasBuyerCustomer?: boolean;
}): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // IADE → billingReference zorunlu
  if (['IADE', 'TEVKIFATIADE', 'YTBIADE', 'YTBTEVKIFATIADE'].includes(state.type) && !state.billingReferenceId) {
    warnings.push({ field: 'billingReference', message: 'İade faturalarında iade edilen fatura referansı zorunludur.', severity: 'error' });
  }

  // Döviz → exchangeRate zorunlu
  if (state.currencyCode && state.currencyCode !== 'TRY' && !state.exchangeRate) {
    warnings.push({ field: 'exchangeRate', message: 'TRY dışı para birimlerinde döviz kuru zorunludur.', severity: 'error' });
  }

  // KAMU → IBAN zorunlu
  if (state.profile === 'KAMU' && !state.paymentAccountNumber) {
    warnings.push({ field: 'paymentMeans.accountNumber', message: 'Kamu faturalarında IBAN zorunludur.', severity: 'error' });
  }

  // KAMU → IBAN format
  if (state.profile === 'KAMU' && state.paymentAccountNumber && !/^TR\d{7}[A-Z0-9]{17}$/.test(state.paymentAccountNumber)) {
    warnings.push({ field: 'paymentMeans.accountNumber', message: 'Geçersiz IBAN formatı. TR ile başlayan 26 karakter olmalıdır.', severity: 'error' });
  }

  // İstisna → kod zorunlu
  if (['ISTISNA', 'YTBISTISNA', 'IHRACKAYITLI', 'OZELMATRAH'].includes(state.type) && !state.kdvExemptionCode) {
    warnings.push({ field: 'kdvExemptionCode', message: 'Bu fatura tipinde KDV istisna/muafiyet kodu zorunludur.', severity: 'error' });
  }

  // IHRACAT → buyerCustomer zorunlu
  if (state.profile === 'IHRACAT' && !state.hasBuyerCustomer) {
    warnings.push({ field: 'buyerCustomer', message: 'İhracat faturalarında yabancı alıcı bilgisi zorunludur.', severity: 'error' });
  }

  // TEVKIFAT → en az bir satırda tevkifat kodu olmalı
  if (state.type === 'TEVKIFAT' && !state.hasWithholdingLines) {
    warnings.push({ field: 'lines', message: 'Tevkifat faturalarında en az bir satırda tevkifat kodu bulunmalıdır.', severity: 'warning' });
  }

  return warnings;
}

/**
 * Tam UI state'i tek seferde hesaplar.
 */
export function deriveUIState(
  type: string,
  profile: string,
  currencyCode?: string,
): InvoiceUIState {
  return {
    allowedProfiles: getAllowedProfilesForType(type),
    allowedTypes: getAllowedTypesForProfile(profile),
    fields: deriveFieldVisibility(type, profile, currencyCode),
    availableWithholdingTaxes: [...configManager.withholdingTaxes],
    availableExemptions: getAvailableExemptions(type),
    warnings: [],
  };
}
