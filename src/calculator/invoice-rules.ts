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
import { BillingDocumentTypeCode } from './simple-types';
import { PROFILE_TYPE_MATRIX } from '../config/constants';
import { InvoiceProfileId, InvoiceTypeCode } from '../types/enums';

/** Schematron IADEInvioceCheck: BillingReference zorunlu olan IADE grubu tipleri */
const IADE_GROUP = ['IADE', 'TEVKIFATIADE', 'YTBIADE', 'YTBTEVKIFATIADE'];

// ─── Alıcı Mükellefiyet Durumu ──────────────────────────────────────────────

/**
 * Alıcının e-belge mükellefiyet durumu.
 * Dışarıdan sorgulanıp InvoiceSession'a verilir.
 *
 * - `einvoice` → e-Fatura mükellefi: EARSIVFATURA ve IHRACAT hariç tüm profiller
 * - `earchive` → e-Arşiv mükellefi: sadece EARSIVFATURA profili
 */
export type CustomerLiability = 'einvoice' | 'earchive';

// ─── Profil-Tip Uyumluluk Kuralları (PROFILE_TYPE_MATRIX'ten türetilir) ────

function deriveProfileTypeMap(
  matrix: Record<InvoiceProfileId, ReadonlySet<InvoiceTypeCode>>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const profile of Object.keys(matrix) as InvoiceProfileId[]) {
    out[profile] = Array.from(matrix[profile]);
  }
  return out;
}

function deriveTypeProfileMap(
  matrix: Record<InvoiceProfileId, ReadonlySet<InvoiceTypeCode>>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const profile of Object.keys(matrix) as InvoiceProfileId[]) {
    for (const type of matrix[profile]) {
      (out[type] ??= []).push(profile);
    }
  }
  return out;
}

const PROFILE_TYPE_MAP: Record<string, string[]> = deriveProfileTypeMap(PROFILE_TYPE_MATRIX);
const TYPE_PROFILE_MAP: Record<string, string[]> = deriveTypeProfileMap(PROFILE_TYPE_MATRIX);

// ─── Liability Bazlı Filtreleme ──────────────────────────────────────────────

/**
 * Liability'ye göre izin verilen profilleri filtreler.
 *
 * - einvoice → EARSIVFATURA ve IHRACAT hariç
 * - earchive → sadece EARSIVFATURA
 * - undefined → filtreleme yok (tüm profiller)
 *
 * isExport=true ise IHRACAT profili korunur (sadece constructor'da).
 */
export function filterProfilesByLiability(
  profiles: string[],
  liability?: CustomerLiability,
  isExport?: boolean,
): string[] {
  if (!liability) return profiles;

  if (liability === 'earchive') {
    return profiles.filter(p => p === 'EARSIVFATURA');
  }

  // einvoice: EARSIVFATURA ve IHRACAT hariç (isExport ise IHRACAT kalır)
  return profiles.filter(p => {
    if (p === 'EARSIVFATURA') return false;
    if (p === 'IHRACAT') return !!isExport;
    return true;
  });
}

/**
 * Liability'ye göre izin verilen tipleri filtreler.
 * Profil kısıtlandığında, o profile ait olmayan tipler de kısıtlanır.
 */
export function filterTypesByLiability(
  types: string[],
  _profile: string,
  liability?: CustomerLiability,
): string[] {
  if (!liability) return types;

  // earchive iken profil EARSIVFATURA olmalı — tipler o profile göre
  if (liability === 'earchive') {
    const earsivTypes = PROFILE_TYPE_MAP['EARSIVFATURA'] ?? [];
    return types.filter(t => earsivTypes.includes(t));
  }

  // einvoice → mevcut profile uyumlu tipler aynen döner
  return types;
}

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
  /** Satır bazında ek tanımlayıcılar (IMEI, KUNYENO, ETIKETNO vb.) gösterilsin mi? */
  showAdditionalItemIdentifications: boolean;
  /** Satır bazında CommodityClassification gösterilsin mi? */
  showCommodityClassification: boolean;
  /** TaxRepresentativeParty gösterilsin mi? */
  showTaxRepresentativeParty: boolean;
  /** Satıcıda SEVKIYATNO gösterilsin mi? (IDIS profili) */
  showSevkiyatNo: boolean;
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
  /** BillingReference DocumentTypeCode seçenekleri (tip bazında) */
  availableBillingDocumentTypeCodes: { code: string; label: string; forced: boolean }[];
  /** Validasyon uyarıları */
  warnings: ValidationWarning[];
}

// ─── Kural Fonksiyonları ─────────────────────────────────────────────────────

/**
 * Belirli bir fatura tipi için izin verilen profilleri döndürür.
 * liability ve isExport verilirse filtreleme uygulanır.
 */
