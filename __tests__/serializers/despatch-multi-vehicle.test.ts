/**
 * ÇOKLU ARAÇ — N plaka → N `cac:ShipmentStage`.
 *
 * ## Bu testin yerini aldığı kural
 *
 * Burada bir zamanlar `license-plate-cardinality.test.ts` vardı: "2+ plaka
 * REDDEDİLİR" diyordu. O kapı GEÇİCİYDİ; gerçek kusur plaka sayısı değil,
 * serileştiricinin N plakayı TEK `cac:RoadTransport` içine basmasıydı
 * (`RoadTransportType` → `cbc:LicensePlateID` XSD'de 1..1,
 * `UBL-CommonAggregateComponents-2.1.xsd:2578`).
 *
 * ## Kaynaklar
 *
 * · `ShipmentType` → `cac:ShipmentStage` **0..n**
 *   (`UBL-CommonAggregateComponents-2.1.xsd:2637`, `maxOccurs="unbounded"`)
 * · `ShipmentStageType` → `cac:TransportMeans` **0..1** (`:2653`),
 *   `cac:DriverPerson` **0..n** (`:2654`)
 * · `TransportMeansType` → `cac:RoadTransport` **0..1** (`:3140`)
 *
 * ## Canlı ölçüm (xslt-service, XSD 2026-08-05 / şematron 2026-08-04)
 *
 *   iki plaka TEK RoadTransport  → validSchema=false, `cvc-complex-type.2.4.d`
 *   iki plaka İKİ ShipmentStage  → validSchema=true,  validSchematron=true
 *   üç  plaka ÜÇ  ShipmentStage  → validSchema=true,  validSchematron=true
 *
 * ## Sürücü yerleşimi
 *
 * Sürücüler İLK aşamada toplanır. Gerekçe `buildVehicleStages` JSDoc'undadır
 * (özeti: kılavuzda plaka↔sürücü eşleşme kuralı YOK, GİB'in tek örneği iki
 * sürücüyü TEK aşamada gösteriyor, girdide de bir bağ yok).
 */

import { describe, it, expect } from 'vitest';
import { DespatchBuilder, mapSimpleToDespatchInput } from '../../src';
import { buildVehicleStages } from '../../src/ubl/components/delivery';
import { DespatchProfileId, DespatchTypeCode } from '../../src/types/enums';
import type { DespatchInput, LicensePlateInput, DriverPersonInput } from '../../src/types/despatch-input';

const DRIVER_A: DriverPersonInput = { firstName: 'Ahmet', familyName: 'Yılmaz', nationalityId: '12345678901' };
const DRIVER_B: DriverPersonInput = { firstName: 'Mehmet', familyName: 'Kaya', nationalityId: '98765432109' };

function createInput(plates: LicensePlateInput[], drivers: DriverPersonInput[] = [DRIVER_A]): DespatchInput {
  return {
    id: 'ABC2024000000001',
    uuid: '12345678-1234-1234-1234-123456789012',
    profileId: DespatchProfileId.TEMELIRSALIYE,
    despatchTypeCode: DespatchTypeCode.SEVK,
    issueDate: '2024-01-15',
    issueTime: '10:30:00',
    supplier: {
      vknTckn: '1234567890', taxIdType: 'VKN', name: 'Sender',
      cityName: 'İstanbul', citySubdivisionName: 'Kadıköy', country: 'Türkiye',
    },
    customer: {
      vknTckn: '0987654321', taxIdType: 'VKN', name: 'Receiver',
      cityName: 'Ankara', citySubdivisionName: 'Çankaya', country: 'Türkiye',
    },
    shipment: {
      actualDespatchDate: '2024-01-15',
      actualDespatchTime: '14:00:00',
      deliveryAddress: {
        citySubdivisionName: 'Çankaya', cityName: 'Ankara',
        postalZone: '06100', country: 'Türkiye',
      },
      driverPersons: drivers,
      licensePlates: plates,
    },
    lines: [{ id: '1', deliveredQuantity: 10, unitCode: 'C62', item: { name: 'X' } }],
  };
}

const build = (input: DespatchInput) =>
  new DespatchBuilder({ prettyPrint: true, validationLevel: 'strict' }).build(input);

const countOf = (xml: string, needle: string) => xml.split(needle).length - 1;

