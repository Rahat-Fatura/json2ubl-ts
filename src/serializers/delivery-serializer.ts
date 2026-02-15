import type { DeliveryInput, LineDeliveryInput, AddressInput } from '../types/common';
import { cbcTag, joinLines } from '../utils/xml-helpers';
import { isNonEmpty } from '../utils/formatters';

/** Delivery → XML fragment (§3.3 IHRACAT) */
export function serializeDelivery(del: DeliveryInput, indent: string = ''): string {
  const i2 = indent + '  ';
  const lines: string[] = [];

  lines.push(`${indent}<cac:Delivery>`);

  if (del.deliveryAddress) {
    lines.push(serializeAddress(del.deliveryAddress, 'DeliveryAddress', i2));
  }

  if (del.deliveryTerms) {
    lines.push(`${i2}<cac:DeliveryTerms>`);
    lines.push(`${i2}  ${cbcTag('ID', del.deliveryTerms.id, { schemeID: 'INCOTERMS' })}`);
    lines.push(`${i2}</cac:DeliveryTerms>`);
  }

  if (del.shipment) {
    lines.push(serializeShipment(del.shipment, i2));
  }

  lines.push(`${indent}</cac:Delivery>`);
  return joinLines(lines);
}

/** LineDelivery → XML fragment (satır seviyesi IHRACAT) */
export function serializeLineDelivery(del: LineDeliveryInput, indent: string = ''): string {
  const i2 = indent + '  ';
  const lines: string[] = [];

  lines.push(`${indent}<cac:Delivery>`);

  if (del.deliveryAddress) {
    lines.push(serializeAddress(del.deliveryAddress, 'DeliveryAddress', i2));
  }

  if (del.deliveryTerms) {
    lines.push(`${i2}<cac:DeliveryTerms>`);
    lines.push(`${i2}  ${cbcTag('ID', del.deliveryTerms.id, { schemeID: 'INCOTERMS' })}`);
    lines.push(`${i2}</cac:DeliveryTerms>`);
  }

  if (del.shipment) {
    lines.push(serializeShipment(del.shipment, i2));
  }

  lines.push(`${indent}</cac:Delivery>`);
  return joinLines(lines);
}

/** Address → XML fragment */
export function serializeAddress(addr: AddressInput, tagName: string, indent: string = ''): string {
  const i2 = indent + '  ';
  const i3 = indent + '    ';
  const lines: string[] = [];

  lines.push(`${indent}<cac:${tagName}>`);
  if (isNonEmpty(addr.room)) lines.push(`${i2}${cbcTag('Room', addr.room)}`);
  if (isNonEmpty(addr.streetName)) lines.push(`${i2}${cbcTag('StreetName', addr.streetName)}`);
  if (isNonEmpty(addr.buildingName)) lines.push(`${i2}${cbcTag('BuildingName', addr.buildingName)}`);
  if (isNonEmpty(addr.buildingNumber)) lines.push(`${i2}${cbcTag('BuildingNumber', addr.buildingNumber)}`);
  if (isNonEmpty(addr.citySubdivisionName)) lines.push(`${i2}${cbcTag('CitySubdivisionName', addr.citySubdivisionName)}`);
  if (isNonEmpty(addr.cityName)) lines.push(`${i2}${cbcTag('CityName', addr.cityName)}`);
  if (isNonEmpty(addr.postalZone)) lines.push(`${i2}${cbcTag('PostalZone', addr.postalZone)}`);
  if (isNonEmpty(addr.region)) lines.push(`${i2}${cbcTag('Region', addr.region)}`);
  if (isNonEmpty(addr.country)) {
    lines.push(`${i2}<cac:Country>`);
    lines.push(`${i3}${cbcTag('Name', addr.country)}`);
    lines.push(`${i2}</cac:Country>`);
  }
  lines.push(`${indent}</cac:${tagName}>`);

  return joinLines(lines);
}

/** Shipment → XML fragment (IHRACAT sevkiyat) */
function serializeShipment(shipment: DeliveryInput['shipment'], indent: string): string {
  if (!shipment) return '';
  const i2 = indent + '  ';
  const i3 = indent + '    ';
  const lines: string[] = [];

  lines.push(`${indent}<cac:Shipment>`);
  lines.push(`${i2}${cbcTag('ID', '1')}`);

  if (shipment.goodsItems) {
    for (const gi of shipment.goodsItems) {
      lines.push(`${i2}<cac:GoodsItem>`);
      if (isNonEmpty(gi.requiredCustomsId)) {
        lines.push(`${i3}${cbcTag('RequiredCustomsID', gi.requiredCustomsId)}`);
      }
      lines.push(`${i2}</cac:GoodsItem>`);
    }
  }

  if (shipment.shipmentStages) {
    for (const stage of shipment.shipmentStages) {
      lines.push(`${i2}<cac:ShipmentStage>`);
      if (isNonEmpty(stage.transportModeCode)) {
        lines.push(`${i3}${cbcTag('TransportModeCode', stage.transportModeCode)}`);
      }
      lines.push(`${i2}</cac:ShipmentStage>`);
    }
  }

  if (isNonEmpty(shipment.transportModeCode)) {
    lines.push(`${i2}<cac:ShipmentStage>`);
    lines.push(`${i3}${cbcTag('TransportModeCode', shipment.transportModeCode)}`);
    lines.push(`${i2}</cac:ShipmentStage>`);
  }

  if (shipment.transportHandlingUnits) {
    for (const thu of shipment.transportHandlingUnits) {
      lines.push(`${i2}<cac:TransportHandlingUnit>`);
      if (thu.actualPackages) {
        for (const pkg of thu.actualPackages) {
          lines.push(`${i3}<cac:ActualPackage>`);
          if (isNonEmpty(pkg.packagingTypeCode)) {
            lines.push(`${i3}  ${cbcTag('PackagingTypeCode', pkg.packagingTypeCode)}`);
          }
          if (pkg.quantity !== undefined) {
            lines.push(`${i3}  ${cbcTag('Quantity', String(pkg.quantity))}`);
          }
          lines.push(`${i3}</cac:ActualPackage>`);
        }
      }
      lines.push(`${i2}</cac:TransportHandlingUnit>`);
    }
  }

  lines.push(`${indent}</cac:Shipment>`);
  return joinLines(lines);
}
