import { describe, it, expect } from 'vitest';
import { DespatchBuilder } from '../../src/builders/despatch-builder';
import { DespatchProfileId, DespatchTypeCode } from '../../src/types/enums';
import type { DespatchInput } from '../../src/types/despatch-input';

function createValidDespatchInput(): DespatchInput {
  return {
    id: 'ABC2024000000001',
    uuid: '12345678-1234-1234-1234-123456789012',
    profileId: DespatchProfileId.TEMELIRSALIYE,
    despatchTypeCode: DespatchTypeCode.SEVK,
    issueDate: '2024-01-15',
    issueTime: '10:30:00',
    supplier: {
      vknTckn: '1234567890',
      taxIdType: 'VKN',
      name: 'Gönderici Firma A.Ş.',
      cityName: 'İstanbul',
      citySubdivisionName: 'Kadıköy',
      country: 'Türkiye',
    },
    customer: {
      vknTckn: '0987654321',
      taxIdType: 'VKN',
      name: 'Alıcı Firma Ltd.',
      cityName: 'Ankara',
      citySubdivisionName: 'Çankaya',
      country: 'Türkiye',
    },
    shipment: {
      actualDespatchDate: '2024-01-15',
      actualDespatchTime: '14:00:00',
      deliveryAddress: {
        citySubdivisionName: 'Çankaya',
        cityName: 'Ankara',
        postalZone: '06100',
        country: 'Türkiye',
      },
      driverPersons: [{
        firstName: 'Mehmet',
        familyName: 'Kara',
        nationalityId: '12345678901',
      }],
    },
    lines: [{
      id: '1',
      deliveredQuantity: 10,
      unitCode: 'C62',
      item: { name: 'Test Ürün' },
    }],
  };
}

describe('DespatchBuilder — B-19 DespatchContact/Name', () => {
  it('despatchContactName verildiğinde DespatchContact emit edilir', () => {
    const builder = new DespatchBuilder();
    const input = createValidDespatchInput();
    input.despatchContactName = 'Ali Veli';
    const xml = builder.build(input);
    expect(xml).toContain('<cac:DespatchContact>');
    expect(xml).toContain('<cbc:Name>Ali Veli</cbc:Name>');
    // DespatchContact DespatchSupplierParty içinde, DeliveryCustomerParty dışında
    const supStart = xml.indexOf('<cac:DespatchSupplierParty>');
    const supEnd = xml.indexOf('</cac:DespatchSupplierParty>');
    const contactIdx = xml.indexOf('<cac:DespatchContact>');
    expect(contactIdx).toBeGreaterThan(supStart);
    expect(contactIdx).toBeLessThan(supEnd);
  });

  it('despatchContactName undefined ise DespatchContact emit edilmez', () => {
    const builder = new DespatchBuilder();
    const input = createValidDespatchInput();
    const xml = builder.build(input);
    expect(xml).not.toContain('<cac:DespatchContact>');
  });
});