export function getAllowedProfilesForType(
  type: string,
  liability?: CustomerLiability,
  isExport?: boolean,
): string[] {
  const base = TYPE_PROFILE_MAP[type] ?? ['TEMELFATURA', 'TICARIFATURA'];
  return filterProfilesByLiability(base, liability, isExport);
}

/**
 * Belirli bir profil için izin verilen tipleri döndürür.
 * liability verilirse filtreleme uygulanır.
 */
export function getAllowedTypesForProfile(
  profile: string,
  liability?: CustomerLiability,
): string[] {
  const base = PROFILE_TYPE_MAP[profile] ?? ['SATIS'];
  return filterTypesByLiability(base, profile, liability);
}

/**
 * Tip değiştiğinde profilin hala geçerli olup olmadığını kontrol eder.
 * Geçerli değilse liability'ye uyumlu bir profil önerir.
 */
export function resolveProfileForType(
  currentProfile: string | undefined,
  newType: string,
  liability?: CustomerLiability,
  isExport?: boolean,
): string {
  const allowed = getAllowedProfilesForType(newType, liability, isExport);
  if (currentProfile && allowed.includes(currentProfile)) return currentProfile;

  // IADE → otomatik TEMELFATURA (Schematron kuralı)
  if (newType === 'IADE') return allowed.includes('TEMELFATURA') ? 'TEMELFATURA' : allowed[0] ?? 'TICARIFATURA';
  // B-47: earchive liability + SGK uyumsuz kombinasyon — geçersiz TICARIFATURA fallback yerine
  // earchive ile tek meşru profil EARSIVFATURA (SGK yine desteksiz, kullanıcı input düzeltmeli)
  if (newType === 'SGK') {
    if (liability === 'earchive') return 'EARSIVFATURA';
    return allowed.includes('TEMELFATURA') ? 'TEMELFATURA' : allowed[0] ?? 'TICARIFATURA';
  }
  if (newType === 'TEKNOLOJIDESTEK') return allowed.includes('EARSIVFATURA') ? 'EARSIVFATURA' : allowed[0] ?? 'TICARIFATURA';
  if (newType === 'SARJ' || newType === 'SARJANLIK') return 'ENERJI';

  return allowed[0] ?? 'TICARIFATURA';
}

/**
 * Profil değiştiğinde tipin hala geçerli olup olmadığını kontrol eder.
 * Geçerli değilse uyumlu bir tip önerir.
 */
export function resolveTypeForProfile(
  currentType: string | undefined,
  newProfile: string,
  liability?: CustomerLiability,
): string {
  const allowed = getAllowedTypesForProfile(newProfile, liability);
  if (currentType && allowed.includes(currentType)) return currentType;
  return allowed[0] ?? 'SATIS';
}

/**
 * Tip ve profile göre alan görünürlüklerini hesaplar.
 */
