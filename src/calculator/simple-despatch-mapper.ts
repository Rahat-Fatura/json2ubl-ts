/**
 * SimpleDespatchInput → DespatchInput dönüşüm katmanı.
 *
 * Basitleştirilmiş girdiyi mevcut `DespatchBuilder`'ın beklediği `DespatchInput`
 * formatına dönüştürür.
 *
 * ── 🔴 FATURA KATMANININ AYNASI ─────────────────────────────────────────────
 * Dosya `simple-invoice-mapper.ts` ile BİLİNÇLİ olarak aynı desendedir; biri
 * tanındığında diğeri de tanınmalıdır. Korunan simetriler:
 *   · Giriş noktası tek fonksiyon: `mapSimpleToDespatchInput(simple)`
 *     (fatura: `mapSimpleToInvoiceInput(simple, precomputed?)`).
 *   · `datetime` → `issueDate` + `issueTime` bölünmesi AYNI mantık
 *     (`simple-invoice-mapper.ts:72-78`): verilmezse "şimdi".
 *   · Taraf dönüşümü ORTAK (`utils/party-mapper.ts`), kopyalanmaz.
 *   · `type`/`profile` düz string → ham enum'a CAST edilir, doğrulanmaz;
 *     tanınmayan değeri reddetmek doğrulayıcının işidir (bkz. aşağıdaki not).
 *
 * ── FATURADAN FARKI: HESAPLAMA MOTORU YOK ───────────────────────────────────
 * Fatura mapper'ı `calculateDocument`'ın çıktısı üzerinde çalışır; irsaliyede
 * tutar/vergi OLMADIĞI için hesap da yoktur, eşleme DOĞRUDANDIR. Faturada
 * hesaplayıcının doldurduğu iki türev değer burada mapper'ın sorumluluğuna
 * geçer ve KAYNAĞI `simple-despatch-types.ts` JSDoc'larıdır:
 *   · `uuid` yoksa üretilir (`document-calculator.ts:273` ile aynı satır).
 *   · `type`/`profile` yoksa belgelenmiş varsayılana düşer (SEVK/TEMELIRSALIYE).
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  SimpleDespatchInput,
  SimpleDespatchLineInput,
  SimpleDespatchOrderReferenceInput,
  SimpleLicensePlateInput,
  SimpleShipmentInput,
} from './simple-despatch-types';
import { mapSimpleParty } from '../utils/party-mapper';
import { DespatchProfileId, DespatchTypeCode } from '../types/enums';
import type {
  DespatchInput,
  DespatchLineInput,
  DespatchShipmentInput,
  LicensePlateInput,
  LicensePlateSchemeId,
} from '../types/despatch-input';
import type {
  AddressInput,
  AdditionalDocumentInput,
  OrderReferenceInput,
} from '../types/common';
import { isNonEmpty } from '../utils/formatters';

// ─── Varsayılanlar ────────────────────────────────────────────────────────────

/** `SimpleDespatchInput.type` verilmediğinde (bkz. tip JSDoc'u). */
const DEFAULT_DESPATCH_TYPE = 'SEVK';
/** `SimpleDespatchInput.profile` verilmediğinde (bkz. tip JSDoc'u). */
const DEFAULT_DESPATCH_PROFILE = 'TEMELIRSALIYE';
/** `SimpleTrailerPlateInput.scheme` verilmediğinde (bkz. tip JSDoc'u). */
const DEFAULT_TRAILER_PLATE_SCHEME = 'DORSEPLAKA';
/** `SimpleLicensePlateInput.scheme` verilmediğinde (bkz. tip JSDoc'u). */
const DEFAULT_LICENSE_PLATE_SCHEME: LicensePlateSchemeId = 'PLAKA';
/** `SimpleShipmentInput.goodsValueCurrency` verilmediğinde. */
const DEFAULT_GOODS_VALUE_CURRENCY = 'TRY';
/** `SimpleDeliveryAddressInput.country` verilmediğinde (fatura tarafıyla aynı). */
const DEFAULT_COUNTRY = 'Türkiye';
/**
 * MATBUDAN dönüşümünde ek belgenin `cbc:DocumentType` SABİT değeri.
 * UBL-TR Sevk İrsaliyesi Kılavuzu V1.2: «DocumentType alanına MATBU sabit değeri
 * yazılmalıdır.» Sabit olduğu için geliştiriciden İSTENMEZ, SDK yazar — aynı
 * disiplin faturada SGK bloğunda da uygulanır (`documentTypeCode: 'MUKELLEF_KODU'`).
 */
