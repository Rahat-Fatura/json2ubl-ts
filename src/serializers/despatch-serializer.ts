import type { DespatchInput } from '../types/despatch-input';
import { DESPATCH_NAMESPACES, UBL_CONSTANTS } from '../config/namespaces';
import { cbcTag, joinLines, xmlDeclaration, despatchOpenTag, ublExtensionsPlaceholder } from '../utils/xml-helpers';
import { isNonEmpty } from '../utils/formatters';
import { serializeParty } from './party-serializer';
import { serializeAddress } from './delivery-serializer';
import { serializeDespatchLine } from './line-serializer';
import { serializeAdditionalDocument, serializeOrderReference } from './reference-serializer';

/**
 * DespatchAdvice JSON → tam UBL-TR XML string (§5.7 sırasında)
 */
export function serializeDespatch(input: DespatchInput, prettyPrint: boolean = true): string {
  const ind = prettyPrint ? '  ' : '';
  const parts: string[] = [];

  parts.push(xmlDeclaration());
  parts.push(despatchOpenTag(DESPATCH_NAMESPACES));

  // 1. UBLExtensions
  parts.push(indentBlock(ublExtensionsPlaceholder(), ind));

  // 2-3. UBLVersionID, CustomizationID
  parts.push(`${ind}${cbcTag('UBLVersionID', UBL_CONSTANTS.ublVersionId)}`);
  parts.push(`${ind}${cbcTag('CustomizationID', UBL_CONSTANTS.customizationId)}`);

  // 4. ProfileID
  parts.push(`${ind}${cbcTag('ProfileID', input.profileId)}`);

  // 5. ID
  parts.push(`${ind}${cbcTag('ID', input.id)}`);

  // 6. CopyIndicator
  parts.push(`${ind}${cbcTag('CopyIndicator', UBL_CONSTANTS.copyIndicator)}`);

  // 7. UUID
  parts.push(`${ind}${cbcTag('UUID', input.uuid)}`);

  // 8. IssueDate
  parts.push(`${ind}${cbcTag('IssueDate', input.issueDate)}`);

  // 9. IssueTime
  if (input.issueTime) {
    parts.push(`${ind}${cbcTag('IssueTime', input.issueTime)}`);
  }

  // 10. DespatchAdviceTypeCode
  parts.push(`${ind}${cbcTag('DespatchAdviceTypeCode', input.despatchTypeCode)}`);

  // 11. Note
  if (input.notes) {
    for (const note of input.notes) {
      parts.push(`${ind}${cbcTag('Note', note)}`);
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
  lines.push(`${i2}${cbcTag('ID', '1')}`);

  // GoodsItem (placeholder)
  lines.push(`${i2}<cac:GoodsItem>`);
  lines.push(`${i3}${cbcTag('RequiredCustomsID', '')}`);
  lines.push(`${i2}</cac:GoodsItem>`);

  // ShipmentStage
  lines.push(`${i2}<cac:ShipmentStage>`);

  // TransportMeans + LicensePlates
  if (s.licensePlates && s.licensePlates.length > 0) {
    lines.push(`${i3}<cac:TransportMeans>`);
    lines.push(`${i4}<cac:RoadTransport>`);
    for (const lp of s.licensePlates) {
      lines.push(`${i4}  ${cbcTag('LicensePlateID', lp.plateNumber, { schemeID: lp.schemeId })}`);
    }
    lines.push(`${i4}</cac:RoadTransport>`);
    lines.push(`${i3}</cac:TransportMeans>`);
  }

  // DriverPerson
  if (s.driverPerson) {
    const dp = s.driverPerson;
    lines.push(`${i3}<cac:DriverPerson>`);
    lines.push(`${i4}${cbcTag('FirstName', dp.firstName)}`);
    lines.push(`${i4}${cbcTag('FamilyName', dp.familyName)}`);
    lines.push(`${i4}${cbcTag('NationalityID', dp.nationalityId)}`);
    if (isNonEmpty(dp.title)) {
      lines.push(`${i4}${cbcTag('Title', dp.title)}`);
    }
    lines.push(`${i3}</cac:DriverPerson>`);
  }

  lines.push(`${i2}</cac:ShipmentStage>`);

  // Delivery
  lines.push(`${i2}<cac:Delivery>`);

  // Despatch (ActualDespatchDate/Time)
  lines.push(`${i3}<cac:Despatch>`);
  lines.push(`${i4}${cbcTag('ActualDespatchDate', s.actualDespatchDate)}`);
  lines.push(`${i4}${cbcTag('ActualDespatchTime', s.actualDespatchTime)}`);
  lines.push(`${i3}</cac:Despatch>`);

  // DeliveryAddress
  lines.push(serializeAddress(s.deliveryAddress, 'DeliveryAddress', i3));

  // CarrierParty
  if (s.carrierParty) {
    const cp = s.carrierParty;
    lines.push(`${i3}<cac:CarrierParty>`);
    lines.push(`${i4}<cac:PartyIdentification>`);
    lines.push(`${i4}  ${cbcTag('ID', cp.vknTckn, { schemeID: cp.taxIdType })}`);
    lines.push(`${i4}</cac:PartyIdentification>`);
    if (isNonEmpty(cp.name)) {
      lines.push(`${i4}<cac:PartyName>`);
      lines.push(`${i4}  ${cbcTag('Name', cp.name)}`);
      lines.push(`${i4}</cac:PartyName>`);
    }
    lines.push(`${i3}</cac:CarrierParty>`);
  }

  lines.push(`${i2}</cac:Delivery>`);
  lines.push(`${indent}</cac:Shipment>`);

  return joinLines(lines);
}

function indentBlock(xml: string, indentStr: string): string {
  return xml.split('\n').map(line => indentStr + line).join('\n');
}
