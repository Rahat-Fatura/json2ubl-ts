import type { DeliveryInput, LineDeliveryInput, AddressInput } from '../types/common';
import { cbcOptionalTag, cbcRequiredTag, joinLines } from '../utils/xml-helpers';
import { isNonEmpty } from '../utils/formatters';
import { DELIVERY_SEQ, ADDRESS_SEQ, SHIPMENT_SEQ, emitInOrder } from './xsd-sequence';

/**
 * Delivery → XML fragment (§3.3 IHRACAT).
 * Sequence: DELIVERY_SEQ. B-14 paraleli: DeliveryAddress → Shipment (bu kapsamda DespatchAdvice Delivery farklı, bkz. despatch-serializer).
 */
export function serializeDelivery(del: DeliveryInput, indent: string = ''): string {
  const i2 = indent + '  ';

  const inner = emitInOrder(DELIVERY_SEQ, {
    DeliveryAddress: () => (del.deliveryAddress ? serializeAddress(del.deliveryAddress, 'DeliveryAddress', i2) : ''),
    DeliveryTerms: () =>
      del.deliveryTerms
        ? [
            `${i2}<cac:DeliveryTerms>`,
            `${i2}  ${cbcRequiredTag('ID', del.deliveryTerms.id, 'DeliveryTerms', { schemeID: 'INCOTERMS' })}`,
            `${i2}</cac:DeliveryTerms>`,
          ].join('\n')
        : '',
    Shipment: () => (del.shipment ? serializeShipment(del.shipment, i2) : ''),
  });
  const body = joinLines(inner.map(s => (s.startsWith(i2) ? s : i2 + s)));
  return [`${indent}<cac:Delivery>`, body, `${indent}</cac:Delivery>`].join('\n');
}

/** LineDelivery → XML fragment (satır seviyesi IHRACAT). DELIVERY_SEQ. */
export function serializeLineDelivery(del: LineDeliveryInput, indent: string = ''): string {
  const i2 = indent + '  ';

  const inner = emitInOrder(DELIVERY_SEQ, {
    DeliveryAddress: () => (del.deliveryAddress ? serializeAddress(del.deliveryAddress, 'DeliveryAddress', i2) : ''),
    DeliveryTerms: () =>
      del.deliveryTerms
        ? [
            `${i2}<cac:DeliveryTerms>`,
            `${i2}  ${cbcRequiredTag('ID', del.deliveryTerms.id, 'DeliveryTerms', { schemeID: 'INCOTERMS' })}`,
            `${i2}</cac:DeliveryTerms>`,
          ].join('\n')
        : '',
    Shipment: () => (del.shipment ? serializeShipment(del.shipment, i2) : ''),
  });
  const body = joinLines(inner.map(s => (s.startsWith(i2) ? s : i2 + s)));
  return [`${indent}<cac:Delivery>`, body, `${indent}</cac:Delivery>`].join('\n');
}

/**
 * Address → XML fragment. Sequence: ADDRESS_SEQ.
 * B-35 fix: CityName + CitySubdivisionName required (AddressInput tipinde required).
 */
export function serializeAddress(addr: AddressInput, tagName: string, indent: string = ''): string {
  const inner = emitInOrder(ADDRESS_SEQ, {
    Room: () => cbcOptionalTag('Room', addr.room),
    StreetName: () => cbcOptionalTag('StreetName', addr.streetName),
    BuildingName: () => cbcOptionalTag('BuildingName', addr.buildingName),
    BuildingNumber: () => cbcOptionalTag('BuildingNumber', addr.buildingNumber),
    CitySubdivisionName: () => cbcRequiredTag('CitySubdivisionName', addr.citySubdivisionName, tagName),
    CityName: () => cbcRequiredTag('CityName', addr.cityName, tagName),
    PostalZone: () => cbcOptionalTag('PostalZone', addr.postalZone),
    Region: () => cbcOptionalTag('Region', addr.region),
    Country: () =>
      isNonEmpty(addr.country)
        ? [
            `${indent}  <cac:Country>`,
            `${indent}    ${cbcOptionalTag('Name', addr.country)}`,
            `${indent}  </cac:Country>`,
          ].join('\n')
        : '',
  });
  const body = joinLines(inner.map(s => (s.startsWith(indent + '  ') ? s : indent + '  ' + s)));
  return [`${indent}<cac:${tagName}>`, body, `${indent}</cac:${tagName}>`].join('\n');
}

