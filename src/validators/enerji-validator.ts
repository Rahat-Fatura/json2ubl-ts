/**
 * Sprint 9 — Enerji/Şarj (SARJ / SARJANLIK) zorunlulukları.
 *
 * ## Normatif kaynak
 * UBL-TR Schematron 20260701 (GİB duyurusu 27.07.2026, yürürlük 14.09.2026).
 * `History.txt` md.1-4 ile eklenen dört kural:
 *
 * | Kural (abstract id)                  | Main context                          | Kapsam           |
 * |--------------------------------------|---------------------------------------|------------------|
 * | `EnerjiInvoicePeriodCheck`           | `inv:Invoice`                         | SARJ + SARJANLIK |
 * | `EnerjiESURaporIDCheck`              | `inv:Invoice`                         | yalnız SARJ      |
 * | `EnerjiPartyIdentificationPlakaCheck`| `.../cac:AccountingCustomerParty/cac:Party` | SARJ + SARJANLIK |
 * | `EnerjiItemInstanceSerialIDCheck`    | `inv:Invoice/cac:InvoiceLine`         | yalnız SARJANLIK |
 *
 * ## Kapsam belirleyici
 * Kurallar `InvoiceTypeCode`'a bakar — `ProfileID`'ye DEĞİL. `PROFILE_TYPE_MATRIX`
 * SARJ/SARJANLIK'ı yalnız ENERJI profiline izin verse de Schematron'a sadık kalmak
 * için burada tip kontrolü esas alınmıştır.
 *
 * @see schematrons/UBL-TR_Common_Schematron.xml
 */

import { InvoiceTypeCode } from '../types/enums';
import {
  ENERJI_PLATE_REGEX,
  ENERJI_PLATE_MAX_LENGTH,
  ENERJI_PERIOD_MIN_DATE,
  ESU_RAPOR_ID_SCHEME_ID,
  ESU_RAPOR_ISSUE_DATE_REGEX,
  UUID_REGEX,
  DATE_REGEX,
  TIME_REGEX,
} from '../config/constants';
import type { InvoiceInput } from '../types/invoice-input';
import type { ValidationError } from '../errors/ubl-build-error';
import { isNonEmpty } from '../utils/formatters';

/** SARJ + SARJANLIK — InvoicePeriod ve müşteri plaka kuralları bu iki tipte geçerli */
const ENERJI_TYPES: ReadonlySet<InvoiceTypeCode> = new Set([
  InvoiceTypeCode.SARJ,
  InvoiceTypeCode.SARJANLIK,
]);

/** Müşteri plaka kimliğinin schemeID'si */
const PLAKA_SCHEME_ID = 'PLAKA';

// ============================================================
// EnerjiInvoicePeriodCheck — SARJ + SARJANLIK
// ============================================================

/**
 * SARJ/SARJANLIK faturalarında en az bir `cac:InvoicePeriod` bulunmalı; altında
 * `StartDate`, `StartTime`, `EndDate`, `EndTime` dolu olmalı. Tarihler
 * `2005-01-01` veya sonrası, saatler `HH:mm:ss` formatında.
 *
 * NOT: Kütüphanede `invoicePeriod` TEKİL (`PeriodInput`). Schematron
 * `count(cac:InvoicePeriod) > 0` diyor — tek dönem bu koşulu sağlar.
 */
