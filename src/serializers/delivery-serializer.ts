import type { DeliveryInput, LineDeliveryInput, AddressInput } from '../types/common';
import { cbcOptionalTag, cbcRequiredTag, joinLines } from '../utils/xml-helpers';
import { isNonEmpty } from '../utils/formatters';
import { serializePartyAs } from './party-serializer';
import { DELIVERY_SEQ, ADDRESS_SEQ, SHIPMENT_SEQ, PACKAGE_SEQ, emitInOrder } from './xsd-sequence';

/**
 * Delivery → XML fragment (§3.3 IHRACAT + B-101 e-Arşiv internet satışı).
 * Sequence: DELIVERY_SEQ. B-14 paraleli: DeliveryAddress → Shipment (bu kapsamda DespatchAdvice Delivery farklı, bkz. despatch-serializer).
 *
 * B-101: `ActualDeliveryDate` + `CarrierParty` emit edilir. e-Arşiv raporundaki
 * `internetSatisBilgi/gonderiBilgileri/gonderimTarihi` ve `.../gonderiTasiyan`
 * (ikisi de kardinalite 1) bu iki alandan beslenir — daha önce mapper'a verilen
 * kargo bilgisi XML'e hiç düşmüyordu.
 */
export function serializeDelivery(del: DeliveryInput, indent: string = ''): string {
  const i2 = indent + '  ';

  const inner = emitInOrder(DELIVERY_SEQ, {
    ActualDeliveryDate: () => cbcOptionalTag('ActualDeliveryDate', del.actualDeliveryDate),
    DeliveryAddress: () => (del.deliveryAddress ? serializeAddress(del.deliveryAddress, 'DeliveryAddress', i2) : ''),
    CarrierParty: () => (del.carrierParty ? serializePartyAs(del.carrierParty, 'CarrierParty', i2) : ''),
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
    Postbox: () => cbcOptionalTag('Postbox', addr.postbox),
    Room: () => cbcOptionalTag('Room', addr.room),
    StreetName: () => cbcOptionalTag('StreetName', addr.streetName),
    BlockName: () => cbcOptionalTag('BlockName', addr.blockName),
    BuildingName: () => cbcOptionalTag('BuildingName', addr.buildingName),
    BuildingNumber: () => cbcOptionalTag('BuildingNumber', addr.buildingNumber),
    CitySubdivisionName: () => cbcRequiredTag('CitySubdivisionName', addr.citySubdivisionName, tagName),
    CityName: () => cbcRequiredTag('CityName', addr.cityName, tagName),
    PostalZone: () => cbcOptionalTag('PostalZone', addr.postalZone),
    Region: () => cbcOptionalTag('Region', addr.region),
    District: () => cbcOptionalTag('District', addr.district),
    Country: () => serializeCountry(addr.countryCode, addr.country, indent + '  '),
  });
  const body = joinLines(inner.map(s => (s.startsWith(indent + '  ') ? s : indent + '  ' + s)));
  return [`${indent}<cac:${tagName}>`, body, `${indent}</cac:${tagName}>`].join('\n');
}

