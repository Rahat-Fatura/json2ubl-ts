/**
 * Online satış gönderi bilgisi için simple-input katmanı validator (B-101).
 *
 * ── Neden var ──────────────────────────────────────────────────────────────────
 * e-Arşiv Raporu Kılavuzu §3.3.2.17 `fatura/internetSatisBilgi` bloğunda:
 *   - `gonderiBilgileri/gonderimTarihi` — kardinalite **1**
 *   - `gonderiBilgileri/gonderiTasiyan` — kardinalite **1** (`kisiType`:
 *     tüzel kişi = vkn + unvan | gerçek kişi = tckn + adiSoyadi)
 * v1.17 (22.05.2024) ile gönderim bilgileri zorunlu hâle geldi. Bu iki alan
 * faturanın UBL'inden türetilir; UBL'de yoksa entegratör geçerli rapor üretemez.
 *
 * ── Neden 'strict' ────────────────────────────────────────────────────────────
 * v2.2.6'ya kadar `onlineSale.carrierName/carrierTaxNumber/deliveryDate` mapper'da
 * hiç okunmuyordu — verilse de XML'e düşmüyordu. Dolayısıyla bu alanları eksik
 * gönderen mevcut tüketiciler bugün hatasız XML alıyor. Eksik kombinasyonu 'basic'
 * seviyede hataya çevirmek onları kırardı; bu yüzden kural 'strict' seviyeye
 * bağlandı. 'basic'te davranış: elde olan emit edilir, eksik CarrierParty atlanır.
 */

import type { SimpleOnlineSaleInput, SimpleInvoiceInput } from '../calculator/simple-types';
import type { ValidationError } from '../errors/ubl-build-error';
import { isNonEmpty } from '../utils/formatters';

/**
 * `cac:CarrierParty` ŞEMA-GEÇERLİ olarak üretilebilir mi?
 *
 * UBL-TR `PartyType` (GİB `xsdrt/common/UBL-CommonAggregateComponents-2.1.xsd`):
 *   `cac:PartyIdentification` minOccurs=1 → VKN/TCKN zorunlu
 *   `cac:PostalAddress`       minOccurs=1 → adres bloğu zorunlu
 * Adres içinde CityName + CitySubdivisionName zorunlu (B-35).
 *
 * Mapper ve validator aynı kararı vermeli; tek kaynak burasıdır.
 */
export function canBuildCarrierParty(os: SimpleOnlineSaleInput): boolean {
  return (
    isNonEmpty(os.carrierTaxNumber) &&
    isNonEmpty(os.carrierCity) &&
    isNonEmpty(os.carrierDistrict)
  );
}

/** Taşıyıcıya dair herhangi bir bilgi verilmiş mi? */
function hasAnyCarrierHint(os: SimpleOnlineSaleInput): boolean {
  return (
    isNonEmpty(os.carrierTaxNumber) ||
    isNonEmpty(os.carrierName) ||
    isNonEmpty(os.carrierCity) ||
    isNonEmpty(os.carrierDistrict) ||
    isNonEmpty(os.carrierAddress)
  );
}

/**
 * B-101 — internet satışı gönderi bilgisi bütünlüğü.
 *
 * Kurallar (yalnız `validationLevel: 'strict'`):
 * - `isOnlineSale` true ise `deliveryDate` zorunlu (rapor `gonderimTarihi`)
 * - `isOnlineSale` true ise taşıyıcı bilgisi zorunlu (rapor `gonderiTasiyan`)
 * - Taşıyıcıya dair bir şey verilmişse blok TAM olmalı: VKN/TCKN + ad + il + ilçe
 * - VKN/TCKN 10 veya 11 hane olmalı
 */
export function validateOnlineSaleShipment(input: SimpleInvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const os = input.onlineSale;
  if (!os) return errors;

  const isOnline = os.isOnlineSale === true;

  if (isOnline && !isNonEmpty(os.deliveryDate)) {
    errors.push({
      code: 'MISSING_FIELD',
      message:
        'İnternet satışında gönderim/teslim tarihi zorunlu — e-Arşiv raporu ' +
        'internetSatisBilgi/gonderiBilgileri/gonderimTarihi (kardinalite 1) bu alandan beslenir',
      path: 'onlineSale.deliveryDate',
    });
  }

  if (isOnline && !hasAnyCarrierHint(os)) {
    errors.push({
      code: 'MISSING_FIELD',
      message:
        'İnternet satışında gönderiyi taşıyan bilgisi zorunlu — e-Arşiv raporu ' +
        'internetSatisBilgi/gonderiBilgileri/gonderiTasiyan (kardinalite 1) bu alanlardan beslenir',
      path: 'onlineSale.carrierTaxNumber',
    });
    return errors;
  }

  if (!hasAnyCarrierHint(os)) return errors;

  // Kısmi taşıyıcı bilgisi → cac:CarrierParty şema-geçerli üretilemez.
  const missing: string[] = [];
  if (!isNonEmpty(os.carrierTaxNumber)) missing.push('carrierTaxNumber');
  if (!isNonEmpty(os.carrierName)) missing.push('carrierName');
  if (!isNonEmpty(os.carrierCity)) missing.push('carrierCity');
  if (!isNonEmpty(os.carrierDistrict)) missing.push('carrierDistrict');

  if (missing.length > 0) {
    errors.push({
      code: 'MISSING_FIELD',
      message:
        'Taşıyıcı bilgisi eksik — cac:Delivery/cac:CarrierParty üretilemiyor. ' +
        'UBL-TR PartyType\'ta cac:PartyIdentification ve cac:PostalAddress zorunlu, ' +
        'adreste CityName + CitySubdivisionName zorunlu (B-35)',
      path: 'onlineSale',
      expected: 'carrierTaxNumber + carrierName + carrierCity + carrierDistrict',
      actual: `eksik: ${missing.join(', ')}`,
    });
  }

  if (isNonEmpty(os.carrierTaxNumber)) {
    const len = os.carrierTaxNumber.trim().length;
    if (len !== 10 && len !== 11) {
      errors.push({
        code: 'INVALID_FORMAT',
        message: 'Taşıyıcı vergi/kimlik numarası 10 hane (VKN) veya 11 hane (TCKN) olmalı',
        path: 'onlineSale.carrierTaxNumber',
        expected: '10 (VKN) veya 11 (TCKN) hane',
        actual: String(len),
      });
    }
  }

  return errors;
}