describe('çoklu araç · N plaka → N ShipmentStage', () => {
  it('tek plaka TEK aşama üretir (yerleşik davranış değişmedi)', () => {
    const xml = build(createInput([{ plateNumber: '34ABC123', schemeId: 'PLAKA' }]));
    expect(countOf(xml, '<cac:ShipmentStage>')).toBe(1);
    expect(countOf(xml, '<cbc:LicensePlateID')).toBe(1);
  });

  it('🔴 iki çekici İKİ aşama üretir — plakalar AYNI RoadTransport\'a YIĞILMAZ', () => {
    const xml = build(createInput([
      { plateNumber: '34ABC123', schemeId: 'PLAKA' },
      { plateNumber: '06XYZ456', schemeId: 'PLAKA' },
    ]));

    expect(countOf(xml, '<cac:ShipmentStage>')).toBe(2);
    expect(countOf(xml, '<cac:RoadTransport>')).toBe(2);
    expect(countOf(xml, '<cbc:LicensePlateID')).toBe(2);

    // XSD 1..1 ihlali: bir RoadTransport içinde İKİ plaka. Olmamalı.
    for (const road of xml.split('<cac:RoadTransport>').slice(1)) {
      const body = road.split('</cac:RoadTransport>')[0];
      expect(countOf(body, '<cbc:LicensePlateID')).toBe(1);
    }
  });

  it('üç çekici ÜÇ aşama üretir — kural "2 tane" değil, aşama başına 1 plaka', () => {
    const xml = build(createInput([
      { plateNumber: '34ABC123', schemeId: 'PLAKA' },
      { plateNumber: '06XYZ456', schemeId: 'PLAKA' },
      { plateNumber: '35DEF789', schemeId: 'PLAKA' },
    ]));
    expect(countOf(xml, '<cac:ShipmentStage>')).toBe(3);
    expect(countOf(xml, '<cbc:LicensePlateID')).toBe(3);
  });

  it('plakalar VERİLDİĞİ SIRAYLA aşamalara düşer', () => {
    const xml = build(createInput([
      { plateNumber: '34ABC123', schemeId: 'PLAKA' },
      { plateNumber: '06XYZ456', schemeId: 'PLAKA' },
    ]));
    expect(xml.indexOf('34ABC123')).toBeLessThan(xml.indexOf('06XYZ456'));
  });

  it('YABANCI plaka da kendi aşamasını alır (schemeID korunur)', () => {
    const xml = build(createInput([
      { plateNumber: '34ABC123', schemeId: 'PLAKA' },
      { plateNumber: 'BG-1234-XY', schemeId: 'YABANCIPLAKA' },
    ]));
    expect(countOf(xml, '<cac:ShipmentStage>')).toBe(2);
    expect(xml).toContain('<cbc:LicensePlateID schemeID="YABANCIPLAKA">BG-1234-XY</cbc:LicensePlateID>');
  });

  it('çoklu araç ARTIK doğrulamadan geçer — S3 kapısı kalktı', () => {
    const errors = new DespatchBuilder({ validationLevel: 'strict' }).validate(createInput([
      { plateNumber: '34ABC123', schemeId: 'PLAKA' },
      { plateNumber: '06XYZ456', schemeId: 'PLAKA' },
    ]));
    expect(errors.filter(e => e.code === 'XSD_CARDINALITY')).toEqual([]);
  });

  it('her plaka AYRI AYRI denetlenir — ikinci aracın bozuk plakası sessizce geçmez', () => {
    const errors = new DespatchBuilder({ validationLevel: 'strict' }).validate(createInput([
      { plateNumber: '34ABC123', schemeId: 'PLAKA' },
      { plateNumber: 'ZZZZ', schemeId: 'PLAKA' },
    ]));
    expect(errors.map(e => e.path)).toContain('shipment.licensePlates[1].plateNumber');
  });
});

describe('çoklu araç · sürücü yerleşimi', () => {
  it('TÜM sürücüler İLK aşamada toplanır, ikinci aşama sürücüsüzdür', () => {
    const xml = build(createInput(
      [{ plateNumber: '34ABC123', schemeId: 'PLAKA' }, { plateNumber: '06XYZ456', schemeId: 'PLAKA' }],
      [DRIVER_A, DRIVER_B],
    ));

    const stages = xml.split('<cac:ShipmentStage>').slice(1).map(s => s.split('</cac:ShipmentStage>')[0]);
    expect(stages).toHaveLength(2);
    expect(countOf(stages[0], '<cac:DriverPerson>')).toBe(2);
    expect(countOf(stages[1], '<cac:DriverPerson>')).toBe(0);
  });

  it('şematronun denetlediği İLK DriverPerson, denetlenen konumda kalır', () => {
    // `DespatchCarrierDriverCheck` (Common:767-769) `string(node-set)` kullanır:
    // XPath 1.0'da bu YALNIZ doküman sırasındaki ilk düğümü okur.
    const xml = build(createInput(
      [{ plateNumber: '34ABC123', schemeId: 'PLAKA' }, { plateNumber: '06XYZ456', schemeId: 'PLAKA' }],
      [DRIVER_A, DRIVER_B],
    ));
    expect(xml.indexOf('<cac:DriverPerson>')).toBeLessThan(xml.indexOf('06XYZ456'));
  });
});