/** cac:Country bloğu — B-100 IdentificationCode + Name (XSD sırası) */
function serializeCountry(
  countryCode: string | undefined,
  countryName: string | undefined,
  indent: string,
): string {
  if (!isNonEmpty(countryCode) && !isNonEmpty(countryName)) return '';
  const inner: string[] = [];
  if (isNonEmpty(countryCode)) {
    inner.push(`${indent}  ${cbcOptionalTag('IdentificationCode', countryCode)}`);
  }
  if (isNonEmpty(countryName)) {
    inner.push(`${indent}  ${cbcOptionalTag('Name', countryName)}`);
  }
  return [`${indent}<cac:Country>`, ...inner, `${indent}</cac:Country>`].join('\n');
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
          //
          // B-102: ActualPackage içi sıra artık PACKAGE_SEQ'ten gelir
          // (ID → Quantity → PackagingTypeCode). Önceki kod PackagingTypeCode'u
          // Quantity'den ÖNCE yazıyordu; ikisi birlikte verildiğinde şema-geçersizdi.
          if (thu.actualPackages) {
            for (const pkg of thu.actualPackages) {
              const pkgInner = emitInOrder(PACKAGE_SEQ, {
                ID: () => cbcOptionalTag('ID', pkg.id),
                Quantity: () => (pkg.quantity !== undefined ? cbcOptionalTag('Quantity', String(pkg.quantity)) : ''),
                PackagingTypeCode: () => cbcOptionalTag('PackagingTypeCode', pkg.packagingTypeCode),
              });
              thuLines.push(`${i3}<cac:ActualPackage>`);
              for (const p of pkgInner) thuLines.push(`${i3}  ${p}`);
              thuLines.push(`${i3}</cac:ActualPackage>`);
            }
          }
          // CustomsDeclaration — IHRACKAYITLI + 702 için (B-14, Schematron satır 322/451)
          // Sequence: ID → ValidityPeriod → ApplicableTransportMeans → IssuerParty
          if (thu.customsDeclarations) {
            for (const [cdIndex, cd] of thu.customsDeclarations.entries()) {
              thuLines.push(`${i3}<cac:CustomsDeclaration>`);
              /* 🔴 `cbc:ID` KOŞULSUZ yazılır — UBL `CustomsDeclarationType` onu ZORUNLU
               * kılar (minOccurs=1). Eskiden yalnız `cd.id` doluysa yazılıyordu; İHRAÇ
               * KAYITLI akışında mapper `alicidibsatirkod`tan yalnız `issuerParty`
               * ürettiği için ID hiç gelmiyor ve belge XSD'den düşüyordu:
               *   «"IssuerParty" elementi bu konumda geçersiz. Beklenen: ID.»
               * Bu, ihraç kayıtlı satışın TAMAMINI kesilemez yapıyordu (kaplama seferi,
               * 6 profil × IHRACKAYITLI).
               *
               * Şematron bu alanın DEĞERİNİ denetlemez (yalnız IssuerParty altındaki
               * ALICIDIBSATIRKOD'a bakar), dolayısıyla iş verisi uydurmak gerekmez.
               * Konum sırası yazılır — `Shipment/ID`'de zaten uygulanan emsalin aynısı. */
              thuLines.push(
                `${i3}  ${cbcRequiredTag('ID', isNonEmpty(cd.id) ? cd.id : String(cdIndex + 1), 'CustomsDeclaration')}`,
              );
              if (cd.issuerParty?.partyIdentifications?.length) {
                thuLines.push(`${i3}  <cac:IssuerParty>`);
                for (const pi of cd.issuerParty.partyIdentifications) {
                  thuLines.push(`${i3}    <cac:PartyIdentification>`);
                  thuLines.push(
                    `${i3}      ${cbcRequiredTag('ID', pi.id, 'CustomsDeclaration/IssuerParty/PartyIdentification', { schemeID: pi.schemeID })}`,
                  );
                  thuLines.push(`${i3}    </cac:PartyIdentification>`);
                }
                /* 🔴 UBL-TR `PartyType` bu bağlamda ÜÇÜNÜ birden ister:
                 * PartyIdentification + PartyName + PostalAddress. Yalnız kimlik
                 * yazılan belge «"IssuerParty" elementinin içeriği eksik» ile
                 * XSD'den düşer (canlı ölçüm). Ad ve adres alıcıdan gelir —
                 * ALICIDIBSATIRKOD zaten alıcının kodudur. */
                if (isNonEmpty(cd.issuerParty.name)) {
                  thuLines.push(`${i3}    <cac:PartyName>`);
                  thuLines.push(`${i3}      ${cbcRequiredTag('Name', cd.issuerParty.name, 'CustomsDeclaration/IssuerParty/PartyName')}`);
                  thuLines.push(`${i3}    </cac:PartyName>`);
                }
                if (cd.issuerParty.postalAddress) {
                  const adres = serializeAddress(cd.issuerParty.postalAddress, 'PostalAddress', `${i3}    `);
                  if (adres) thuLines.push(adres);
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
