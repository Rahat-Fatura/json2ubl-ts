import type { DespatchInput } from '../../types/despatch-input';
import { DESPATCH_NAMESPACES, UBL_CONSTANTS } from '../../ubl/namespaces';
import { cbcOptionalTag, cbcRequiredTag, joinLines, xmlDeclaration, rootOpenTag, ublExtensionsSkeleton } from '../../ubl/primitives/xml-helpers';
import {
  serializeParty,
  serializeCustomerPartyContainer,
  serializeSupplierPartyContainer,
} from '../../ubl/components/party';
import { serializeShipmentElement, buildVehicleStages } from '../../ubl/components/delivery';
import { serializeDespatchLine } from '../../ubl/components/line';
import { serializeAdditionalDocument, serializeOrderReference } from '../../ubl/components/document-reference';
import { DESPATCH_SEQ, emitInOrder } from '../../ubl/sequences/xsd-sequence';

/**
 * DespatchAdvice JSON → tam UBL-TR XML string (§5.7 sırasında)
 *
 * 🔑 Eleman SIRASI `DESPATCH_SEQ`ten gelir — elle `push` edilmez. Tablo, GİB'in
 * `maindoc/UBL-DespatchAdvice-2.1.xsd` `DespatchAdviceType` sequence'ıyla
 * örtüşür; fatura kökünde olduğu gibi sıra artık kod ile truth-source arasında
 * GERÇEK bir bağdır.
 *
 * @param includeUblExtensions 4.1.0 — boş `ext:UBLExtensions` iskeleti emit
 *   edilsin mi (varsayılan `false`). `UBL-DespatchAdvice-2.1.xsd` kök
 *   sequence'ı da `ext:UBLExtensions` ile başlar (DESPATCH_SEQ), yani Invoice
 *   ile aynı XSD kısıtı geçerlidir.
 */
export function serializeDespatch(
  input: DespatchInput,
  prettyPrint: boolean = true,
  includeUblExtensions: boolean = false,
): string {
  const ind = prettyPrint ? '  ' : '';

  /**
   * `CustomerPartyType` sarmalayıcısı — dört müşteri slotu için ortak.
   *
   * ⚠️ `party` ZORUNLU parametredir: opsiyonel tarafların «yoksa yazma» kararı
   * çağıran tarafta verilir. Böylece zorunlu tarafın eksik gelmesi eskisi gibi
   * çağrı anında patlar, sessizce atlanmaz.
   */
  const customerWrapper = (tagName: string, party: DespatchInput['supplier']): string =>
    serializeCustomerPartyContainer(tagName, serializeParty(party, ind + '  '), ind);

  const body = emitInOrder(DESPATCH_SEQ, {
    // UBLExtensions — DESPATCH_SEQ'in İLK slotu (4.1.0, opsiyonel bayrak)
    UBLExtensions: () => (includeUblExtensions ? ublExtensionsSkeleton(ind) : ''),

    UBLVersionID: () => `${ind}${cbcOptionalTag('UBLVersionID', UBL_CONSTANTS.ublVersionId)}`,
    CustomizationID: () => `${ind}${cbcOptionalTag('CustomizationID', UBL_CONSTANTS.customizationId)}`,
    ProfileID: () => `${ind}${cbcOptionalTag('ProfileID', input.profileId)}`,
    ID: () => `${ind}${cbcOptionalTag('ID', input.id)}`,
    CopyIndicator: () => `${ind}${cbcOptionalTag('CopyIndicator', UBL_CONSTANTS.copyIndicator)}`,
    UUID: () => `${ind}${cbcOptionalTag('UUID', input.uuid)}`,
    IssueDate: () => `${ind}${cbcRequiredTag('IssueDate', input.issueDate, 'DespatchAdvice')}`,
    // IssueTime — B-18: XSD zorunlu
    IssueTime: () => `${ind}${cbcRequiredTag('IssueTime', input.issueTime, 'DespatchAdvice')}`,

    DespatchAdviceTypeCode: () =>
      `${ind}${cbcOptionalTag('DespatchAdviceTypeCode', input.despatchTypeCode)}`,

    // Note (XSD:19)
    Note: () => joinLines((input.notes ?? []).map(note => `${ind}${cbcOptionalTag('Note', note)}`)),

    // LineCountNumeric — B-52 (XSD:20, otomatik input.lines.length)
    LineCountNumeric: () => `${ind}${cbcOptionalTag('LineCountNumeric', input.lines.length)}`,

    // OrderReference — B-53 (XSD:21, 0..n)
    OrderReference: () =>
      joinLines((input.orderReferences ?? []).map(ref => serializeOrderReference(ref, ind))),

    // AdditionalDocumentReference (MATBUDAN için zorunlu)
    // IssueDate XSD'de 1..1 — verilmediyse irsaliyenin kendi tarihine düşülür.
    AdditionalDocumentReference: () =>
      joinLines(
        (input.additionalDocuments ?? []).map(doc =>
          serializeAdditionalDocument(doc, ind, input.issueDate),
        ),
      ),

    // Signature — business logic tarafından eklenir, serializer üretmez

    // DespatchSupplierParty (+ B-19: DespatchContact/Name) — SUPPLIER_PARTY_SEQ
    DespatchSupplierParty: () =>
      serializeSupplierPartyContainer('DespatchSupplierParty', input.supplier, ind, input.despatchContactName),

    DeliveryCustomerParty: () => customerWrapper('DeliveryCustomerParty', input.customer),

    // B-48: Opsiyonel 3 party (XSD sırası: Buyer → Seller → Originator)
    BuyerCustomerParty: () =>
      input.buyerCustomer ? customerWrapper('BuyerCustomerParty', input.buyerCustomer) : '',
    SellerSupplierParty: () =>
      input.sellerSupplier
        ? serializeSupplierPartyContainer('SellerSupplierParty', input.sellerSupplier, ind)
        : '',
    OriginatorCustomerParty: () =>
      input.originator ? customerWrapper('OriginatorCustomerParty', input.originator) : '',

    Shipment: () => serializeShipmentBlock(input, ind),

    // DespatchLine (zorunlu, çoklu)
    DespatchLine: () => joinLines(input.lines.map(line => serializeDespatchLine(line, ind))),
  });

  return joinLines([
    xmlDeclaration(),
    rootOpenTag('DespatchAdvice', DESPATCH_NAMESPACES),
    ...body,
    '</DespatchAdvice>',
  ]);
}