describe('DespatchBuilder — B-52 LineCountNumeric + B-53 OrderReference array', () => {
  it('B-52 LineCountNumeric otomatik emit (input.lines.length)', () => {
    const builder = new DespatchBuilder();
    const input = createValidDespatchInput();
    input.lines = [
      { id: '1', deliveredQuantity: 5, unitCode: 'C62', item: { name: 'A' } },
      { id: '2', deliveredQuantity: 3, unitCode: 'C62', item: { name: 'B' } },
      { id: '3', deliveredQuantity: 1, unitCode: 'C62', item: { name: 'C' } },
    ];
    const xml = builder.build(input);
    expect(xml).toContain('<cbc:LineCountNumeric>3</cbc:LineCountNumeric>');
  });

  it('B-52 LineCountNumeric XSD sırası (Note < LineCountNumeric < OrderReference)', () => {
    const builder = new DespatchBuilder();
    const input = createValidDespatchInput();
    input.notes = ['Test notu'];
    input.orderReferences = [{ id: 'ORD-001', issueDate: '2024-01-10' }];
    const xml = builder.build(input);
    const noteIdx = xml.indexOf('<cbc:Note>Test notu</cbc:Note>');
    const lineCountIdx = xml.indexOf('<cbc:LineCountNumeric>');
    const orderIdx = xml.indexOf('<cac:OrderReference>');
    expect(noteIdx).toBeLessThan(lineCountIdx);
    expect(lineCountIdx).toBeLessThan(orderIdx);
  });

  it('B-53 çoklu OrderReference emit edilir', () => {
    const builder = new DespatchBuilder();
    const input = createValidDespatchInput();
    input.orderReferences = [
      { id: 'ORD-001', issueDate: '2024-01-10' },
      { id: 'ORD-002', issueDate: '2024-01-11' },
    ];
    const xml = builder.build(input);
    const orderCount = (xml.match(/<cac:OrderReference>/g) ?? []).length;
    expect(orderCount).toBe(2);
    expect(xml).toContain('ORD-001');
    expect(xml).toContain('ORD-002');
  });

  it('B-53 orderReferences undefined ise hiç OrderReference emit edilmez', () => {
    const builder = new DespatchBuilder();
    const input = createValidDespatchInput();
    const xml = builder.build(input);
    expect(xml).not.toContain('<cac:OrderReference>');
  });
});

describe('DespatchBuilder — B-72 Shipment ID override + B-73 GoodsItem.ValueAmount', () => {
  it('shipmentId default "1" emit edilir', () => {
    const builder = new DespatchBuilder();
    const input = createValidDespatchInput();
    const xml = builder.build(input);
    expect(xml).toMatch(/<cac:Shipment>\s*<cbc:ID>1<\/cbc:ID>/);
  });

  it('shipmentId override edilir', () => {
    const builder = new DespatchBuilder();
    const input = createValidDespatchInput();
    input.shipment.shipmentId = 'SHP-2024-001';
    const xml = builder.build(input);
    expect(xml).toMatch(/<cac:Shipment>\s*<cbc:ID>SHP-2024-001<\/cbc:ID>/);
  });

  it('B-73 GoodsItem.ValueAmount emit edilir (TRY default)', () => {
    const builder = new DespatchBuilder();
    const input = createValidDespatchInput();
    input.shipment.goodsItem = { valueAmount: { value: 1500 } };
    const xml = builder.build(input);
    expect(xml).toContain('<cbc:ValueAmount currencyID="TRY">1500</cbc:ValueAmount>');
  });

  it('B-73 ValueAmount currencyId override', () => {
    const builder = new DespatchBuilder();
    const input = createValidDespatchInput();
    input.shipment.goodsItem = { valueAmount: { value: 250, currencyId: 'USD' } };
    const xml = builder.build(input);
    expect(xml).toContain('<cbc:ValueAmount currencyID="USD">250</cbc:ValueAmount>');
  });
});

describe('DespatchBuilder — B-49 Canonical DORSEPLAKA (TransportHandlingUnit)', () => {
  it('TransportHandlingUnit emit edilir, LicensePlate ile yan yana kullanılabilir', () => {
    const builder = new DespatchBuilder();
    const input = createValidDespatchInput();
    input.shipment.licensePlates = [{ plateNumber: '34ABC123', schemeId: 'PLAKA' }];
    input.shipment.transportHandlingUnits = [{ transportEquipmentId: '34XYZ789' }];
    const xml = builder.build(input);
    // Codelist path
    expect(xml).toContain('<cbc:LicensePlateID schemeID="PLAKA">34ABC123</cbc:LicensePlateID>');
    // Canonical path
    expect(xml).toContain('<cac:TransportHandlingUnit>');
    expect(xml).toContain('<cac:TransportEquipment>');
    expect(xml).toContain('<cbc:ID schemeID="DORSEPLAKA">34XYZ789</cbc:ID>');
  });

  it('TransportHandlingUnit XSD sırasında: Delivery < TransportHandlingUnit < /Shipment', () => {
    const builder = new DespatchBuilder();
    const input = createValidDespatchInput();
    input.shipment.transportHandlingUnits = [{ transportEquipmentId: '06DRS001' }];
    const xml = builder.build(input);
    const deliveryEndIdx = xml.indexOf('</cac:Delivery>');
    const thuIdx = xml.indexOf('<cac:TransportHandlingUnit>');
    const shipmentEndIdx = xml.indexOf('</cac:Shipment>');
    expect(deliveryEndIdx).toBeLessThan(thuIdx);
    expect(thuIdx).toBeLessThan(shipmentEndIdx);
  });

  it('schemeId override edilir', () => {
    const builder = new DespatchBuilder();
    const input = createValidDespatchInput();
    input.shipment.transportHandlingUnits = [
      { transportEquipmentId: 'CONT-001', schemeId: 'CONTAINER' },
    ];
    const xml = builder.build(input);
    expect(xml).toContain('<cbc:ID schemeID="CONTAINER">CONT-001</cbc:ID>');
  });
});

