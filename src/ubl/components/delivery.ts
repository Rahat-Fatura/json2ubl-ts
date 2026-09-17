import type {
  DeliveryInput,
  LineDeliveryInput,
  CustomsDeclarationInput,
  ActualPackageInput,
  DespatchEventInput,
} from '../../types/common';
import { cbcOptionalTag, cbcRequiredTag, joinLines, tag } from '../primitives/xml-helpers';
import { escapeXml, isNonEmpty } from '../../utils/formatters';
import { normalizeGtip } from '../../utils/gtip';
import { serializeAddress } from './address';
import { serializePartyAs, serializePartyBody } from './party';
import {
  DELIVERY_SEQ,
  DELIVERY_DESPATCH_SEQ,
  DELIVERY_TERMS_SEQ,
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
} from '../sequences/xsd-sequence';

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

/** Bir `cac:ShipmentStage` içindeki tek plaka — `cbc:LicensePlateID`. */
export interface LicensePlateModel {
  plateNumber: string;
  schemeId?: string;
}

/** `cac:DriverPerson` — `PersonType` gövdesinin irsaliyede kullanılan alanları. */
export interface DriverPersonModel {
  firstName?: string;
  familyName?: string;
  title?: string;
  nationalityId?: string;
}

/**
 * `cac:ShipmentStage` modeli — taşıma modu (fatura) + plaka/sürücü (irsaliye).
 *
 * 🔴 `licensePlate` TEKİLDİR, dizi DEĞİL — ve bu, yorum değil TİP düzeyinde bir
 * güvencedir. GİB XSD'si bir aşamaya birden fazla plaka yazılmasına izin vermez:
 *
 * ```xml
 * <!-- UBL-CommonAggregateComponents-2.1.xsd:2653 -->
 * <xsd:element ref="cac:TransportMeans" minOccurs="0"/>      <!-- 0..1 -->
 * <!-- …:3140 --> <xsd:element ref="cac:RoadTransport" minOccurs="0"/>  <!-- 0..1 -->
 * <!-- …:2578 --> <xsd:element ref="cbc:LicensePlateID"/>    <!-- maxOccurs YOK → 1..1 -->
 * ```
 *
 * Model eskiden `licensePlates: []` taşıyordu ve serileştirici N plakayı TEK
 * `cac:RoadTransport` içine basıyordu; çıktı SESSİZCE XSD-geçersizdi (canlı
 * ölçüm 2026-08-05: «cvc-complex-type.2.4.d: Invalid content was found starting
 * with element 'cbc:LicensePlateID'»). Kusur bir süre doğrulayıcı kuralıyla
 * kapatıldı; gerçek çözüm, geçersiz şeklin TİPTE TEMSİL EDİLEMEMESİDİR.
 * N plaka artık N `ShipmentStage` demektir — bkz. `buildVehicleStages`.
 */
export interface ShipmentStageModel {
  /** `cbc:ID` — aşama numarası (XSD 0..1). */
  id?: string;
  /** `cbc:TransportModeCode` — IHRACAT taşıma modu. */
  transportModeCode?: string;
  /** `cac:TransportMeans/cac:RoadTransport/cbc:LicensePlateID` — bu aşamanın TEK plakası. */
  licensePlate?: LicensePlateModel;
  /** `cac:DriverPerson` — irsaliye sürücüleri (XSD maxOccurs=unbounded). */
  driverPersons?: ReadonlyArray<DriverPersonModel>;
}