/**
 * İrsaliye tarafı adaptörü: `DespatchShipmentInput` → `ShipmentModel`.
 *
 * 🔴 Burada eskiden ELLE `lines.push()` yazan 90 satırlık ikinci bir `Shipment`
 * üreticisi vardı. Hiçbir sekans tablosuna bağlı olmadığı için sıra bekçisinin
 * kapsamı DIŞINDAYDI: `GoodsItem` / `ShipmentStage` / `TransportMeans` /
 * `RoadTransport` / `Delivery` / `Despatch` / `TransportEquipment` düğümlerinin
 * hiçbirinin çocuk sırası denetlenmiyordu. Fatura tarafı aynı UBL tipini
 * (`ShipmentType`) baştan beri tablodan yazıyordu — sapma kaldırıldı.
 *
 * Bu fonksiyon artık XML ŞEKLİ ÜRETMEZ, yalnız modeli doldurur.
 *
 * ⚠️ Koşulsuz yazılan iki sarmalayıcı (`<cac:GoodsItem>` ve `<cac:ShipmentStage>`)
 * bilerek korundu: irsaliyenin bugünkü çıktısı bunları veri olmasa da basıyor,
 * kaldırmak bu adımın kapsamı dışında bir davranış değişikliği olurdu.
 */
function serializeShipmentBlock(input: DespatchInput, indent: string): string {
  const s = input.shipment;

  return serializeShipmentElement(
    {
      // B-72: shipmentId override (default '1')
      id: s.shipmentId ?? '1',

      // B-73: opsiyonel ValueAmount. Tek GoodsItem KOŞULSUZ yazılır (yerleşik davranış).
      goodsItems: [{ valueAmount: s.goodsItem?.valueAmount }],

      /* ÇOKLU ARAÇ: her plaka KENDİ `cac:ShipmentStage`ine gider — XSD bir
       * aşamaya tek plaka bırakır. Tek plakalı hâlde (senaryoların ezici
       * çoğunluğu) çıktı bire bir eskisi gibidir; plaka hiç yoksa yine tek
       * (içi sürücüyle dolan ya da boş kalan) aşama yazılır. Kural ve
       * sürücü-yerleşimi gerekçesi: `buildVehicleStages`. */
      stages: buildVehicleStages(s.licensePlates, s.driverPersons),

      // B-14: `cac:Delivery` artık DELIVERY_SEQ'ten geçer (DeliveryAddress → CarrierParty → Despatch).
      delivery: {
        deliveryAddress: s.deliveryAddress,
        carrierParty: s.carrierParty,
        despatch: { actualDespatchDate: s.actualDespatchDate, actualDespatchTime: s.actualDespatchTime },
      },

      // B-49: canonical DORSEPLAKA yolu
      transportHandlingUnits: (s.transportHandlingUnits ?? []).map(thu => ({
        transportEquipments: [{ id: thu.transportEquipmentId, schemeId: thu.schemeId }],
      })),
    },
    indent,
  );
}
