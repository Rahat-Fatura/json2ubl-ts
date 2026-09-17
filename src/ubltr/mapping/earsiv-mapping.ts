/**
 * e-Arşiv BELGE eşleme yardımcıları — basit girdiden UBL bloklarına.
 *
 * ── NİYE ORTAK ─────────────────────────────────────────────────────────────
 * e-SMM ve e-MM'in eşleyicileri üç noktada BİREBİR aynıydı: düzenleme
 * tarih/saatinin damgadan ayrıştırılması, `cac:PricingExchangeRate` kurulumu ve
 * gönderim şekli referansı. Üçü de belge türüne göre değişmez; üçü de eski
 * sistemden devralınmış ORTAK desenlerdir (`EXT_SEND_METHOD` anahtarı 25/27
 * prod e-MM ve 12/12 prod e-SMM belgesinde aynı biçimde geçer).
 *
 * Kopyalansalardı en pahalı kusur `normalizeTime` yedeğinde çıkardı: saat
 * `HH:mm` gelirse saniye tamamlanmalı, gelmezse "şimdi" alınmalı. İki kopyadan
 * birinde bu yedek eksik kalsa belge XSD `xs:time`ı patlatırdı.
 *
 * ── KATMAN ─────────────────────────────────────────────────────────────────
 * `ubltr/` katmanındadır: ürettiği şey UBL-TR/e-Arşiv ekosistemine ait bir
 * SÖZLEŞMEDİR, bir belge türünün kararı değil. Belge katmanları (rank 3) buradan
 * okur; buradan hiçbir belge katmanı görünmez.
 */

import type { AdditionalDocumentInput, ExchangeRateInput } from '../../types/common';
import { isNonEmpty, normalizeTime } from '../../utils/formatters';
import { NATIONAL_CURRENCY_CODE } from '../rules/shared/currency-rules';

/**
 * Gönderim şekli referansının `DocumentTypeCode`u — eski sistemle ORTAK anahtar.
 *
 * Rapor eşlemesi `DocumentTypeCode=EXT_SEND_METHOD` taşıyan referansı arayıp
 * `gonderimSekli` alanını doldurur.
 */
export const SEND_METHOD_DOCUMENT_TYPE_CODE = 'EXT_SEND_METHOD';

/** Gönderim şekli — `ELEKTRONIK` (portal/e-posta) ya da `KAGIT` (matbu çıktı). */
export type EArchiveSendMethod = 'ELEKTRONIK' | 'KAGIT';

/** Damgadan ayrıştırılmış düzenleme tarihi + saati. */
export interface IssueStamp {
  /** `YYYY-MM-DD`. */
  issueDate: string;
  /** `HH:mm:ss` — `xs:time` uyumlu, saniyesi tamamlanmış. */
  issueTime: string;
}

/**
 * `YYYY-MM-DDTHH:mm:ss` damgasını tarih + saate ayırır.
 *
 * Damga yoksa ya da yalnız tarih taşıyorsa saat "ŞİMDİ"den alınır: hem makbuz
 * hem müstahsil makbuzu TAHSİLAT/TESLİM ANINDA düzenlenir ve saat belgenin
 * kendisine aittir (509 sıra no.lu VUK GT IV.4.3-c saat-dakika ister).
 *
 * `normalizeTime` yalnız null/undefined girdide `undefined` döner; kaynak burada
 * daima dolu bir dizgidir, yine de sözleşme dışına çıkmamak için yedekli.
 */
export function splitIssueStamp(datetime: string | undefined): IssueStamp {
  const now = new Date().toISOString();
  const stamp = isNonEmpty(datetime) ? datetime : now;
  const issueDate = stamp.substring(0, 10);
  const rawTime = stamp.length > 10 ? stamp.substring(11, 19) : now.substring(11, 19);
  return { issueDate, issueTime: normalizeTime(rawTime) ?? rawTime };
}

/**
 * `cac:PricingExchangeRate` girdisi — TRY belgede `undefined`.
 *
 * Kur yalnız TRY DIŞI belgede anlamlıdır; TRY belgeye kur yazmak şematronun
 * istemediği bir blok üretir. Kur verilmemişse burada hata ÜRETİLMEZ — o kapı
 * doğrulayıcıya aittir (`validateDocumentCurrency`), eşleyici sessizce atlar ve
 * eksiklik doğrulamada GÖRÜNÜR olur.
 */
export function buildPricingExchangeRate(
  currencyCode: string,
  rate: number | undefined,
): ExchangeRateInput | undefined {
  if (currencyCode === NATIONAL_CURRENCY_CODE) return undefined;
  if (typeof rate !== 'number') return undefined;
  return {
    sourceCurrencyCode: currencyCode,
    targetCurrencyCode: NATIONAL_CURRENCY_CODE,
    calculationRate: rate,
  };
}

/**
 * Gönderim şekli referansı — `cac:AdditionalDocumentReference`.
 *
 * `cbc:ID` olarak gönderim şeklinin KENDİSİ yazılır (prod deseni).
 * `cbc:IssueDate` `DocumentReferenceType`ta 1..1 olduğundan belgenin tarihine
 * düşülür.
 */
export function buildSendMethodReference(
  sendMethod: EArchiveSendMethod | undefined,
  issueDate: string,
): AdditionalDocumentInput | undefined {
  if (!isNonEmpty(sendMethod)) return undefined;
  return {
    id: sendMethod,
    issueDate,
    documentTypeCode: SEND_METHOD_DOCUMENT_TYPE_CODE,
  };
}
