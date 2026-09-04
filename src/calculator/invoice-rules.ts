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
import { PROFILE_TYPE_MATRIX, WITHHOLDING_ALLOWED_TYPES } from '../config/constants';
import { TAX_EXEMPTION_MATRIX } from '../validators/cross-check-matrix';
import { InvoiceProfileId, InvoiceTypeCode } from '../types/enums';

/** Schematron IADEInvioceCheck: BillingReference zorunlu olan IADE grubu tipleri */
const IADE_GROUP = ['IADE', 'TEVKIFATIADE', 'YTBIADE', 'YTBTEVKIFATIADE'];

/**
 * Schematron `GeneralWithholdingTaxTotalCheck`: `cac:WithholdingTaxTotal` varken
 * fatura tipinin alabileceği değerler.
 *
 * Satırda `withholdingTaxCode` verilmesi belgede `cac:WithholdingTaxTotal`
 * ÜRETİR — dolayısıyla tevkifatlı satır ile fatura tipi bu listede kesişmek
 * zorundadır, yoksa GİB kapıda reddeder.
 *
 * 4.1.3'te bu dizi burada AYRI durur, `constants.WITHHOLDING_ALLOWED_TYPES` ise
 * `TEVKIFATIADE`/`YTBTEVKIFATIADE` ile 9 tip içerirdi — yani kütüphane iki farklı
 * gerçeğe inanıyordu. 4.1.5'te constants şematrona indirildi ve ikisi TEK KAYNAĞA
 * bağlandı; bu dizi artık ondan türetiliyor, kopya değil.
 *
 * @see schematrons/UBL-TR_Common_Schematron.xml — GeneralWithholdingTaxTotalCheck
 */
const WITHHOLDING_TOTAL_ALLOWED_TYPES: readonly string[] = [...WITHHOLDING_ALLOWED_TYPES];

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

/**
 * Fatura tipine göre hangi ek alanların KULLANILABİLİR olduğunu belirler.
 *
 * ## `show*` = "İZİNLİ Mİ", "varsayılanda açık mı" DEĞİL
 *
 * Bu adlandırma yanıltıcıdır ve bir kez pahalıya patladı: `show*` bir ergonomi
 * tavsiyesi değil, GİB'in o alanı o tipte kabul edip etmediğidir. Bayrak
 * `false` ise alan belgede YASAKTIR — tüketici onu açsa bile GİB reddeder.
 * `true` ise alan SERBESTTİR; kullanıcıya kendiliğinden mi geleceği, yoksa
 * bir menüden mi açılacağı KÜTÜPHANENİN KARARI DEĞİLDİR.
 *
 * Üç seviyeli doğru okuma (tüketici tarafında, örn. portalın `column-config`i):
 *
 *   izinli mi?          ← BURASI (`show*`) — yasal kapı
 *   varsayılan açık mı? ← tüketici (tipik senaryo hangisi)
 *   açılabilir mi?      ← tüketici (menüde teklif edilsin mi)
 *
 * Somut örnek: `IADE` tipinde `showWithholdingTaxSelector` artık `true` —
 * çünkü GİB `IADE + WithholdingTaxTotal`'ı kabul eder. Ama iadelerin büyük
 * çoğunluğu tevkifatsızdır; sütunu herkese açmak gürültü olur. Doğru davranış
 * "menüde var, kapalı gelir" — ve bu kararı tüketici verir, kütüphane değil.
 * `TEVKIFAT` tipinde ise aynı bayrak `true` ve tüketici sütunu açık başlatır.
 */
export interface FieldVisibility {
  /** İade fatura referansı (billingReference) alanı gösterilsin mi? */
  showBillingReference: boolean;
  /**
   * Satırda tevkifat kodu VERİLEBİLİR mi? (izin kapısı — bkz. arayüz notu)
   *
   * Kaynak: `WITHHOLDING_ALLOWED_TYPES` = şematronun
   * `GeneralWithholdingTaxTotalCheck` listesi (TEVKIFAT, YTBTEVKIFAT, IADE,
   * YTBIADE, SGK, SARJ, SARJANLIK). `TEVKIFATIADE` bu listede DEĞİLDİR.
   */
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
  /** Validator pipeline'dan köprülenen ValidationError.code (Sprint 8h.7 / AR-10) */
  code?: string;
}

// ─── UI State ────────────────────────────────────────────────────────────────