export function validateEnerjiInvoicePeriod(input: InvoiceInput): ValidationError[] {
  if (!ENERJI_TYPES.has(input.invoiceTypeCode)) return [];

  const period = input.invoicePeriod;
  if (!period) {
    return [{
      code: 'ENERJI_INVOICE_PERIOD_REQUIRED',
      message: `${input.invoiceTypeCode} faturalarında cac:InvoicePeriod zorunludur ` +
        '(StartDate, StartTime, EndDate, EndTime dolu olmalı)',
      path: 'invoicePeriod',
      expected: 'StartDate + StartTime + EndDate + EndTime',
      actual: 'InvoicePeriod yok',
    }];
  }

  const errors: ValidationError[] = [];

  const checkDate = (field: 'startDate' | 'endDate'): void => {
    const value = period[field];
    if (!isNonEmpty(value)) {
      errors.push({
        code: 'ENERJI_INVOICE_PERIOD_REQUIRED',
        message: `${input.invoiceTypeCode} faturalarında InvoicePeriod.${field} zorunludur`,
        path: `invoicePeriod.${field}`,
        expected: 'YYYY-MM-DD',
        actual: 'boş',
      });
      return;
    }
    if (!DATE_REGEX.test(value!)) {
      errors.push({
        code: 'ENERJI_INVOICE_PERIOD_INVALID',
        message: `InvoicePeriod.${field} geçerli bir tarih olmalıdır`,
        path: `invoicePeriod.${field}`,
        expected: 'YYYY-MM-DD',
        actual: value,
      });
      return;
    }
    // Schematron: xs:date('2005-01-01+04:00') le xs:date(value)
    if (value! < ENERJI_PERIOD_MIN_DATE) {
      errors.push({
        code: 'ENERJI_INVOICE_PERIOD_INVALID',
        message: `InvoicePeriod.${field} ${ENERJI_PERIOD_MIN_DATE} veya sonrası olmalıdır`,
        path: `invoicePeriod.${field}`,
        expected: `>= ${ENERJI_PERIOD_MIN_DATE}`,
        actual: value,
      });
    }
  };

  const checkTime = (field: 'startTime' | 'endTime'): void => {
    const value = period[field];
    if (!isNonEmpty(value)) {
      errors.push({
        code: 'ENERJI_INVOICE_PERIOD_REQUIRED',
        message: `${input.invoiceTypeCode} faturalarında InvoicePeriod.${field} zorunludur`,
        path: `invoicePeriod.${field}`,
        expected: 'HH:mm:ss',
        actual: 'boş',
      });
      return;
    }
    if (!TIME_REGEX.test(value!)) {
      errors.push({
        code: 'ENERJI_INVOICE_PERIOD_INVALID',
        message: `InvoicePeriod.${field} HH:mm:ss formatında olmalıdır`,
        path: `invoicePeriod.${field}`,
        expected: 'HH:mm:ss',
        actual: value,
      });
    }
  };

  checkDate('startDate');
  checkTime('startTime');
  checkDate('endDate');
  checkTime('endTime');

  return errors;
}

// ============================================================
// EnerjiESURaporIDCheck — yalnız SARJ
// ============================================================

/**
 * SARJ faturalarında en az bir `cac:AdditionalDocumentReference` bulunmalı; bu
 * element altında `schemeID="ESURaporID"` taşıyan GUID formatlı bir `cbc:ID` ve
 * `^20\d{2}-\d{2}-\d{2}$` formatında `cbc:IssueDate` olmalıdır (1..n).
 *
 * SARJANLIK'ta bu kural YOKTUR.
 */
export function validateEnerjiEsuRaporId(input: InvoiceInput): ValidationError[] {
  if (input.invoiceTypeCode !== InvoiceTypeCode.SARJ) return [];

  const hasValid = input.additionalDocuments?.some(doc =>
    doc.schemeId === ESU_RAPOR_ID_SCHEME_ID &&
    isNonEmpty(doc.id) &&
    UUID_REGEX.test(doc.id.trim()) &&
    isNonEmpty(doc.issueDate) &&
    ESU_RAPOR_ISSUE_DATE_REGEX.test(doc.issueDate!.trim()),
  ) ?? false;

  if (hasValid) return [];

  return [{
    code: 'ENERJI_ESU_RAPOR_ID_REQUIRED',
    message: 'SARJ faturalarında schemeID="ESURaporID" olan, GUID formatında cbc:ID ve ' +
      'YYYY-MM-DD formatında cbc:IssueDate taşıyan en az bir ' +
      'cac:AdditionalDocumentReference zorunludur',
    path: 'additionalDocuments',
    expected: `schemeId="${ESU_RAPOR_ID_SCHEME_ID}" + GUID id + issueDate`,
    actual: `${input.additionalDocuments?.length ?? 0} kayıt, geçerli ESURaporID yok`,
  }];
}

// ============================================================
// EnerjiPartyIdentificationPlakaCheck — SARJ + SARJANLIK
// ============================================================

