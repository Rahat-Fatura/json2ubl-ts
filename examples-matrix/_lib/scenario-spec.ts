/**
 * Sprint 8e — examples-matrix/ spec tip tanımları.
 *
 * `specs.ts` bu tiplere uyan hardcoded array'lerini export eder. `scaffold.ts`
 * bu spec'leri okuyup her biri için klasör + input.ts + run.ts + meta.json
 * (valid için) veya expected-error.json (invalid için) yazar.
 */

import type { SimpleInvoiceInput } from '../../src';
import type { DespatchInput } from '../../src';

/**
 * Bir senaryonun hangi boyutları exercise ettiğinin anlamlı özeti.
 * `meta.json`'a serialize edilir; `find.ts` ve `meta-indexer.ts` bunu okur.
 */
export interface ScenarioDimensions {
  /** Senaryoda kullanılan KDV oranları (ör. [0, 20] veya [20]) */
  kdvBreakdown: number[];
  /** Belge para birimi */
  currency: 'TRY' | 'EUR' | 'USD';
  /** ExchangeRate bölümü var mı (TRY dışı para birimi kullanıldığında true) */
  exchangeRate: boolean;
  /** Kullanılan istisna kodları (ör. ['308'], ['351']) */
  exemptionCodes: string[];
  /** Kullanılan stopaj (withholding) kodları */
  withholdingCodes: string[];
  /** AllowanceCharge kullanımı */
  allowanceCharge: {
    /** Satır-level indirim/ek var mı */
    line: boolean;
    /** Belge-level indirim/ek var mı */
    document: boolean;
  };
  /** Satır sayısı */
  lineCount: number;
  /** PaymentMeans + IBAN var mı */
  paymentMeans: boolean;
  /** 555 (Demirbaş KDV) gate aktif mi (allowReducedKdvRate flag'i) */
  reducedKdvGate: boolean;
  /** Phantom KDV (M12) devrede mi (YATIRIMTESVIK+ISTISNA / EARSIV+YTBISTISNA) */
  phantomKdv: boolean;
  /**
   * Senaryoyu ilgilendiren özel kimlik alanları (ör. ['ytbNo'], ['gtip', 'alicidibkod'],
   * ['passport', 'nationalityId'], ['sevkiyatNo'], ['notaryNumber']).
   */
  specialIdentifiers: string[];
}

export interface DespatchDimensions {
  /**
   * ÇEKİCİ plaka tipleri — her eleman BİR ARAÇTIR ve ayrı bir
   * `cac:ShipmentStage` üretir (ör. `['PLAKA']`, `['PLAKA', 'PLAKA']`).
   *
   * 🔴 DORSE buraya YAZILMAZ; ayrı `trailerPlates` alanı vardır. İkisi eskiden
   * aynı dizide toplanıyordu ve fixture'lar dorseyi ikinci ÇEKİCİ gibi beyan
   * eden — üstelik XSD-geçersiz — XML donduruyordu.
   */
  plates: string[];
  /** Dorse/römork şema tipleri — `TransportHandlingUnit/TransportEquipment` yolu. */
  trailerPlates?: string[];
  /** Sürücü sayısı */
  driverCount: number;
  /** Satır sayısı */
  lineCount: number;
  /** MATBUDAN için AdditionalDocuments var mı */
  additionalDocuments: boolean;
  /** İlgilendiren özel alanlar (ör. ['sevkiyatNo'], ['notaryNumber']) */
  specialIdentifiers: string[];
}

/**
 * Review durumu — üç değer, ÜÇ FARKLI güç seviyesi (`meta-integrity.test.ts`
 * beyaz listesiyle aynı küme):
 *
 *   auto-ok             — iskele üretti, kimse bakmadı. En ZAYIF sinyal.
 *   needs-manual-check  — bilinen bir şüphe var; scaffold bu klasörü ATLAR.
 *   schematron-verified — çıktı CANLI GİB paketine sorulmuş, temiz dönmüştür.
 *
 * ⚠️ Üçüncüsü testin beyaz listesinde vardı ama bu tipte YOKTU; spec yazan
 * kimse onu seçemiyordu. Tip testin gerisinde kalmıştı, eşitlendi.
 */
export type ReviewStatus = 'auto-ok' | 'needs-manual-check' | 'schematron-verified';

/** Fatura (invoice) valid senaryo spec'i. */
export interface ValidInvoiceSpec {
  kind: 'invoice';
  /** Klasör adı için kullanılır: `<profile-lowercase>-<type-lowercase>-<variantSlug>` */
  variantSlug: string;
  /** Profil (PROFILE_TYPE_MATRIX'ten) */
  profile: string;
  /** Tip (PROFILE_TYPE_MATRIX'ten) */
  type: string;
  /** İnsan okunabilir kısa açıklama (meta.notes → README tablosu) */
  notes: string;
  /** Exercised boyutlar (meta.json dimensions'a serialize) */
  dimensions: ScenarioDimensions;
  /** Tam tip-güvenli girdi (input.ts olarak serialize edilir) */
  input: SimpleInvoiceInput;
  /** 'needs-manual-check' ise scaffold atlar (manuel düzenlemeyi korur) */
  review?: ReviewStatus;
}

/** İrsaliye (despatch) valid senaryo spec'i. */
export interface ValidDespatchSpec {
  kind: 'despatch';
  variantSlug: string;
  profile: string;
  type: string;
  notes: string;
  dimensions: DespatchDimensions;
  input: DespatchInput;
  review?: ReviewStatus;
}

export type ValidSpec = ValidInvoiceSpec | ValidDespatchSpec;

/** Invalid senaryoda beklenen bir hata. */
export interface ExpectedError {
  code: string;
  path?: string;
  messageIncludes?: string;
}

/** Invalid senaryo spec'i (fatura). */
export interface InvalidInvoiceSpec {
  kind: 'invalid-invoice';
  /** Klasör adı: `<error-code-slug>-<variantSlug>` */
  variantSlug: string;
  /** Birincil error code (klasör gruplaması için) */
  primaryCode: string;
  /** İnsan okunabilir kısa açıklama */
  description: string;
  /** Hangi profil bağlamında tetikleniyor (dokümantasyon için) */
  profileContext: string;
  /** Hangi tip bağlamında tetikleniyor */
  typeContext: string;
  /** Beklenen hata listesi (collect-all; hepsi bulunmalı) */
  expectedErrors: ExpectedError[];
  /** Strict / basic validation seviye zorunluluğu */
  validationLevel: 'basic' | 'strict';
  /** Çok-hata senaryosu mu (aynı input'tan 2+ hata) */
  isMultiError: boolean;
  /** Input: tip-güvenliği bozuk olabilir (hata tetiklemek için) — deliberately invalid */
  input: SimpleInvoiceInput;
  review?: ReviewStatus;
}

/** Invalid senaryo spec'i (irsaliye). */
export interface InvalidDespatchSpec {
  kind: 'invalid-despatch';
  variantSlug: string;
  primaryCode: string;
  description: string;
  profileContext: string;
  typeContext: string;
  expectedErrors: ExpectedError[];
  validationLevel: 'basic' | 'strict';
  isMultiError: boolean;
  input: DespatchInput;
  review?: ReviewStatus;
}

export type InvalidSpec = InvalidInvoiceSpec | InvalidDespatchSpec;

export type Spec = ValidSpec | InvalidSpec;