/**
 * N plaka → N `cac:ShipmentStage`. Çoklu araç desteğinin TEK kaynağı.
 *
 * ── NEDEN N AŞAMA ─────────────────────────────────────────────────────────
 * Bir aşama en fazla bir plaka taşıyabilir (yukarıdaki XSD zinciri), ama
 * `ShipmentType` aşamayı 0..n kabul eder:
 * `UBL-CommonAggregateComponents-2.1.xsd:2637` →
 * `<xsd:element ref="cac:ShipmentStage" minOccurs="0" maxOccurs="unbounded"/>`.
 * Dolayısıyla ikinci çekicinin XSD'ye uyan tek yeri ikinci bir aşamadır.
 *
 * CANLI ÖLÇÜLDÜ (xslt-service, şematron paketi 2026-08-04, XSD 2026-08-05):
 * iki ve üç aşamalı irsaliye `validSchema: true` + `validSchematron: true`
 * döner; aynı iki plaka tek `cac:RoadTransport`ta ise `cvc-complex-type.2.4.d`
 * ile reddedilir. Yani "N aşama" bir tahmin değil, ölçülmüş davranıştır.
 *
 * ── SÜRÜCÜLER NİYE İLK AŞAMADA TOPLANIYOR ─────────────────────────────────
 * 🔴 Plaka↔sürücü eşleşmesi için GİB kaynaklarında KANIT YOKTUR: ne UBL-TR
 * Sevk İrsaliyesi Kılavuzu V1.2 ne e-İrsaliye Uygulama Kılavuzu V1.2 çoklu
 * araç senaryosunu hiç tarif etmez ("birden fazla araç/plaka" ifadesi hiçbir
 * kılavuzda geçmez), GİB'in yayımladığı beş irsaliye örneğinin (Irsaliye-Ornek1/
 * 2/3, Irsaliye-Matbudan, IDIS_Irsaliye) hepsinde `cac:ShipmentStage` TEK
 * KEZ geçer.
 *
 * Elimizdeki TEK normatif desen şudur — Sevk İrsaliyesi Kılavuzu §2.3.21 ve
 * `Irsaliye-Ornek1.xml:155-173`: **iki sürücü, tek plaka, TEK aşama**. Yani
 * GİB'in kendi örneği sürücüleri aşamalara BÖLMEZ; hepsini bir arada tutar.
 * Bu yüzden en muhafazakâr davranış, o deseni korumaktır: sürücüler bölünmez,
 * ilk aşamada toplanır.
 *
 * Girdide plaka↔sürücü bağı ZATEN YOKTUR (`licensePlates[]` ve
 * `driverPersons[]` iki bağımsız dizidir); indeks eşlemesi uydurmak,
 * kullanıcının hiç beyan etmediği bir "bu şoför bu aracı kullanıyor" iddiasını
 * belgeye yazmak olurdu. Değer uydurmama ilkesi burada da geçerlidir.
 *
 * Şematron da bu seçimi cezalandırmaz: `DespatchCarrierDriverCheck`
 * (`UBL-TR_Common_Schematron.xml:765-770`) belge KÖKÜNDE bir kez koşar ve
 * 766. assert `count(cac:Shipment/cac:ShipmentStage/cac:DriverPerson)` ile TÜM
 * aşamaları toplar — sürücünün hangi aşamada olduğuna bakmaz (ölçüldü: sürücüsü
 * yalnız ikinci aşamada olan belge de temiz geçiyor). 767-769. assert'ler ise
 * `string(node-set)` kullanır, yani XPath 1.0 semantiğiyle YALNIZ doküman
 * sırasındaki İLK `DriverPerson`ı denetler; sürücüleri ilk aşamada tutmak
 * denetlenen sürücüyü denetlenen konumda tutar.
 *
 * ⚠️ AÇIK KALAN: GİB çoklu araçta sürücüyü araca bağlamayı isterse bu eşleşme
 * girdiye AÇIK bir alan olarak eklenmelidir (örn. sürücü başına araç indeksi).
 * Bugün böyle bir kural ne kılavuzda ne şematronda vardır.
 */
export function buildVehicleStages(
  plates: ReadonlyArray<LicensePlateModel> | undefined,
  driverPersons: ReadonlyArray<DriverPersonModel> | undefined,
): ShipmentStageModel[] {
  /* Plakasız hâl (yalnız taşıyıcı firma, ya da doğrulama kapatılmış çağrı):
   * tek aşama yazılır ve sürücüler oraya girer — yerleşik davranışın aynısı. */
  if (!plates || plates.length === 0) return [{ driverPersons }];

  return plates.map((plate, index) =>
    index === 0 ? { licensePlate: plate, driverPersons } : { licensePlate: plate },
  );
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
 * (`ID` #1 → `TransportModeCode` #2 → `TransportMeans` #7 → `DriverPerson` #8).
 */
function serializeShipmentStage(stage: ShipmentStageModel, indent: string): string {
  const i2 = indent + '  ';
  const inner = emitInOrder(SHIPMENT_STAGE_SEQ, {
    ID: () => cbcOptionalTag('ID', stage.id),
    TransportModeCode: () => cbcOptionalTag('TransportModeCode', stage.transportModeCode),
    TransportMeans: () => serializeTransportMeans(stage.licensePlate, i2),
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

/**
 * `cac:TransportMeans` → `cac:RoadTransport` → `cbc:LicensePlateID`.
 * Sıra: TRANSPORT_MEANS/ROAD_TRANSPORT_SEQ.
 *
 * TEK plaka alır: `RoadTransportType` XSD'de `cbc:LicensePlateID`i 1..1 kılar
 * (`UBL-CommonAggregateComponents-2.1.xsd:2578`). İkinci araç ikinci
 * `cac:ShipmentStage`e gider (`buildVehicleStages`), ikinci plaka BURAYA değil.
 */
function serializeTransportMeans(
  plate: LicensePlateModel | undefined,
  indent: string,
): string {
  if (!plate) return '';
  const i2 = indent + '  ';
  const i3 = indent + '    ';

  const roadInner = emitInOrder(ROAD_TRANSPORT_SEQ, {
    LicensePlateID: () =>
      `${i3}${cbcOptionalTag('LicensePlateID', plate.plateNumber, plate.schemeId ? { schemeID: plate.schemeId } : undefined)}`,
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
      /* S2b: ORTAK taraf gövdesi. Burada da elle yazılmış bir `PartyType` vardı —
       * `CarrierParty` vakasının düzeltilmemiş ikizi. Kimlik/ad/adres üçlüsü
       * artık `PARTY_SEQ`ten geçer; tipe yarın bir slot eklenirse burada da
       * doğru yere düşer, "hangi kopyayı unuttuk" sorusu ortadan kalkar. */
      return serializePartyBody(
        {
          identifiers: issuer.partyIdentifications.map(pi => ({ value: pi.id, schemeId: pi.schemeID })),
          name: issuer.name,
          address: issuer.postalAddress,
        },
        'IssuerParty',
        i2,
      );
    },
  });

  return joinLines([`${indent}<cac:CustomsDeclaration>`, ...inner, `${indent}</cac:CustomsDeclaration>`]);
}