describe('DespatchBuilder — B-48 3 opsiyonel party tipi', () => {
  it('buyerCustomer emit edilir, diğerleri yok', () => {
    const builder = new DespatchBuilder();
    const input = createValidDespatchInput();
    input.buyerCustomer = {
      vknTckn: '1111111111',
      taxIdType: 'VKN',
      name: 'Buyer Firma',
      cityName: 'İzmir',
      citySubdivisionName: 'Konak',
      country: 'Türkiye',
    };
    const xml = builder.build(input);
    expect(xml).toContain('<cac:BuyerCustomerParty>');
    expect(xml).toContain('Buyer Firma');
    expect(xml).not.toContain('<cac:SellerSupplierParty>');
    expect(xml).not.toContain('<cac:OriginatorCustomerParty>');
  });

  it('3 party birlikte — XSD sırasında emit edilir', () => {
    const builder = new DespatchBuilder();
    const input = createValidDespatchInput();
    const partyBase = {
      vknTckn: '1111111111',
      taxIdType: 'VKN' as const,
      cityName: 'İzmir',
      citySubdivisionName: 'Konak',
      country: 'Türkiye',
    };
    input.buyerCustomer = { ...partyBase, name: 'Buyer' };
    input.sellerSupplier = { ...partyBase, name: 'Seller' };
    input.originator = { ...partyBase, name: 'Originator' };
    const xml = builder.build(input);

    const deliveryIdx = xml.indexOf('<cac:DeliveryCustomerParty>');
    const buyerIdx = xml.indexOf('<cac:BuyerCustomerParty>');
    const sellerIdx = xml.indexOf('<cac:SellerSupplierParty>');
    const originatorIdx = xml.indexOf('<cac:OriginatorCustomerParty>');
    const shipmentIdx = xml.indexOf('<cac:Shipment>');

    // XSD sırası: Delivery < Buyer < Seller < Originator < Shipment
    expect(deliveryIdx).toBeLessThan(buyerIdx);
    expect(buyerIdx).toBeLessThan(sellerIdx);
    expect(sellerIdx).toBeLessThan(originatorIdx);
    expect(originatorIdx).toBeLessThan(shipmentIdx);
  });

  it('tüm opsiyonel party yoksa baseline korunur (runtime zorunluluk eklenmez)', () => {
    const builder = new DespatchBuilder();
    const input = createValidDespatchInput();
    const xml = builder.build(input);
    expect(xml).toContain('<cac:DespatchSupplierParty>');
    expect(xml).toContain('<cac:DeliveryCustomerParty>');
    expect(xml).not.toContain('<cac:BuyerCustomerParty>');
    expect(xml).not.toContain('<cac:SellerSupplierParty>');
    expect(xml).not.toContain('<cac:OriginatorCustomerParty>');
  });
});

// Sprint 7.3 — K1/K3/K4 regression guard (Sprint 6 devri, denetim 06 no-op teyit)
// + B-T09 XSD sequence coverage (FIX-PLANI-v3 §296-315).
// XSD_ELEMENTS truth source: src/serializers/xsd-sequence.ts (DESPATCH_SEQ, PERSON_SEQ, DELIVERY_SEQ, SHIPMENT_SEQ).

