import type {
  DeliveryInput,
  LineDeliveryInput,
  AddressInput,
  CustomsDeclarationInput,
  ActualPackageInput,
  DespatchEventInput,
} from '../types/common';
import { cbcOptionalTag, cbcRequiredTag, joinLines, tag } from '../utils/xml-helpers';
import { escapeXml, isNonEmpty } from '../utils/formatters';
import { normalizeGtip } from '../utils/gtip';
import { serializePartyAs } from './party-serializer';
import {
  DELIVERY_SEQ,
  DELIVERY_DESPATCH_SEQ,
  DELIVERY_TERMS_SEQ,
  ADDRESS_SEQ,
  COUNTRY_SEQ,
  SHIPMENT_SEQ,
  GOODS_ITEM_SEQ,
  SHIPMENT_STAGE_SEQ,
  TRANSPORT_MEANS_SEQ,
  ROAD_TRANSPORT_SEQ,
  TRANSPORT_EQUIPMENT_SEQ,
  PERSON_SEQ,
  PACKAGE_SEQ,
  TRANSPORT_HANDLING_UNIT_SEQ,
  CUSTOMS_DECLARATION_SEQ,
  emitInOrder,
} from './xsd-sequence';

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
    Despatch: () => serializeDespatchEvent(del.despatch, i2),
    DeliveryTerms: () => serializeDeliveryTerms(del.deliveryTerms, i2),
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
    DeliveryTerms: () => serializeDeliveryTerms(del.deliveryTerms, i2),
    Shipment: () => (del.shipment ? serializeShipment(del.shipment, i2) : ''),
  });
  const body = joinLines(inner.map(s => (s.startsWith(i2) ? s : i2 + s)));
  return [`${indent}<cac:Delivery>`, body, `${indent}</cac:Delivery>`].join('\n');
}

/**
 * `cac:DeliveryTerms` — INCOTERMS kodu. Sıra: `DELIVERY_TERMS_SEQ`.
 * Belge ve satır seviyesindeki iki kopya tekleşti (ikisi de birebir aynıydı).
 */
function serializeDeliveryTerms(terms: DeliveryInput['deliveryTerms'], indent: string): string {
  if (!terms) return '';
  const inner = emitInOrder(DELIVERY_TERMS_SEQ, {
    ID: () => cbcRequiredTag('ID', terms.id, 'DeliveryTerms', { schemeID: 'INCOTERMS' }),
  });
  return joinLines([
    `${indent}<cac:DeliveryTerms>`,
    ...inner.map(s => `${indent}  ${s}`),
    `${indent}</cac:DeliveryTerms>`,
  ]);
}

/**
 * `cac:Despatch` — sevk olayı. Sıra: `DELIVERY_DESPATCH_SEQ`.
 *
 * Blok verildiyse tarih VE saat ZORUNLUDUR (`cbcRequiredTag`): irsaliyenin
 * sevk beyanı bunlarsız anlamsızdır. Blok verilmediyse hiç yazılmaz — fatura
 * tarafının bugünkü davranışı budur.
 */