export function deriveFieldVisibility(type: string, profile: string, currencyCode?: string): FieldVisibility {
  const isIade = type === 'IADE' || type === 'YTBIADE' || type === 'TEVKIFATIADE' || type === 'YTBTEVKIFATIADE';
  // B-79: sade IADE'de withholding selector gereksiz; yalnız TEVKIFATIADE/YTBTEVKIFATIADE'de göster
  const isTevkifatIade = type === 'TEVKIFATIADE' || type === 'YTBTEVKIFATIADE';
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
  const isIdis = profile === 'IDIS';
  const isForeign = currencyCode && currencyCode !== 'TRY';

  return {
    showBillingReference: isIade,
    showWithholdingTaxSelector: isTevkifat || isTevkifatIade,
    showExemptionCodeSelector: isIstisna || isIhracKayitli || isOzelMatrah,
    showOzelMatrah: isOzelMatrah,
    showSgkInfo: isSgk,
    showBuyerCustomer: isIhracat || isYolcuBeraber || isKamu,
    showLineDelivery: isIhracat || isIhracKayitli,
    showPaymentMeans: isKamu,
    requireIban: isKamu,
    showExchangeRate: !!isForeign,
    showEArchiveInfo: isEarsiv,
    showOnlineSale: isEarsiv,
    showInvoicePeriod: isSgk,
    showYatirimTesvikNo: isYatirimTesvik,
    showAdditionalItemIdentifications: isIlacTibbi || isTeknolojiDestek || isIdis,
    showCommodityClassification: isYatirimTesvik,
    showTaxRepresentativeParty: isYolcuBeraber,
    showSevkiyatNo: isIdis,
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
    // B-45: Schematron 316/318/320 — IADE/YTBIADE/TEVKIFATIADE tiplerinde
    // ISTISNA kodları da kullanılabilir (karma senaryolar)
    case 'IADE':
    case 'YTBIADE':
    case 'TEVKIFATIADE':
    case 'YTBTEVKIFATIADE':
      return configManager.getExemptionsByDocumentType('ISTISNA');
    case 'SGK':
      return [
        ...configManager.getExemptionsByDocumentType('SGK'),
        ...configManager.getExemptionsByDocumentType('ISTISNA'),
      ];
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
  hasPaymentMeans?: boolean;
  paymentMeansCode?: string;
  paymentAccountNumber?: string;
  kdvExemptionCode?: string;
  hasWithholdingLines?: boolean;
  hasBuyerCustomer?: boolean;
  ytbNo?: string;
  hasSevkiyatNo?: boolean;
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

  // KAMU → paymentMeans zorunlu
  if (state.profile === 'KAMU' && !state.hasPaymentMeans) {
    warnings.push({ field: 'paymentMeans', message: 'Kamu faturalarında ödeme bilgisi zorunludur.', severity: 'error' });
  }

  // KAMU → meansCode zorunlu
  if (state.profile === 'KAMU' && state.hasPaymentMeans && !state.paymentMeansCode) {
    warnings.push({ field: 'paymentMeans.meansCode', message: 'Kamu faturalarında ödeme yöntemi kodu zorunludur.', severity: 'error' });
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

  // KAMU → buyerCustomer zorunlu
  if (state.profile === 'KAMU' && !state.hasBuyerCustomer) {
    warnings.push({ field: 'buyerCustomer', message: 'Kamu faturalarında aracı kurum bilgisi zorunludur.', severity: 'error' });
  }

  // TEVKIFAT → en az bir satırda tevkifat kodu olmalı
  if (state.type === 'TEVKIFAT' && !state.hasWithholdingLines) {
    warnings.push({ field: 'lines', message: 'Tevkifat faturalarında en az bir satırda tevkifat kodu bulunmalıdır.', severity: 'warning' });
  }

  // YATIRIMTESVIK → ytbNo zorunlu (6 haneli numerik)
  if (state.profile === 'YATIRIMTESVIK' && !state.ytbNo) {
    warnings.push({ field: 'ytbNo', message: 'Yatırım Teşvik faturalarında YTB numarası zorunludur.', severity: 'error' });
  } else if (state.profile === 'YATIRIMTESVIK' && state.ytbNo && (state.ytbNo.length !== 6 || !/^\d{6}$/.test(state.ytbNo))) {
    warnings.push({ field: 'ytbNo', message: 'YTB numarası 6 haneli numerik olmalıdır.', severity: 'error' });
  }

  // IDIS → SEVKIYATNO zorunlu
  if (state.profile === 'IDIS' && !state.hasSevkiyatNo) {
    warnings.push({ field: 'sender.identifications.SEVKIYATNO', message: 'IDIS faturalarında satıcıda SEVKIYATNO zorunludur.', severity: 'error' });
  }

  return warnings;
}

/**
 * Tip bazında BillingReference DocumentTypeCode bilgisini döndürür.
 *
 * Schematron IADEInvioceCheck kuralına göre:
 * - IADE grubu tiplerinde `DocumentTypeCode='IADE'` zorunludur (forced: true).
 * - Diğer tiplerde Schematron kısıtlaması yoktur, serbest metin kabul edilir (forced: false).
 *
 * @see schematrons/UBL-TR_Common_Schematron.xml — IADEInvioceCheck
 */
export function getAvailableBillingDocumentTypeCodes(type: string): { code: string; label: string; forced: boolean }[] {
  const isIadeGroup = IADE_GROUP.includes(type);

  if (isIadeGroup) {
    return [{ code: BillingDocumentTypeCode.IADE, label: 'İade Faturası', forced: true }];
  }

  // IADE grubu dışında Schematron'da DocumentTypeCode kısıtlaması yok — serbest metin
  return [];
}

/**
 * Tam UI state'i tek seferde hesaplar.
 * liability/isExport verilirse profil ve tip listeleri buna göre filtrelenir.
 */
export function deriveUIState(
  type: string,
  profile: string,
  currencyCode?: string,
  liability?: CustomerLiability,
  isExport?: boolean,
): InvoiceUIState {
  return {
    allowedProfiles: getAllowedProfilesForType(type, liability, isExport),
    allowedTypes: getAllowedTypesForProfile(profile, liability),
    fields: deriveFieldVisibility(type, profile, currencyCode),
    availableWithholdingTaxes: [...configManager.withholdingTaxes],
    availableExemptions: getAvailableExemptions(type),
    availableBillingDocumentTypeCodes: getAvailableBillingDocumentTypeCodes(type),
    warnings: [],
  };
}