describe('Sprint 7.3 — K1/K3/K4 regression guard', () => {
  it('K1 (B-18): IssueTime cbcRequiredTag ile emit edilir', () => {
    const builder = new DespatchBuilder();
    const input = createValidDespatchInput();
    const xml = builder.build(input);
    expect(xml).toContain('<cbc:IssueTime>10:30:00');
    // DESPATCH_SEQ: IssueDate < IssueTime
    const issueDateIdx = xml.indexOf('<cbc:IssueDate>');
    const issueTimeIdx = xml.indexOf('<cbc:IssueTime>');
    expect(issueDateIdx).toBeLessThan(issueTimeIdx);
  });

  it('K3 (B-14): DELIVERY_SEQ — DeliveryAddress Delivery bloğu içinde doğru konumda', () => {
    const builder = new DespatchBuilder();
    const input = createValidDespatchInput();
    const xml = builder.build(input);
    // Delivery bloğu mevcut + DeliveryAddress içinde (DELIVERY_SEQ pattern)
    const deliveryStart = xml.indexOf('<cac:Delivery>');
    const deliveryEnd = xml.indexOf('</cac:Delivery>');
    const addrIdx = xml.indexOf('<cac:DeliveryAddress>');
    expect(deliveryStart).toBeGreaterThan(-1);
    expect(addrIdx).toBeGreaterThan(deliveryStart);
    expect(addrIdx).toBeLessThan(deliveryEnd);
  });

  it('K4 (B-20): PERSON_SEQ — FirstName < FamilyName < NationalityID', () => {
    const builder = new DespatchBuilder();
    const input = createValidDespatchInput();
    const xml = builder.build(input);
    const firstIdx = xml.indexOf('<cbc:FirstName>Mehmet</cbc:FirstName>');
    const familyIdx = xml.indexOf('<cbc:FamilyName>Kara</cbc:FamilyName>');
    const natIdx = xml.indexOf('<cbc:NationalityID>');
    expect(firstIdx).toBeGreaterThan(-1);
    expect(familyIdx).toBeGreaterThan(firstIdx);
    expect(natIdx).toBeGreaterThan(familyIdx);
  });
});

describe('B-T09 — XSD sequence named regression (Sprint 7.3)', () => {
  it('B-T09: DESPATCH_SEQ — CustomizationID < ProfileID < ID < IssueDate', () => {
    const builder = new DespatchBuilder();
    const input = createValidDespatchInput();
    const xml = builder.build(input);
    const customIdx = xml.indexOf('<cbc:CustomizationID>');
    const profileIdx = xml.indexOf('<cbc:ProfileID>');
    // root ID spesifik: <cbc:ID>ABC2024000000001</cbc:ID>
    const rootIdIdx = xml.indexOf('<cbc:ID>ABC2024000000001</cbc:ID>');
    const issueDateIdx = xml.indexOf('<cbc:IssueDate>');
    expect(customIdx).toBeGreaterThan(-1);
    expect(profileIdx).toBeGreaterThan(customIdx);
    expect(rootIdIdx).toBeGreaterThan(profileIdx);
    expect(issueDateIdx).toBeGreaterThan(rootIdIdx);
  });

  it('B-T09: SHIPMENT_SEQ — GoodsItem < Delivery < TransportHandlingUnit', () => {
    const builder = new DespatchBuilder();
    const input = createValidDespatchInput();
    input.shipment.goodsItem = { valueAmount: { value: 100 } };
    input.shipment.transportHandlingUnits = [{ transportEquipmentId: '34DRS001' }];
    const xml = builder.build(input);
    const goodsIdx = xml.indexOf('<cac:GoodsItem>');
    const deliveryIdx = xml.indexOf('<cac:Delivery>');
    const thuIdx = xml.indexOf('<cac:TransportHandlingUnit>');
    expect(goodsIdx).toBeGreaterThan(-1);
    expect(deliveryIdx).toBeGreaterThan(goodsIdx);
    expect(thuIdx).toBeGreaterThan(deliveryIdx);
  });
});
