/**
 * S3 — YÜKLEM katmanı · **XSD KARDİNALİTE** kuralları.
 *
 * ## Kusur sınıfı: "sessizce geçersiz XML"
 *
 * Şematron kuralları `validate()` çıktısına ÇOK İYİ eşlenir; XSD kardinalitesi
 * eşlenMEZ. Serileştirici bir düğümü N kez yazabildiği ya da zorunlu bir çocuğu
 * hiç yazmadığı hâlde doğrulayıcı susuyordu — kullanıcı XML'i alıyor, GİB
 * kapısında `cvc-complex-type` hatasıyla geri dönüyordu. Yani hata BİZDE
 * ölçülebilirken TELDE öğreniliyordu.
 *
 * Bu dosyadaki yüklemler tam o boşluğu kapatır: kaynakları GİB'in kendi
 * XSD'sidir (`schemas/ubl-tr/common/UBL-CommonAggregateComponents-2.1.xsd`,
 * repoda), şematron değil.
 *
 * 🔴 Bu dosya SERİLEŞTİRİCİYİ DEĞİŞTİRMEZ. Yalnız "üreteceğim XML geçersiz
 * olacak" durumunu ÖNCEDEN ve AÇIKÇA söyler.
 */

import type { ValidationError } from '../../errors/ubl-build-error';

/** XSD kardinalite ihlali — GİB kapısında `cvc-complex-type.*` olarak döner. */
function xsdCardinality(path: string, expected: string, actual: string, message: string): ValidationError {
  return { code: 'XSD_CARDINALITY', message, path, expected, actual };
}

/**
 * `RoadTransportType` → `cbc:LicensePlateID` **1..1**.
 *
 * XSD kanıtı (`UBL-CommonAggregateComponents-2.1.xsd:2576-2580`):
 * ```xml
 * <xsd:complexType name="RoadTransportType">
 *   <xsd:sequence>
 *     <xsd:element ref="cbc:LicensePlateID"/>   <!-- maxOccurs YOK → varsayılan 1 -->
 *   </xsd:sequence>
 * </xsd:complexType>
 * ```
 *
 * 🔴 ÖLÇÜLDÜ (canlı doğrulayıcı, paket 2026-08-05): iki plakalı irsaliye
 * «Satır 78: cvc-complex-type.2.4.d: Invalid content was found starting with
 * element 'cbc:LicensePlateID'. No child element is expected at this point.»
 * ile REDDEDİLİYOR. `delivery-serializer.serializeTransportMeans` N plakayı TEK
 * `cac:RoadTransport` içine basıyor ve UYARI VERMİYORDU.
 *
 * ── Neden "hata", neden "N düğüme böl" değil
 * İkinci plakayı `cac:ShipmentStage` çoğaltarak taşımak bir ÜRÜN kararıdır
 * (hangi aşama hangi sürücüyü taşır — GİB kılavuzu gerekir) ve girdide karşılığı
 * olmayan bir yapı uydurmak demektir. Bu yüzden kapı KAPATILIR, yol GÖSTERİLİR:
 * dorse/römork plakasının GİB'deki kanonik yeri `cac:TransportHandlingUnit` →
 * `cac:TransportEquipment` → `cbc:ID`'dir (B-49). Ham katmanda
 * `shipment.transportHandlingUnits`, Simple katmanında `shipment.trailerPlates`
 * bu yolu ZATEN açar — açık olmayan tek şey ham API'nin bu kapısıydı.
 */
export function licensePlateCardinalityRule(
  plates: ReadonlyArray<{ plateNumber?: string; schemeId?: string }> | undefined,
  path: string,
): ValidationError[] {
  const emitted = (plates ?? []).filter(p => (p.plateNumber ?? '').trim() !== '');
  if (emitted.length <= 1) return [];

  const extras = emitted.slice(1).map(p => `${p.plateNumber}${p.schemeId ? ` (${p.schemeId})` : ''}`);
  return [
    xsdCardinality(
      path,
      'tek plaka (cac:RoadTransport/cbc:LicensePlateID XSD\'de 1..1)',
      `${emitted.length} plaka`,
      'Bir `cac:RoadTransport` içine yalnız TEK plaka yazılabilir (UBL-TR XSD 1..1); '
        + `${emitted.length} plaka verildi. Fazlalık: ${extras.join(', ')}. `
        + 'Dorse/römork plakası `shipment.transportHandlingUnits` altına '
        + '(Simple katmanında `shipment.trailerPlates`) yazılmalıdır — GİB\'in kanonik '
        + 'yeri `cac:TransportHandlingUnit/cac:TransportEquipment/cbc:ID`\'dir (B-49).',
    ),
  ];
}