describe('çoklu araç · Simple katmanı da ZİNCİRİN tamamını taşır', () => {
  /* B-102 disiplini: "tipte var, XML'de yok" kusuru iki kez yaşandı. Ham katman
   * testi zinciri `DespatchInput`ten başlatır; bu test `SimpleDespatchInput`ten
   * başlatır ve eşleyicinin ikinci aracı DÜŞÜRMEDİĞİNİ kanıtlar. */
  it('SimpleDespatchInput iki çekici → XML\'de iki ShipmentStage', () => {
    const raw = mapSimpleToDespatchInput({
      id: 'IRS2026000000101',
      uuid: 'e1a2b3c4-0101-4000-8101-000000000101',
      datetime: '2026-04-23T10:00:00',
      type: 'SEVK',
      profile: 'TEMELIRSALIYE',
      sender: {
        taxNumber: '1234567890', name: 'Gönderici A.Ş.', address: 'Barbaros No:1',
        district: 'Üsküdar', city: 'İstanbul', zipCode: '34664', taxOffice: 'Üsküdar',
      },
      customer: {
        taxNumber: '9876543210', name: 'Alıcı Ltd.', address: 'Bağdat Cad. No:2',
        district: 'Kadıköy', city: 'İstanbul', zipCode: '34710', taxOffice: 'Kadıköy',
      },
      shipment: {
        actualDespatchDatetime: '2026-04-23T14:00:00',
        deliveryAddress: { address: 'Bağdat Cad. No:2', district: 'Kadıköy', city: 'İstanbul', zipCode: '34710' },
        drivers: [{ firstName: 'Mehmet', familyName: 'Sürücü', nationalityId: '12345678901' }],
        licensePlates: [{ value: '34ABC123' }, { value: '06XYZ456' }],
        trailerPlates: [{ value: '34DRS789' }],
      },
      lines: [{ name: 'Ürün', quantity: 10, unitCode: 'C62' }],
    });

    const xml = build(raw);
    expect(countOf(xml, '<cac:ShipmentStage>')).toBe(2);
    expect(xml).toContain('<cbc:LicensePlateID schemeID="PLAKA">34ABC123</cbc:LicensePlateID>');
    expect(xml).toContain('<cbc:LicensePlateID schemeID="PLAKA">06XYZ456</cbc:LicensePlateID>');
    // Dorse ÇEKİCİ DEĞİL: aşamaya değil, TransportEquipment'a gider.
    expect(xml).toContain('<cbc:ID schemeID="DORSEPLAKA">34DRS789</cbc:ID>');
    expect(countOf(xml, '34DRS789')).toBe(1);
  });
});

describe('buildVehicleStages · yüklem saftır, belge türü bilmez', () => {
  it('plaka yoksa TEK aşama döner ve sürücüler oraya girer', () => {
    expect(buildVehicleStages(undefined, [DRIVER_A])).toEqual([{ driverPersons: [DRIVER_A] }]);
    expect(buildVehicleStages([], [DRIVER_A])).toEqual([{ driverPersons: [DRIVER_A] }]);
  });

  it('tek plaka → tek aşama (plaka + sürücüler birlikte)', () => {
    const plate = { plateNumber: '34ABC123', schemeId: 'PLAKA' };
    expect(buildVehicleStages([plate], [DRIVER_A])).toEqual([
      { licensePlate: plate, driverPersons: [DRIVER_A] },
    ]);
  });

  it('N plaka → N aşama; sürücü YALNIZ ilkinde', () => {
    const p1 = { plateNumber: '34ABC123', schemeId: 'PLAKA' };
    const p2 = { plateNumber: '06XYZ456', schemeId: 'PLAKA' };
    expect(buildVehicleStages([p1, p2], [DRIVER_A])).toEqual([
      { licensePlate: p1, driverPersons: [DRIVER_A] },
      { licensePlate: p2 },
    ]);
  });

  it('sürücü hiç yoksa da aşamalar kurulur (taşıyıcı firmalı irsaliye)', () => {
    const p1 = { plateNumber: '34ABC123', schemeId: 'PLAKA' };
    const p2 = { plateNumber: '06XYZ456', schemeId: 'PLAKA' };
    expect(buildVehicleStages([p1, p2], undefined)).toEqual([
      { licensePlate: p1, driverPersons: undefined },
      { licensePlate: p2 },
    ]);
  });
});
