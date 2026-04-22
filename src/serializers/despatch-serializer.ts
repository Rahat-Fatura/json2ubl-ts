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

  // 11. Note
  if (input.notes) {
    for (const note of input.notes) {
      parts.push(`${ind}${cbcOptionalTag('Note', note)}`);
    }
  }

  // 12. OrderReference
  if (input.orderReference) {
    parts.push(serializeOrderReference(input.orderReference, ind));
  }

  // 13. AdditionalDocumentReference (MATBUDAN için zorunlu)
  if (input.additionalDocuments) {
    for (const doc of input.additionalDocuments) {
      parts.push(serializeAdditionalDocument(doc, ind));
    }
  }

  // 14. Signature — business logic tarafından eklenir, serializer üretmez

  // 15. DespatchSupplierParty
  parts.push(`${ind}<cac:DespatchSupplierParty>`);
  parts.push(serializeParty(input.supplier, ind + '  '));
  parts.push(`${ind}</cac:DespatchSupplierParty>`);

  // 16. DeliveryCustomerParty
  parts.push(`${ind}<cac:DeliveryCustomerParty>`);
  parts.push(serializeParty(input.customer, ind + '  '));
  parts.push(`${ind}</cac:DeliveryCustomerParty>`);

  // 19. Shipment
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
  lines.push(`${i2}${cbcOptionalTag('ID', '1')}`);

  // GoodsItem (placeholder)
  lines.push(`${i2}<cac:GoodsItem>`);
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

  // DriverPerson — B-20 fix: PERSON_SEQ (FirstName → FamilyName → Title → MiddleName → NationalityID)
  if (s.driverPerson) {
    const dp = s.driverPerson;
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
  lines.push(`${indent}</cac:Shipment>`);

  return joinLines(lines);
}

// function indentBlock(xml: string, indentStr: string): string {
//   return xml.split('\n').map(line => indentStr + line).join('\n');
// }
