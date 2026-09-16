import type { DespatchInput } from '../types/despatch-input';
import { DESPATCH_NAMESPACES, UBL_CONSTANTS } from '../config/namespaces';
import { cbcOptionalTag, cbcRequiredTag, joinLines, xmlDeclaration, rootOpenTag, ublExtensionsSkeleton } from '../utils/xml-helpers';
import { isNonEmpty } from '../utils/formatters';
import { serializeParty, serializePartyAs } from './party-serializer';
import { serializeAddress } from './delivery-serializer';
import { serializeDespatchLine } from './line-serializer';
import { serializeAdditionalDocument, serializeOrderReference } from './reference-serializer';
import { DESPATCH_SEQ, PERSON_SEQ, emitInOrder } from './xsd-sequence';

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
   * `<cac:X><cac:Party>…</cac:Party></cac:X>` sarmalayıcısı — beş taraf slotu için ortak.
   *
   * ⚠️ `party` ZORUNLU parametredir: opsiyonel tarafların «yoksa yazma» kararı
   * çağıran tarafta verilir. Böylece zorunlu tarafın (supplier/customer) eksik
   * gelmesi eskisi gibi çağrı anında patlar, sessizce atlanmaz.
   */
  const partyWrapper = (tagName: string, party: DespatchInput['supplier'], extra: string[] = []): string =>
    joinLines([
      `${ind}<cac:${tagName}>`,
      serializeParty(party, ind + '  '),
      ...extra,
      `${ind}</cac:${tagName}>`,
    ]);

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

    // DespatchSupplierParty (+ B-19: DespatchContact/Name)
    DespatchSupplierParty: () =>
      partyWrapper(
        'DespatchSupplierParty',
        input.supplier,
        isNonEmpty(input.despatchContactName)
          ? [
              `${ind}  <cac:DespatchContact>`,
              `${ind}    ${cbcOptionalTag('Name', input.despatchContactName)}`,
              `${ind}  </cac:DespatchContact>`,
            ]
          : [],
      ),

    DeliveryCustomerParty: () => partyWrapper('DeliveryCustomerParty', input.customer),

    // B-48: Opsiyonel 3 party (XSD sırası: Buyer → Seller → Originator)
    BuyerCustomerParty: () =>
      input.buyerCustomer ? partyWrapper('BuyerCustomerParty', input.buyerCustomer) : '',
    SellerSupplierParty: () =>
      input.sellerSupplier ? partyWrapper('SellerSupplierParty', input.sellerSupplier) : '',
    OriginatorCustomerParty: () =>
      input.originator ? partyWrapper('OriginatorCustomerParty', input.originator) : '',

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

