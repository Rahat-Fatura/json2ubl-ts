import type { DespatchInput } from '../types/despatch-input';
import { DESPATCH_NAMESPACES, UBL_CONSTANTS } from '../config/namespaces';
import { cbcOptionalTag, cbcRequiredTag, joinLines, xmlDeclaration, despatchOpenTag } from '../utils/xml-helpers';
import { isNonEmpty } from '../utils/formatters';
import { serializeParty } from './party-serializer';
import { serializeAddress } from './delivery-serializer';
import { serializeDespatchLine } from './line-serializer';
import { serializeAdditionalDocument, serializeOrderReference } from './reference-serializer';
import { PERSON_SEQ, emitInOrder } from './xsd-sequence';

/**
 * DespatchAdvice JSON → tam UBL-TR XML string (§5.7 sırasında)
 */
export function serializeDespatch(input: DespatchInput, prettyPrint: boolean = true): string {
  const ind = prettyPrint ? '  ' : '';
  const parts: string[] = [];

  parts.push(xmlDeclaration());
  parts.push(despatchOpenTag(DESPATCH_NAMESPACES));

  // 1. UBLExtensions
  // parts.push(indentBlock(ublExtensionsPlaceholder(), ind));

  // 2-3. UBLVersionID, CustomizationID
  parts.push(`${ind}${cbcOptionalTag('UBLVersionID', UBL_CONSTANTS.ublVersionId)}`);
  parts.push(`${ind}${cbcOptionalTag('CustomizationID', UBL_CONSTANTS.customizationId)}`);

  // 4. ProfileID
  parts.push(`${ind}${cbcOptionalTag('ProfileID', input.profileId)}`);

  // 5. ID
  parts.push(`${ind}${cbcOptionalTag('ID', input.id)}`);

  // 6. CopyIndicator
  parts.push(`${ind}${cbcOptionalTag('CopyIndicator', UBL_CONSTANTS.copyIndicator)}`);

  // 7. UUID
  parts.push(`${ind}${cbcOptionalTag('UUID', input.uuid)}`);

  // 8. IssueDate
  parts.push(`${ind}${cbcRequiredTag('IssueDate', input.issueDate, 'DespatchAdvice')}`);

  // 9. IssueTime — B-18: XSD zorunlu
  parts.push(`${ind}${cbcRequiredTag('IssueTime', input.issueTime, 'DespatchAdvice')}`);

  // 10. DespatchAdviceTypeCode
  parts.push(`${ind}${cbcOptionalTag('DespatchAdviceTypeCode', input.despatchTypeCode)}`);

  // 11. Note (XSD:19)
  if (input.notes) {
    for (const note of input.notes) {
      parts.push(`${ind}${cbcOptionalTag('Note', note)}`);
    }
  }

  // 12. LineCountNumeric — B-52 (XSD:20, otomatik input.lines.length)
  parts.push(`${ind}${cbcOptionalTag('LineCountNumeric', input.lines.length)}`);

  // 13. OrderReference — B-53 (XSD:21, 0..n)
  for (const ref of input.orderReferences ?? []) {
    parts.push(serializeOrderReference(ref, ind));
  }

  // 13. AdditionalDocumentReference (MATBUDAN için zorunlu)
  if (input.additionalDocuments) {
    for (const doc of input.additionalDocuments) {
      parts.push(serializeAdditionalDocument(doc, ind));
    }
  }

  // 14. Signature — business logic tarafından eklenir, serializer üretmez

  // 15. DespatchSupplierParty (+ B-19: DespatchContact/Name)
  parts.push(`${ind}<cac:DespatchSupplierParty>`);
  parts.push(serializeParty(input.supplier, ind + '  '));
  if (isNonEmpty(input.despatchContactName)) {
    parts.push(`${ind}  <cac:DespatchContact>`);
    parts.push(`${ind}    ${cbcOptionalTag('Name', input.despatchContactName)}`);
    parts.push(`${ind}  </cac:DespatchContact>`);
  }
  parts.push(`${ind}</cac:DespatchSupplierParty>`);

  // 16. DeliveryCustomerParty
  parts.push(`${ind}<cac:DeliveryCustomerParty>`);
  parts.push(serializeParty(input.customer, ind + '  '));
  parts.push(`${ind}</cac:DeliveryCustomerParty>`);

  // 17-19. B-48: Opsiyonel 3 party (XSD sırası: Buyer → Seller → Originator)
  if (input.buyerCustomer) {
    parts.push(`${ind}<cac:BuyerCustomerParty>`);
    parts.push(serializeParty(input.buyerCustomer, ind + '  '));
    parts.push(`${ind}</cac:BuyerCustomerParty>`);
  }
  if (input.sellerSupplier) {
    parts.push(`${ind}<cac:SellerSupplierParty>`);
    parts.push(serializeParty(input.sellerSupplier, ind + '  '));
    parts.push(`${ind}</cac:SellerSupplierParty>`);
  }
  if (input.originator) {
    parts.push(`${ind}<cac:OriginatorCustomerParty>`);
    parts.push(serializeParty(input.originator, ind + '  '));
    parts.push(`${ind}</cac:OriginatorCustomerParty>`);
  }

  // 20. Shipment
  parts.push(serializeShipmentBlock(input, ind));

  // 20. DespatchLine (zorunlu, çoklu)
  for (const line of input.lines) {
    parts.push(serializeDespatchLine(line, ind));
  }

  parts.push('</DespatchAdvice>');
  return joinLines(parts);
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

  // CarrierParty (2)
  if (s.carrierParty) {
    const cp = s.carrierParty;
    lines.push(`${i3}<cac:CarrierParty>`);
    lines.push(`${i4}<cac:PartyIdentification>`);
    lines.push(`${i4}  ${cbcRequiredTag('ID', cp.vknTckn, 'CarrierParty.PartyIdentification', { schemeID: cp.taxIdType })}`);
    lines.push(`${i4}</cac:PartyIdentification>`);
    if (isNonEmpty(cp.name)) {
      lines.push(`${i4}<cac:PartyName>`);
      lines.push(`${i4}  ${cbcOptionalTag('Name', cp.name)}`);
      lines.push(`${i4}</cac:PartyName>`);
    }
    lines.push(`${i3}</cac:CarrierParty>`);
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