const MATBU_DOCUMENT_TYPE = 'MATBU';

// ─── Ana Dönüşüm Fonksiyonu ───────────────────────────────────────────────────

/**
 * `SimpleDespatchInput`'u `DespatchInput`'a dönüştürür.
 *
 * ⚠️ DOĞRULAMA YAPMAZ. Fatura mapper'ı da yapmaz: tanınmayan `type`/`profile`
 * değeri burada sessizce cast edilir ve `validateDespatch` tarafından
 * (`DespatchAdviceTypeCodeCheck` / `ProfileIDTypeDespatchAdvice` karşılıkları)
 * reddedilir. Gerekçe fatura emsaliyle aynı: mapper atarsa hata TEK bir istisna
 * olarak çıkar, doğrulayıcı ise hataların TAMAMINI yol bilgisiyle döndürür.
 */
export function mapSimpleToDespatchInput(simple: SimpleDespatchInput): DespatchInput {
  const { date: issueDate, time: issueTime } = splitDatetime(simple.datetime, true);

  const result: DespatchInput = {
    // Zorunlu alanlar
    id: simple.id ?? '',
    uuid: simple.uuid ?? uuidv4(),
    profileId: (simple.profile ?? DEFAULT_DESPATCH_PROFILE) as DespatchProfileId,
    despatchTypeCode: (simple.type ?? DEFAULT_DESPATCH_TYPE) as DespatchTypeCode,
    issueDate,
    issueTime,
    supplier: mapSimpleParty(simple.sender),
    customer: mapSimpleParty(simple.customer),
    shipment: buildShipment(simple.shipment),
    lines: buildLines(simple.lines),

    // Opsiyonel alanlar
    notes: simple.notes,
  };

  if (simple.orderReferences?.length) {
    result.orderReferences = simple.orderReferences.map(ref =>
      buildOrderReference(ref, issueDate),
    );
  }

  const additionalDocs = buildAdditionalDocuments(simple, issueDate);
  if (additionalDocs.length > 0) {
    result.additionalDocuments = additionalDocs;
  }

  if (isNonEmpty(simple.despatchContactName)) {
    result.despatchContactName = simple.despatchContactName;
  }

  // B-48: XSD'nin opsiyonel üç taraf tipi — hepsi AYNI ortak taraf eşleyicisinden geçer.
  if (simple.buyerCustomer) result.buyerCustomer = mapSimpleParty(simple.buyerCustomer);
  if (simple.sellerSupplier) result.sellerSupplier = mapSimpleParty(simple.sellerSupplier);
  if (simple.originator) result.originator = mapSimpleParty(simple.originator);

  return result;
}

// ─── Tarih/Saat Bölünmesi ─────────────────────────────────────────────────────