function serializeDespatchEvent(despatch: DespatchEventInput | undefined, indent: string): string {
  if (!despatch) return '';
  const inner = emitInOrder(DELIVERY_DESPATCH_SEQ, {
    ActualDespatchDate: () => cbcRequiredTag('ActualDespatchDate', despatch.actualDespatchDate, 'Despatch'),
    ActualDespatchTime: () => cbcRequiredTag('ActualDespatchTime', despatch.actualDespatchTime, 'Despatch'),
  });
  return joinLines([
    `${indent}<cac:Despatch>`,
    ...inner.map(s => `${indent}  ${s}`),
    `${indent}</cac:Despatch>`,
  ]);
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

/**
 * `CountryType` → XML. TEK üretici; sıra `COUNTRY_SEQ`
 * (B-100: `IdentificationCode` 0..1 → `Name` **1..1**).
 *
 * İki eleman adıyla çıkar: adres altında `cac:Country`, kalem altında
 * `cac:OriginCountry`. S2b öncesinde ÜÇ kopyası vardı (`delivery-serializer`,
 * `party-serializer`, `line-serializer.originCountryBlock`) ve üçü aynı
 * davranmıyordu:
 *
 * 🔴 `cac:Country` kopyaları YALNIZ KOD verildiğinde bloğu yine de yazıyordu.
 * GİB `CountryType`'ta `cbc:Name` minOccurs=1'dir, yani o çıktı ŞEMA-GEÇERSİZDİ
 * («"Country" elementinin içeriği eksik. Zorunlu element(ler): Name»). Doğru
 * davranış `originCountryBlock`'ta zaten vardı ve buraya taşındı: isim yoksa
 * blok HİÇ yazılmaz — geçersiz belge üretmektense eksik veri görünür kalır.
 *
 * Bu bir veri uydurma değildir; eksik ülke adı uydurulmaz, yalnız geçersiz
 * düğüm yazılmaz.
 */
export function serializeCountry(
  countryCode: string | undefined,
  countryName: string | undefined,
  indent: string,
  tagName: 'Country' | 'OriginCountry' = 'Country',
): string {
  if (!isNonEmpty(countryName)) return '';
  const inner = emitInOrder(COUNTRY_SEQ, {
    IdentificationCode: () => cbcOptionalTag('IdentificationCode', countryCode),
    Name: () => cbcRequiredTag('Name', countryName, tagName),
  });
  return joinLines([
    `${indent}<cac:${tagName}>`,
    ...inner.map(s => `${indent}  ${s}`),
    `${indent}</cac:${tagName}>`,
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════
// ORTAK `cac:Shipment` BİLEŞENİ
//
// UBL'de `ShipmentType` TEK tiptir ve dört yoldan yazılır:
//   /DespatchAdvice/cac:Shipment
//   /DespatchAdvice/cac:DespatchLine/cac:Shipment
//   /Invoice/cac:Delivery/cac:Shipment
//   /Invoice/cac:InvoiceLine/cac:Delivery/cac:Shipment
//
// S2b öncesinde İKİ ayrı üretici vardı: buradaki tablo-sürümlü fatura yolu ve
// `despatch-serializer.ts` içinde ELLE `lines.push()` yazan irsaliye yolu. İkinci
// üretici hiçbir sekans tablosuna bağlı değildi, dolayısıyla sıra bekçisinin de
// kapsamı dışındaydı. Aşağıdaki model + emitter ikisini tekleştirir; belge
// tipleri artık yalnız MODELİ doldurur, XML şeklini doldurmaz.
//
// ⚠️ Model, iki tarafın alanlarının BİRLEŞİMİDİR; hangi slotun dolacağı
// çağırana kalmıştır. Bu bilinçli: irsaliyenin `ValueAmount`ı ile faturanın
// GTİP'i aynı `cac:GoodsItem` içinde farklı slotlardır, ikisi de artık aynı
// emitter'dan geçer.
// ═══════════════════════════════════════════════════════════════════════════

/** `cac:GoodsItem` modeli — fatura GTİP yolu + irsaliye sevk değeri yolu. */
export interface GoodsItemModel {
  /** `cbc:ValueAmount` — irsaliye sevk değeri (B-73). */
  valueAmount?: { value: number; currencyId?: string };
  /** `cbc:RequiredCustomsID` — IHRACAT GTİP; emit anında noktasızlaştırılır. */
  requiredCustomsId?: string;
}

/** `cac:ShipmentStage` modeli — taşıma modu (fatura) + plaka/sürücü (irsaliye). */
export interface ShipmentStageModel {
  /** `cbc:TransportModeCode` — IHRACAT taşıma modu. */
  transportModeCode?: string;
  /** `cac:TransportMeans/cac:RoadTransport/cbc:LicensePlateID` — irsaliye plakaları. */
  licensePlates?: ReadonlyArray<{ plateNumber: string; schemeId?: string }>;
  /** `cac:DriverPerson` — irsaliye sürücüleri (XSD maxOccurs=unbounded). */
  driverPersons?: ReadonlyArray<{
    firstName?: string;
    familyName?: string;
    title?: string;
    nationalityId?: string;
  }>;
}

/** `cac:TransportHandlingUnit` modeli — paket (fatura), dorse (irsaliye), gümrük beyanı (702). */
export interface TransportHandlingUnitModel {
  actualPackages?: readonly ActualPackageInput[];
  /** `cac:TransportEquipment/cbc:ID` — irsaliye DORSEPLAKA yolu (B-49). */
  transportEquipments?: ReadonlyArray<{ id: string; schemeId?: string }>;
  customsDeclarations?: readonly CustomsDeclarationInput[];
}

/** `cac:Shipment` modeli — iki belge tipinin ortak paydası. */
export interface ShipmentModel {
  /** `cbc:ID` — UBL'de 1..1. Verilmezse `'1'`. */
  id?: string;
  goodsItems?: readonly GoodsItemModel[];
  stages?: readonly ShipmentStageModel[];
  /** `cac:Delivery` — irsaliyede teslimat adresi + taşıyıcı + sevk olayı. */
  delivery?: DeliveryInput;
  transportHandlingUnits?: readonly TransportHandlingUnitModel[];
}

/**
 * `cac:Shipment` → XML. TEK üretici; sıra `SHIPMENT_SEQ`ten gelir.
 *
 * 🔴 `cbc:ID` ZORUNLU yazılır (UBL `ShipmentType`'ta 1..1). İrsaliye tarafı
 * eskiden `cbcOptionalTag` kullanıyordu: `shipmentId: ''` verildiğinde eleman
 * sessizce DÜŞÜYOR ve belge XSD'den kalıyordu. Artık boş değer açık hata verir.
 */
export function serializeShipmentElement(model: ShipmentModel, indent: string = ''): string {
  const i2 = indent + '  ';
  const i3 = indent + '    ';

  const inner = emitInOrder(SHIPMENT_SEQ, {
    ID: () => cbcRequiredTag('ID', model.id ?? '1', 'Shipment'),
    GoodsItem: () => joinLines((model.goodsItems ?? []).map(gi => serializeGoodsItem(gi, i2))),
    ShipmentStage: () => joinLines((model.stages ?? []).map(st => serializeShipmentStage(st, i2))),
    Delivery: () => (model.delivery ? serializeDelivery(model.delivery, i2) : ''),
    TransportHandlingUnit: () =>
      joinLines((model.transportHandlingUnits ?? []).map(thu => serializeTransportHandlingUnit(thu, i2, i3))),
  });

  const body = joinLines(inner.map(s => (s.startsWith(i2) ? s : i2 + s)));
  return [`${indent}<cac:Shipment>`, body, `${indent}</cac:Shipment>`].join('\n');
}

/**
 * `cac:GoodsItem` → XML. Sıra: `GOODS_ITEM_SEQ` (`ValueAmount` #9 → `RequiredCustomsID` #16).
 *
 * ⚠️ Sarmalayıcı, içi BOŞ kalsa da yazılır. İki taraf da bugün böyle davranıyor
 * (irsaliye koşulsuz bir `<cac:GoodsItem/>` çifti basar, fatura `goodsItems: [{}]`
 * verildiğinde aynısını yapar) ve davranış BİLEREK korundu: boş düğümün GİB
 * kapısında zararsız olduğu ölçüldü, kaldırmak ise bu refactor'ın kapsamı
 * dışında bir davranış değişikliği olurdu.
 *
 * 🔴 GTİP XML'e NOKTASIZ yazılır — tel biçimi budur.
 *
 * GİB 17.01.2017 IHRACAT entegratör test duyurusu: «GTİP noktasız 12 hane».
 * Şematron `Common:326` da KARAKTER sayar (`string-length(normalize-space(...))
 * = 12`) — `normalize-space` noktayı ELEMEZ. Yani kullanıcının gayet meşru
 * yazdığı `8471.30.0000.00` (15 karakter) ham hâliyle gönderilirse GİB
 * reddeder, GTB tarafında `1230` olarak patlardı.
 *
 * Burası tüm yolların (mapper → InvoiceInput → XML ve builder → InvoiceInput
 * → XML) ortak son kapısıdır; normalizasyon TEK yerde, burada yapılır.
 *
 * Bu bir DEĞER UYDURMA değildir: yalnız biçim ayracı silinir, hane
 * eklenmez/kırpılmaz. Hane sayısı yanlışsa belge buraya zaten ULAŞMAZ —
 * `profile-validators` (IHRACAT) ve `ihrackayitli-validator` (702) o kapıyı
 * hata ile kapatır. Kullanıcının YAZDIĞI alan da değiştirilmez; değişen
 * yalnız tele giden temsildir.
 */
function serializeGoodsItem(item: GoodsItemModel, indent: string): string {
  const inner = emitInOrder(GOODS_ITEM_SEQ, {
    /* ⚠️ `cbcOptionalAmountTag` DEĞİL: o yardımcı 2 ondalığa yuvarlar
     * (`decimalCheck` gereği) ve irsaliyenin bugünkü `12500` çıktısını
     * `12500.00` yapardı. `cbc:ValueAmount` `decimalCheck` kapsamında
     * değildir; değer kullanıcının verdiği gibi yazılır. */
    ValueAmount: () =>
      item.valueAmount === undefined
        ? ''
        : tag('cbc:ValueAmount', {
            content: escapeXml(String(item.valueAmount.value)),
            attrs: { currencyID: item.valueAmount.currencyId ?? 'TRY' },
          }),
    RequiredCustomsID: () => cbcOptionalTag('RequiredCustomsID', normalizeGtip(item.requiredCustomsId)),
  });
  return joinLines([
    `${indent}<cac:GoodsItem>`,
    ...inner.map(s => `${indent}  ${s}`),
    `${indent}</cac:GoodsItem>`,
  ]);
}

/**
 * `cac:ShipmentStage` → XML. Sıra: `SHIPMENT_STAGE_SEQ`
 * (`TransportModeCode` #2 → `TransportMeans` #7 → `DriverPerson` #8).
 */
function serializeShipmentStage(stage: ShipmentStageModel, indent: string): string {
  const i2 = indent + '  ';
  const inner = emitInOrder(SHIPMENT_STAGE_SEQ, {
    TransportModeCode: () => cbcOptionalTag('TransportModeCode', stage.transportModeCode),
    TransportMeans: () => serializeTransportMeans(stage.licensePlates, i2),
    // B-20 + AR-2: her sürücü için ayrı `cac:DriverPerson` (XSD maxOccurs=unbounded).
    DriverPerson: () =>
      joinLines((stage.driverPersons ?? []).map(dp => serializeDriverPerson(dp, i2))),
  });
  return joinLines([
    `${indent}<cac:ShipmentStage>`,
    ...inner.map(s => (s.startsWith(i2) ? s : i2 + s)),
    `${indent}</cac:ShipmentStage>`,
  ]);
}

/** `cac:TransportMeans` → `cac:RoadTransport` → `cbc:LicensePlateID`. Sıra: TRANSPORT_MEANS/ROAD_TRANSPORT_SEQ. */
function serializeTransportMeans(
  plates: ShipmentStageModel['licensePlates'],
  indent: string,
): string {
  if (!plates || plates.length === 0) return '';
  const i2 = indent + '  ';
  const i3 = indent + '    ';

  const roadInner = emitInOrder(ROAD_TRANSPORT_SEQ, {
    LicensePlateID: () =>
      joinLines(
        plates.map(
          lp =>
            `${i3}${cbcOptionalTag('LicensePlateID', lp.plateNumber, lp.schemeId ? { schemeID: lp.schemeId } : undefined)}`,
        ),
      ),
  });
  const meansInner = emitInOrder(TRANSPORT_MEANS_SEQ, {
    RoadTransport: () =>
      joinLines([`${i2}<cac:RoadTransport>`, ...roadInner, `${i2}</cac:RoadTransport>`]),
  });
  return joinLines([`${indent}<cac:TransportMeans>`, ...meansInner, `${indent}</cac:TransportMeans>`]);
}

/**
 * `cac:DriverPerson` → XML. Sıra: `PERSON_SEQ`.
 *
 * Üç alan ZORUNLUDUR (`cbcRequiredTag`): GİB e-İrsaliye kılavuzu sürücü
 * kimliğini ad + soyad + TCKN üçlüsüyle ister. `cac:Person`daki opsiyonel
 * davranışla karıştırılmamalıdır — orası alıcı/satıcı gerçek kişisidir.
 */
function serializeDriverPerson(
  driver: NonNullable<ShipmentStageModel['driverPersons']>[number],
  indent: string,
): string {
  const inner = emitInOrder(PERSON_SEQ, {
    FirstName: () => cbcRequiredTag('FirstName', driver.firstName, 'DriverPerson'),
    FamilyName: () => cbcRequiredTag('FamilyName', driver.familyName, 'DriverPerson'),
    Title: () => cbcOptionalTag('Title', driver.title),
    NationalityID: () => cbcRequiredTag('NationalityID', driver.nationalityId, 'DriverPerson'),
  });
  return joinLines([
    `${indent}<cac:DriverPerson>`,
    ...inner.map(s => `${indent}  ${s}`),
    `${indent}</cac:DriverPerson>`,
  ]);
}

/**
 * `cac:TransportHandlingUnit` → XML. Sıra: `TRANSPORT_HANDLING_UNIT_SEQ`
 * (`ActualPackage` #10 → `TransportEquipment` #11 → `CustomsDeclaration` #20).
 *
 * Üç slotun üçü de tek yerden yazılır: paket fatura yolundan, dorse plakası
 * irsaliye yolundan, gümrük beyannamesi IHRACKAYITLI/702 yolundan gelir.
 */
function serializeTransportHandlingUnit(
  thu: TransportHandlingUnitModel,
  indent: string,
  childIndent: string,
): string {
  const inner = emitInOrder(TRANSPORT_HANDLING_UNIT_SEQ, {
    /* B-102: ActualPackage içi sıra PACKAGE_SEQ'ten gelir
     * (ID → Quantity → PackagingTypeCode). Önceki kod PackagingTypeCode'u
     * Quantity'den ÖNCE yazıyordu; ikisi birlikte verildiğinde şema-geçersizdi. */
    ActualPackage: () =>
      joinLines(
        (thu.actualPackages ?? []).map(pkg => {
          const pkgInner = emitInOrder(PACKAGE_SEQ, {
            ID: () => cbcOptionalTag('ID', pkg.id),
            Quantity: () => (pkg.quantity !== undefined ? cbcOptionalTag('Quantity', String(pkg.quantity)) : ''),
            PackagingTypeCode: () => cbcOptionalTag('PackagingTypeCode', pkg.packagingTypeCode),
          });
          return joinLines([
            `${childIndent}<cac:ActualPackage>`,
            ...pkgInner.map(p => `${childIndent}  ${p}`),
            `${childIndent}</cac:ActualPackage>`,
          ]);
        }),
      ),

    // B-49: canonical DORSEPLAKA yolu — Shipment/TransportHandlingUnit/TransportEquipment/ID
    TransportEquipment: () =>
      joinLines(
        (thu.transportEquipments ?? []).map(eq => {
          const eqInner = emitInOrder(TRANSPORT_EQUIPMENT_SEQ, {
            ID: () => cbcOptionalTag('ID', eq.id, { schemeID: eq.schemeId ?? 'DORSEPLAKA' }),
          });
          return joinLines([
            `${childIndent}<cac:TransportEquipment>`,
            ...eqInner.map(e => `${childIndent}  ${e}`),
            `${childIndent}</cac:TransportEquipment>`,
          ]);
        }),
      ),

    // CustomsDeclaration — IHRACKAYITLI + 702 için (B-14, Schematron satır 322/451)
    CustomsDeclaration: () =>
      joinLines(
        (thu.customsDeclarations ?? []).map((cd, cdIndex) =>
          serializeCustomsDeclaration(cd, cdIndex, childIndent),
        ),
      ),
  });
  return joinLines([
    `${indent}<cac:TransportHandlingUnit>`,
    ...inner,
    `${indent}</cac:TransportHandlingUnit>`,
  ]);
}

/**
 * Fatura tarafı adaptörü: `ShipmentInput` → `ShipmentModel`.
 *
 * B-99: `shipmentStages` verilmişse onlar kullanılır, yoksa
 * `shipment.transportModeCode` fallback olarak tek stage üretir.
 */
function serializeShipment(shipment: DeliveryInput['shipment'], indent: string): string {
  if (!shipment) return '';

  /* 🔴 TAŞIMA MODU UYDURULMAZ. Şematron `LineDeliveryCheck` IHRACAT'ta bu kodu
   * ZORUNLU tutar, ama eksikliğin çaresi burada bir varsayılan (örn. "4 =
   * Havayolu") basmak DEĞİLDİR: uydurulan kod belgeye GERÇEK OLMAYAN bir
   * taşıma beyanı yazar ve kullanıcı eksiğini hiç öğrenmez. Değer yoksa hiçbir
   * ShipmentStage yazılmaz; eksiği `profile-validators` AÇIK hata olarak
   * bildirir.
   *
   * İçi tamamen boş kalacak stage'ler de ELENİR: çocuksuz bir
   * `<cac:ShipmentStage>` hiçbir şematron kuralını karşılamaz, yalnız gürültü
   * üretir (kullanıcı `shipmentStages: [{}]` verdiğinde oluşuyordu). */
  const stages: ShipmentStageModel[] = (
    shipment.shipmentStages && shipment.shipmentStages.length > 0
      ? shipment.shipmentStages
      : isNonEmpty(shipment.transportModeCode)
        ? [{ transportModeCode: shipment.transportModeCode }]
        : []
  ).filter(stage => isNonEmpty(stage.transportModeCode));

  return serializeShipmentElement(
    {
      id: '1',
      goodsItems: shipment.goodsItems,
      stages,
      transportHandlingUnits: shipment.transportHandlingUnits,
    },
    indent,
  );
}

/**
 * `cac:CustomsDeclaration` → XML fragment. Sequence: CUSTOMS_DECLARATION_SEQ
 * (ID → ValidityPeriod → ApplicableTransportMeans → IssuerParty).
 *
 * @param index 0 tabanlı sıra — `cd.id` boşsa konum numarası ID'ye düşer.
 */
function serializeCustomsDeclaration(cd: CustomsDeclarationInput, index: number, indent: string): string {
  const i2 = indent + '  ';
  const i3 = indent + '    ';
  const i4 = indent + '      ';

  const inner = emitInOrder(CUSTOMS_DECLARATION_SEQ, {
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
    ID: () => `${i2}${cbcRequiredTag('ID', isNonEmpty(cd.id) ? cd.id : String(index + 1), 'CustomsDeclaration')}`,

    /* 🔴 UBL-TR `PartyType` bu bağlamda ÜÇÜNÜ birden ister:
     * PartyIdentification + PartyName + PostalAddress. Yalnız kimlik
     * yazılan belge «"IssuerParty" elementinin içeriği eksik» ile
     * XSD'den düşer (canlı ölçüm). Ad ve adres alıcıdan gelir —
     * ALICIDIBSATIRKOD zaten alıcının kodudur. */
    IssuerParty: () => {
      const issuer = cd.issuerParty;
      if (!issuer?.partyIdentifications?.length) return '';
      return joinLines([
        `${i2}<cac:IssuerParty>`,
        ...issuer.partyIdentifications.flatMap(pi => [
          `${i3}<cac:PartyIdentification>`,
          `${i4}${cbcRequiredTag('ID', pi.id, 'CustomsDeclaration/IssuerParty/PartyIdentification', { schemeID: pi.schemeID })}`,
          `${i3}</cac:PartyIdentification>`,
        ]),
        ...(isNonEmpty(issuer.name)
          ? [
              `${i3}<cac:PartyName>`,
              `${i4}${cbcRequiredTag('Name', issuer.name, 'CustomsDeclaration/IssuerParty/PartyName')}`,
              `${i3}</cac:PartyName>`,
            ]
          : []),
        ...(issuer.postalAddress ? [serializeAddress(issuer.postalAddress, 'PostalAddress', i3)] : []),
        `${i2}</cac:IssuerParty>`,
      ]);
    },
  });

  return joinLines([`${indent}<cac:CustomsDeclaration>`, ...inner, `${indent}</cac:CustomsDeclaration>`]);
}