export interface InvoiceUIState {
  /** Mevcut tip için izin verilen profiller */
  allowedProfiles: string[];
  /** Mevcut profil için izin verilen tipler */
  allowedTypes: string[];
  /** Mevcut seçimlere göre alan görünürlükleri (doc-level) */
  fields: FieldVisibility;
  /**
   * Line-level alan görünürlükleri (Sprint 8h.5 / AR-10).
   * Her satır için ayrı `LineFieldVisibility` map'i; addLine/removeLine/setLines/update
   * sırasında session tarafından senkron tutulur. Doc-level değişimde (type/profile/liability)
   * tüm `lineFields` re-derive edilir.
   */
  lineFields: import('./line-field-visibility').LineFieldVisibility[];
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
  /* 🔴 B-79 KARARI TERSİNE ÇEVRİLDİ (şematronla ölçüldü).
   *
   * Eski karar: "sade IADE'de withholding selector gereksiz; yalnız
   * TEVKIFATIADE/YTBTEVKIFATIADE'de göster". Bu tam tersiydi:
   *   TEVKIFATIADE + WithholdingTaxTotal → GİB REDDEDİYOR
   *   IADE         + WithholdingTaxTotal → GİB KABUL EDİYOR
   * (`GeneralWithholdingTaxTotalCheck`, canlı paket 20260701 ile doğrulandı.)
   *
   * Sahadaki gerçek yapı: tevkifatlı iade = tip IADE + kalemde tevkifat kodu.
   *
   * Bayrak artık şematronun izinli tip listesinden okunuyor; "İZİNLİ Mİ"
   * sorusunun cevabıdır — "varsayılanda açık mı" DEĞİL. Sütunun kendiliğinden
   * gelip gelmeyeceği tüketicinin ergonomi kararıdır (portalda
   * `column-config.ts` · `visibleByDefault` / `toggleable`). */
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
  /** Sprint 9 — Enerji/Şarj: EnerjiInvoicePeriodCheck InvoicePeriod'u zorunlu kılar */
  const isEnerjiSarj = type === 'SARJ' || type === 'SARJANLIK';
  const isForeign = currencyCode && currencyCode !== 'TRY';