/**
 * Tek alanlık `datetime`'ı `date` + `time` ikilisine böler.
 *
 * Bölme mantığı fatura mapper'ından (`simple-invoice-mapper.ts:72-78`) AYNEN
 * alınmıştır. `IssueTime` irsaliyede XSD-ZORUNLUDUR (B-18), bu yüzden düzenleme
 * anında "verilmezse şimdi" dalı faturadakinden daha kritiktir — boş kalırsa
 * belge reddedilir.
 *
 * 🔴 `fallbackToNow` PARAMETRE, çünkü iki kullanım NORMATİF OLARAK AYRIŞIR:
 *   · DÜZENLEME ANI (`datetime`) → verilmezse ŞİMDİ. Belge tanımı gereği şu an
 *     düzenleniyor; "şimdi" uydurma değil, olgunun kendisidir (fatura da böyle).
 *   · FİİLİ SEVK ANI (`actualDespatchDatetime`) → verilmezse BOŞ. Sevkin ne zaman
 *     başladığı DIŞ DÜNYAYA ait bir olgudur; bilinmiyorken "şimdi" yazmak belgeye
 *     GERÇEK OLMAYAN veri koymaktır — posta kodunu `'00000'` ile doldurmakla aynı
 *     hata sınıfı (VUK 227/3, bkz. `utils/party-mapper.ts`). Boş bırakılır ve
 *     `validateDespatch` eksikliği kullanıcıya bildirir.
 */
function splitDatetime(
  datetime: string | undefined,
  fallbackToNow: boolean,
): { date: string; time: string } {
  if (!datetime) {
    if (!fallbackToNow) return { date: '', time: '' };
    const now = new Date().toISOString();
    return { date: now.substring(0, 10), time: now.substring(11, 19) };
  }

  return {
    date: datetime.substring(0, 10),
    time: datetime.length > 10
      ? datetime.substring(11, 19)
      : new Date().toISOString().substring(11, 19),
  };
}

// ─── Sevkiyat ─────────────────────────────────────────────────────────────────

function buildShipment(shipment: SimpleShipmentInput): DespatchShipmentInput {
  // 🔴 `false`: fiili sevk anı bilinmiyorsa UYDURULMAZ — bkz. `splitDatetime` notu.
  const { date: actualDespatchDate, time: actualDespatchTime } =
    splitDatetime(shipment.actualDespatchDatetime, false);

  const result: DespatchShipmentInput = {
    actualDespatchDate,
    actualDespatchTime,
    deliveryAddress: buildDeliveryAddress(shipment),
  };

  if (shipment.drivers?.length) {
    result.driverPersons = shipment.drivers.map(driver => ({
      firstName: driver.firstName,
      familyName: driver.familyName,
      nationalityId: driver.nationalityId,
    }));
  }

  if (shipment.carrier) {
    /* 🔴 ORTAK EŞLEYİCİ — dosya başındaki "Taraf dönüşümü ORTAK, kopyalanmaz"
     * kuralının tek istisnası buydu. Burada dar bir kopya vardı ve taşıyıcının
     * ADRESİNİ ATIYORDU; UBL-TR `PartyType`'ta `cac:PostalAddress` zorunlu
     * olduğu için şoförsüz irsaliye GİB kapısından hiç geçemiyordu. `SimplePartyInput`
     * adresi zaten taşıyor — atan taraf eşleyiciydi. */
    result.carrierParty = mapSimpleParty(shipment.carrier);
  }

  if (shipment.licensePlates?.length) {
    result.licensePlates = shipment.licensePlates.map(buildLicensePlate);
  }

  /* B-49: dorse plakası AYRI düğüme gider (`TransportHandlingUnit/TransportEquipment`).
   * `licensePlates`e ikinci eleman eklemek XSD'yi ihlal ederdi — gerekçe
   * `SimpleTrailerPlateInput` JSDoc'unda. */
  if (shipment.trailerPlates?.length) {
    result.transportHandlingUnits = shipment.trailerPlates.map(plate => ({
      transportEquipmentId: plate.value,
      schemeId: plate.scheme ?? DEFAULT_TRAILER_PLATE_SCHEME,
    }));
  }

  if (isNonEmpty(shipment.shipmentId)) {
    result.shipmentId = shipment.shipmentId;
  }

  /* B-73: irsaliyedeki TEK tutar alanı. `Simple*` katmanında iki düz alana
   * (`goodsValue` + `goodsValueCurrency`) açılmıştır; ham katmanda iç içe
   * `goodsItem.valueAmount` nesnesidir. Düzleştirmenin gerekçesi yol üretecidir:
   * inline nesne literalini yalnız bir kat açtığı için iç içe biçim
   * `shipment.goodsItem.valueAmount.value` yolunu ÜRETEMİYORDU. */
  if (shipment.goodsValue !== undefined) {
    result.goodsItem = {
      valueAmount: {
        value: shipment.goodsValue,
        currencyId: shipment.goodsValueCurrency ?? DEFAULT_GOODS_VALUE_CURRENCY,
      },
    };
  }

  return result;
}