/** Shipment bloğu serialize */
function serializeShipmentBlock(input: DespatchInput, indent: string): string {
  const i2 = indent + '  ';
  const i3 = indent + '    ';
  const i4 = indent + '      ';
  const s = input.shipment;
  const lines: string[] = [];

  lines.push(`${indent}<cac:Shipment>`);
  // B-72: shipmentId override (default '1')
  lines.push(`${i2}${cbcOptionalTag('ID', s.shipmentId ?? '1')}`);

  // GoodsItem — B-73: opsiyonel ValueAmount (XSD sequence: ValueAmount(1689) → RequiredCustomsID(1696))
  lines.push(`${i2}<cac:GoodsItem>`);
  if (s.goodsItem?.valueAmount !== undefined) {
    const va = s.goodsItem.valueAmount;
    lines.push(`${i3}<cbc:ValueAmount currencyID="${va.currencyId ?? 'TRY'}">${va.value}</cbc:ValueAmount>`);
  }
  lines.push(`${i3}${cbcOptionalTag('RequiredCustomsID', '')}`);
  lines.push(`${i2}</cac:GoodsItem>`);

  // ShipmentStage
  lines.push(`${i2}<cac:ShipmentStage>`);

  // TransportMeans + LicensePlates
  if (s.licensePlates && s.licensePlates.length > 0) {
    lines.push(`${i3}<cac:TransportMeans>`);
    lines.push(`${i4}<cac:RoadTransport>`);
    for (const lp of s.licensePlates) {
      lines.push(`${i4}  ${cbcOptionalTag('LicensePlateID', lp.plateNumber, { schemeID: lp.schemeId })}`);
    }
    lines.push(`${i4}</cac:RoadTransport>`);
    lines.push(`${i3}</cac:TransportMeans>`);
  }

  // DriverPerson — B-20 + AR-2: PERSON_SEQ her sürücü için (XSD maxOccurs=unbounded)
  for (const dp of s.driverPersons ?? []) {
    const personInner = emitInOrder(PERSON_SEQ, {
      FirstName: () => cbcRequiredTag('FirstName', dp.firstName, 'DriverPerson'),
      FamilyName: () => cbcRequiredTag('FamilyName', dp.familyName, 'DriverPerson'),
      Title: () => cbcOptionalTag('Title', dp.title),
      NationalityID: () => cbcRequiredTag('NationalityID', dp.nationalityId, 'DriverPerson'),
    });
    const personBody = joinLines(personInner.map(s2 => i4 + s2));
    lines.push([`${i3}<cac:DriverPerson>`, personBody, `${i3}</cac:DriverPerson>`].join('\n'));
  }

  lines.push(`${i2}</cac:ShipmentStage>`);

  // Delivery — B-14 fix: XSD sequence DeliveryAddress → CarrierParty → Despatch
  lines.push(`${i2}<cac:Delivery>`);

  // DeliveryAddress (1)
  lines.push(serializeAddress(s.deliveryAddress, 'DeliveryAddress', i3));

  /* CarrierParty (2) — ORTAK taraf serileştiricisi.
   *
   * 🔴 Burada eskiden elle yazılmış bir blok vardı ve yalnız `PartyIdentification`
   * + `PartyName` basıyordu. `cac:PostalAddress` UBL-TR `PartyType`'ta ZORUNLU
   * olduğu için (minOccurs=1) o blok şoförsüz irsaliyeyi GİB kapısında her zaman
   * reddettiriyordu; TCKN dalındaki `firstName`/`familyName` de hiçbir yere
   * yazılmıyordu. Fatura tarafı aynı düğümü baştan beri `serializePartyAs` ile
   * basıyor (`delivery-serializer.ts:23`) — sapma kaldırıldı, iki belge tipi
   * artık AYNI satırdan geçiyor. */
  if (s.carrierParty) {
    lines.push(serializePartyAs(s.carrierParty, 'CarrierParty', i3));
  }

  // Despatch (3) — ActualDespatchDate/Time
  lines.push(`${i3}<cac:Despatch>`);
  lines.push(`${i4}${cbcRequiredTag('ActualDespatchDate', s.actualDespatchDate, 'Despatch')}`);
  lines.push(`${i4}${cbcRequiredTag('ActualDespatchTime', s.actualDespatchTime, 'Despatch')}`);
  lines.push(`${i3}</cac:Despatch>`);

  lines.push(`${i2}</cac:Delivery>`);

  // B-49: TransportHandlingUnit canonical DORSEPLAKA path (XSD sequence: Delivery < THU)
  for (const thu of s.transportHandlingUnits ?? []) {
    lines.push(`${i2}<cac:TransportHandlingUnit>`);
    lines.push(`${i3}<cac:TransportEquipment>`);
    lines.push(`${i3}  ${cbcOptionalTag('ID', thu.transportEquipmentId, { schemeID: thu.schemeId ?? 'DORSEPLAKA' })}`);
    lines.push(`${i3}</cac:TransportEquipment>`);
    lines.push(`${i2}</cac:TransportHandlingUnit>`);
  }

  lines.push(`${indent}</cac:Shipment>`);

  return joinLines(lines);
}

// function indentBlock(xml: string, indentStr: string): string {
//   return xml.split('\n').map(line => indentStr + line).join('\n');
// }