/**
 * Shipment → XML fragment (IHRACAT sevkiyat).
 * Sequence: SHIPMENT_SEQ. B-99 fix: ShipmentStage tek yerden emit — shipmentStages verilmişse
 * onlar kullanılır, yoksa shipment.transportModeCode fallback olarak tek ShipmentStage üretir.
 */
function serializeShipment(shipment: DeliveryInput['shipment'], indent: string): string {
  if (!shipment) return '';
  const i2 = indent + '  ';
  const i3 = indent + '    ';

  // B-99: shipmentStages var ise onları kullan; yoksa transportModeCode fallback tek stage.
  const stagesSource: Array<{ transportModeCode?: string }> =
    shipment.shipmentStages && shipment.shipmentStages.length > 0
      ? shipment.shipmentStages
      : isNonEmpty(shipment.transportModeCode)
        ? [{ transportModeCode: shipment.transportModeCode }]
        : [];

  const goodsItemsXml = shipment.goodsItems
    ? joinLines(
        shipment.goodsItems.map(gi => {
          const giLines: string[] = [`${i2}<cac:GoodsItem>`];
          if (isNonEmpty(gi.requiredCustomsId)) {
            giLines.push(`${i3}${cbcOptionalTag('RequiredCustomsID', gi.requiredCustomsId)}`);
          }
          giLines.push(`${i2}</cac:GoodsItem>`);
          return giLines.join('\n');
        }),
      )
    : '';

  const stagesXml = stagesSource.length
    ? joinLines(
        stagesSource.map(st => {
          const stLines: string[] = [`${i2}<cac:ShipmentStage>`];
          if (isNonEmpty(st.transportModeCode)) {
            stLines.push(`${i3}${cbcOptionalTag('TransportModeCode', st.transportModeCode)}`);
          }
          stLines.push(`${i2}</cac:ShipmentStage>`);
          return stLines.join('\n');
        }),
      )
    : '';

  const thuXml = shipment.transportHandlingUnits
    ? joinLines(
        shipment.transportHandlingUnits.map(thu => {
          const thuLines: string[] = [`${i2}<cac:TransportHandlingUnit>`];
          // XSD sequence: ActualPackage (12) → ... → CustomsDeclaration (21)
          if (thu.actualPackages) {
            for (const pkg of thu.actualPackages) {
              thuLines.push(`${i3}<cac:ActualPackage>`);
              if (isNonEmpty(pkg.packagingTypeCode)) {
                thuLines.push(`${i3}  ${cbcOptionalTag('PackagingTypeCode', pkg.packagingTypeCode)}`);
              }
              if (pkg.quantity !== undefined) {
                thuLines.push(`${i3}  ${cbcOptionalTag('Quantity', String(pkg.quantity))}`);
              }
              thuLines.push(`${i3}</cac:ActualPackage>`);
            }
          }
          // CustomsDeclaration — IHRACKAYITLI + 702 için (B-14, Schematron satır 322/451)
          // Sequence: ID → ValidityPeriod → ApplicableTransportMeans → IssuerParty
          if (thu.customsDeclarations) {
            for (const cd of thu.customsDeclarations) {
              thuLines.push(`${i3}<cac:CustomsDeclaration>`);
              if (isNonEmpty(cd.id)) {
                thuLines.push(`${i3}  ${cbcOptionalTag('ID', cd.id)}`);
              }
              if (cd.issuerParty?.partyIdentifications?.length) {
                thuLines.push(`${i3}  <cac:IssuerParty>`);
                for (const pi of cd.issuerParty.partyIdentifications) {
                  thuLines.push(`${i3}    <cac:PartyIdentification>`);
                  thuLines.push(
                    `${i3}      ${cbcRequiredTag('ID', pi.id, 'CustomsDeclaration/IssuerParty/PartyIdentification', { schemeID: pi.schemeID })}`,
                  );
                  thuLines.push(`${i3}    </cac:PartyIdentification>`);
                }
                thuLines.push(`${i3}  </cac:IssuerParty>`);
              }
              thuLines.push(`${i3}</cac:CustomsDeclaration>`);
            }
          }
          thuLines.push(`${i2}</cac:TransportHandlingUnit>`);
          return thuLines.join('\n');
        }),
      )
    : '';

  const inner = emitInOrder(SHIPMENT_SEQ, {
    ID: () => cbcRequiredTag('ID', '1', 'Shipment'),
    GoodsItem: () => goodsItemsXml,
    ShipmentStage: () => stagesXml,
    TransportHandlingUnit: () => thuXml,
  });
  const body = joinLines(inner.map(s => (s.startsWith(i2) ? s : i2 + s)));
  return [`${indent}<cac:Shipment>`, body, `${indent}</cac:Shipment>`].join('\n');
}