function buildDeliveryAddress(shipment: SimpleShipmentInput): AddressInput {
  const address = shipment.deliveryAddress;
  return {
    streetName: address.address,
    citySubdivisionName: address.district,
    cityName: address.city,
    postalZone: address.zipCode,
    country: address.country ?? DEFAULT_COUNTRY,
  };
}

function buildLicensePlate(plate: SimpleLicensePlateInput): LicensePlateInput {
  return {
    plateNumber: plate.value,
    schemeId: plate.scheme ?? DEFAULT_LICENSE_PLATE_SCHEME,
  };
}

// ─── Kalemler ─────────────────────────────────────────────────────────────────

/**
 * Satır numarası `Simple*` katmanında YOKTUR, indeksten türetilir.
 *
 * Şematron `DespatchLineIdCheck` `cbc:ID`'nin dolu ve gerçek sayı olmasını arar;
 * 1'den başlayan sıra numarası bu şartı kendiliğinden sağlar ve geliştiriciye
 * anlamsız bir alan sormamış oluruz (faturada satır ID'si de böyle üretilir).
 */
function buildLines(lines: SimpleDespatchLineInput[]): DespatchLineInput[] {
  return lines.map((line, index) => buildSingleLine(line, index));
}

function buildSingleLine(line: SimpleDespatchLineInput, index: number): DespatchLineInput {
  const result: DespatchLineInput = {
    id: String(index + 1),
    deliveredQuantity: line.quantity,
    unitCode: line.unitCode,
    item: { name: line.name },
  };

  if (isNonEmpty(line.description)) result.item.description = line.description;

  if (line.additionalIdentifications?.length) {
    result.item.additionalItemIdentifications = line.additionalIdentifications.map(id => ({
      schemeId: id.scheme,
      value: id.value,
    }));
  }

  if (isNonEmpty(line.note)) result.note = line.note;

  return result;
}

// ─── Referanslar ──────────────────────────────────────────────────────────────

/**
 * Sipariş referansı — `OrderReferenceInput.issueDate` XSD-ZORUNLUDUR (B-33).
 *
 * Kullanıcı tarih vermediyse belgenin tarihi yedektir; faturada aynı kusur
 * (`cbc:IssueDate` boş kalınca GİB reddi) ek belge referansında yaşandı ve aynı
 * çözümle kapatıldı (`simple-invoice-mapper.ts` ek belge bloğu).
 */
function buildOrderReference(
  ref: SimpleDespatchOrderReferenceInput,
  documentIssueDate: string,
): OrderReferenceInput {
  return {
    id: ref.id,
    issueDate: ref.issueDate ?? documentIssueDate,
  };
}

function buildAdditionalDocuments(
  simple: SimpleDespatchInput,
  documentIssueDate: string,
): AdditionalDocumentInput[] {
  if (!simple.additionalDocuments?.length) return [];

  const isMatbudan = (simple.type ?? DEFAULT_DESPATCH_TYPE) === DespatchTypeCode.MATBUDAN;

  return simple.additionalDocuments.map(doc => {
    const mapped: AdditionalDocumentInput = {
      id: doc.id,
      issueDate: doc.issueDate || documentIssueDate,
      documentTypeCode: doc.documentTypeCode,
      documentDescription: doc.description,
    };
    // MATBUDAN'da `DocumentType` kılavuzca SABİT 'MATBU' — bkz. MATBU_DOCUMENT_TYPE.
    if (isMatbudan) mapped.documentType = MATBU_DOCUMENT_TYPE;
    return mapped;
  });
}