/**
 * SARJ/SARJANLIK faturalarında `cac:AccountingCustomerParty/cac:Party` altında
 * `schemeID="PLAKA"` olan **tam 1 adet** `cac:PartyIdentification/cbc:ID`
 * bulunmalıdır. Değer boş olamaz, en fazla 50 karakter, `^[A-Z0-9_-]+$`.
 *
 * ⚠️ Bu regex e-İrsaliye plaka regex'inden (`TR_LICENSE_PLATE_REGEX`) FARKLIDIR —
 * burada il kodu kuralı yoktur. Schematron'a sadık kalınmıştır.
 */
export function validateEnerjiCustomerPlaka(input: InvoiceInput): ValidationError[] {
  if (!ENERJI_TYPES.has(input.invoiceTypeCode)) return [];

  const plates = input.customer?.additionalIdentifiers?.filter(
    id => id.schemeId === PLAKA_SCHEME_ID,
  ) ?? [];

  // Schematron: count(...[@schemeID='PLAKA']) = 1
  if (plates.length !== 1) {
    return [{
      code: 'ENERJI_CUSTOMER_PLAKA_REQUIRED',
      message: `${input.invoiceTypeCode} faturalarında alıcıda schemeID="PLAKA" olan ` +
        'tam 1 adet PartyIdentification bulunmalıdır',
      path: 'customer.additionalIdentifiers',
      expected: 'tam 1 adet PLAKA',
      actual: `${plates.length} adet`,
    }];
  }

  const value = plates[0].value?.trim() ?? '';
  if (!isNonEmpty(value) ||
      value.length > ENERJI_PLATE_MAX_LENGTH ||
      !ENERJI_PLATE_REGEX.test(value)) {
    return [{
      code: 'ENERJI_CUSTOMER_PLAKA_INVALID',
      message: `${input.invoiceTypeCode} faturalarında alıcı plaka değeri boş olamaz, ` +
        `en fazla ${ENERJI_PLATE_MAX_LENGTH} karakter ve ^[A-Z0-9_-]+$ formatında olmalıdır`,
      path: 'customer.additionalIdentifiers.PLAKA',
      expected: `^[A-Z0-9_-]+$, <= ${ENERJI_PLATE_MAX_LENGTH} karakter`,
      actual: plates[0].value,
    }];
  }

  return [];
}

// ============================================================
// EnerjiItemInstanceSerialIDCheck — yalnız SARJANLIK
// ============================================================

/**
 * SARJANLIK faturalarında **her satırda** `cac:Item/cac:ItemInstance/cbc:SerialID`
 * bulunmalı ve boş olmamalıdır.
 *
 * Schematron context'i `inv:Invoice/cac:InvoiceLine` olduğu için kural satır satır
 * uygulanır — "en az bir satırda" DEĞİL, "her satırda".
 */
export function validateEnerjiItemInstanceSerialId(input: InvoiceInput): ValidationError[] {
  if (input.invoiceTypeCode !== InvoiceTypeCode.SARJANLIK) return [];

  const errors: ValidationError[] = [];

  input.lines?.forEach((line, idx) => {
    const hasSerial = line.item?.itemInstances?.some(
      inst => isNonEmpty(inst.serialId?.trim()),
    ) ?? false;

    if (!hasSerial) {
      errors.push({
        code: 'ENERJI_ITEM_SERIAL_ID_REQUIRED',
        message: 'SARJANLIK faturalarında her kalemde ' +
          'cac:Item/cac:ItemInstance/cbc:SerialID bulunmalı ve boş olmamalıdır',
        path: `lines[${idx}].item.itemInstances`,
        expected: 'boş olmayan serialId',
        actual: 'SerialID yok veya boş',
      });
    }
  });

  return errors;
}

// ============================================================
// Toplu giriş
// ============================================================

/** Dört Enerji/Şarj kuralını sırayla uygular. */
export function validateEnerji(input: InvoiceInput): ValidationError[] {
  return [
    ...validateEnerjiInvoicePeriod(input),
    ...validateEnerjiEsuRaporId(input),
    ...validateEnerjiCustomerPlaka(input),
    ...validateEnerjiItemInstanceSerialId(input),
  ];
}
