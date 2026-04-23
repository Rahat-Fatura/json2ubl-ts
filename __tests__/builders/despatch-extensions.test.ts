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
        nationalityId: 'TR',
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