  return {
    showBillingReference: isIade,
    showWithholdingTaxSelector: WITHHOLDING_ALLOWED_TYPES.has(type as InvoiceTypeCode),
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
    // Sprint 9: SARJ/SARJANLIK'ta EnerjiInvoicePeriodCheck InvoicePeriod'u ZORUNLU
    // kılıyor — alan gizli kalırsa kullanıcı zorunlu veriyi giremez.
    showInvoicePeriod: isSgk || isEnerjiSarj,
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
      // 🔴 ESKİDEN BURASI `return []` İDİ — SEÇİM LİSTESİ İLE DOĞRULAYICI AYRIŞIYORDU.
      //
      // Kütüphanenin dört parçası aynı senaryoda çelişiyordu (SATIS + KDV %0):
      //   • veri     — 351/555/151 `documentType: 'SATIS'` taşıyor
      //   • matris   — CODE_351_ALLOWED_TYPES SATIS içeriyor, `requiresZeroKdvLine: true`
      //   • öneri    — KDV_ZERO_SUGGEST_351 kullanıcıya 351'i ÖNERİYOR
      //   • bu liste — boş dönüyordu
      // Yani kütüphane "351'i kullan" deyip 351'i listeye koymuyordu.
      //
      // Kök sebep, seçim listesinin doğrulayıcıdan AYRI bir switch olmasıydı: aynı
      // veriden iki farklı kuralla türetilen iki yapı kaçınılmaz olarak ayrışır.
      // Artık bilinmeyen tipler doğrulayıcının matrisinden türetiliyor — "bu tipe
      // izin verilen istisnalar" sorusunun tek bir cevabı var.
      //
      // Yukarıdaki açık `case`'ler BİLEREK korundu: onlar GİB kararlarını (B-45
      // karma senaryoları, SGK'nın ISTISNA kodlarını da alması) belgeleyen
      // ifadeler ve bugünkü çıktıları değişmemeli. Bu dal yalnız eskiden BOŞ
      // dönen tipleri etkiler → değişiklik toplayıcıdır (additive).
      return configManager.exemptions.filter((def) => {
        const rule = TAX_EXEMPTION_MATRIX.get(def.code);
        if (!rule) return false;
        if (rule.forbiddenInvoiceTypes?.has(type as InvoiceTypeCode)) return false;
        return rule.allowedInvoiceTypes.has(type as InvoiceTypeCode);
      });
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
  // B-78: Schematron paraleli UI uyarıları (v2.0.0)
  /** M4: 555 kodu için `allowReducedKdvRate` flag'ı açık mı */
  allowReducedKdvRate?: boolean;
  /** YTB belge seviyesi KDV subtotals taxAmount>0 AND percent>0 hepsi true mu */
  ytbAllKdvPositive?: boolean;
  /** IHRACKAYITLI+702: satırda GTİP (RequiredCustomsID, 12 hane) var mı */
  hasGtip?: boolean;
  /** IHRACKAYITLI+702: satırda ALICIDIBSATIRKOD var mı */
  hasAliciDibKod?: boolean;
  /** TaxTypeCode 4171 herhangi bir subtotalda kullanılıyor mu */
  has4171Code?: boolean;
  /** IHRACAT: supplier RegistrationName ve TaxOffice dolu mu */
  ihracatPartyComplete?: boolean;
  /** YOLCUBERABERFATURA: buyer nationalityId + passportId dolu mu */
  yolcuBuyerComplete?: boolean;
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

  // B-30 paraleli (ters yön): tevkifatlı satır varken tip izinli olmalı.
  // type-validators.ts'teki B-30 aynı kuralı InvoiceInput katmanında uyguluyor
  // ama YALNIZ validationLevel='strict' altında çalışıyor; session/UI katmanı
  // bu kombinasyonu 4.1.2'ye kadar SESSİZ geçiriyordu (SATIS + tevkifat kodu →
  // 0 uyarı, belge WithholdingTaxTotal ile üretiliyor, GİB reddediyor).
  if (state.hasWithholdingLines && !WITHHOLDING_TOTAL_ALLOWED_TYPES.includes(state.type)) {
    warnings.push({
      field: 'lines.withholdingTaxCode',
      message: `Fatura tipi '${state.type}' iken satırlarda tevkifat kodu kullanılamaz; `
        + 'fatura tipini TEVKIFAT yapın veya tevkifat kodunu kaldırın. '
        + `İzinli tipler: ${WITHHOLDING_TOTAL_ALLOWED_TYPES.join(', ')}.`,
      severity: 'error',
    });
  }

  // YATIRIMTESVIK → ytbNo zorunlu (6 haneli numerik)
  if (state.profile === 'YATIRIMTESVIK' && !state.ytbNo) {
    warnings.push({ field: 'ytbNo', message: 'Yatırım Teşvik faturalarında YTB numarası zorunludur.', severity: 'error' });
  } else if (state.profile === 'YATIRIMTESVIK' && state.ytbNo && (state.ytbNo.length !== 6 || !/^\d{6}$/.test(state.ytbNo))) {
    warnings.push({ field: 'ytbNo', message: 'YTB numarası 6 haneli numerik olmalıdır.', severity: 'error' });
  }

  // B-78.1: 555 KDV kodu + M4 flag kapalı (allowReducedKdvRate=false) → hata
  if (state.kdvExemptionCode === '555' && !state.allowReducedKdvRate) {
    warnings.push({ field: 'kdvExemptionCode',
      message: '555 kodu kullanımı için allowReducedKdvRate flag açık olmalıdır (M4).', severity: 'error' });
  }

  // B-78.2: YATIRIMTESVIK profili + KDV subtotal hepsi pozitif değil → uyarı
  if (state.profile === 'YATIRIMTESVIK' && state.ytbAllKdvPositive === false) {
    warnings.push({ field: 'taxTotals',
      message: 'YATIRIMTESVIK faturalarında tüm KDV subtotal TaxAmount ve Percent > 0 olmalıdır (B-08).',
      severity: 'error' });
  }

  // B-78.3: IHRACKAYITLI + 702 kodu → GTİP + ALICIDIBSATIRKOD zorunlu
  if (state.type === 'IHRACKAYITLI' && state.kdvExemptionCode === '702') {
    if (state.hasGtip === false) {
      warnings.push({ field: 'lines.delivery.goodsItems.requiredCustomsId',
        message: 'IHRACKAYITLI+702 için satırda GTİP (RequiredCustomsID) zorunludur (B-07).',
        severity: 'error' });
    }
    if (state.hasAliciDibKod === false) {
      warnings.push({ field: 'lines.delivery.transportHandlingUnit.customsDeclaration',
        message: 'IHRACKAYITLI+702 için satırda ALICIDIBSATIRKOD zorunludur (B-07).',
        severity: 'error' });
    }
  }

  // B-78.4: TaxTypeCode 4171 sadece TEVKIFAT/IADE/SGK/YTBIADE tiplerinde izinli
  if (state.has4171Code && !['TEVKIFAT', 'IADE', 'SGK', 'YTBIADE'].includes(state.type)) {
    warnings.push({ field: 'taxTotals.taxTypeCode',
      message: 'TaxTypeCode 4171 sadece TEVKIFAT, IADE, SGK, YTBIADE tiplerinde kullanılabilir.',
      severity: 'error' });
  }

  // B-78.5: IHRACAT supplier detay / YOLCU buyer detay
  if (state.profile === 'IHRACAT' && state.ihracatPartyComplete === false) {
    warnings.push({ field: 'supplier',
      message: 'IHRACAT profilinde supplier RegistrationName ve vergi dairesi zorunludur.',
      severity: 'error' });
  }
  if (state.profile === 'YOLCUBERABERFATURA' && state.yolcuBuyerComplete === false) {
    warnings.push({ field: 'buyerCustomer.party',
      message: 'YOLCUBERABERFATURA profilinde alıcı NationalityID ve PasaportNo zorunludur.',
      severity: 'error' });
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
    lineFields: [],     // Session line CRUD/update sonrası doldurulur (Sprint 8h.5)
    availableWithholdingTaxes: [...configManager.withholdingTaxes],
    availableExemptions: getAvailableExemptions(type),
    availableBillingDocumentTypeCodes: getAvailableBillingDocumentTypeCodes(type),
    warnings: [],
  };
}
