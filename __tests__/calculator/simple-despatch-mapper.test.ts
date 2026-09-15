/**
 * SimpleDespatchInput → DespatchInput eşleyici testleri.
 *
 * Fatura emsali `simple-invoice-mapper.test.ts`; buradaki iddialar aynı soruları
 * irsaliye için sorar: tarih/saat bölünmesi, varsayılanlar, taraf çevrimi ve
 * `Simple*` katmanında var olan HER alanın ham katmanda bir karşılığı olduğu.
 */

import { describe, it, expect } from 'vitest';
import { mapSimpleToDespatchInput } from '../../src/calculator/simple-despatch-mapper';
import { mapSimpleParty } from '../../src/utils/party-mapper';
import type { SimpleDespatchInput } from '../../src/calculator/simple-despatch-types';

function baseInput(overrides: Partial<SimpleDespatchInput> = {}): SimpleDespatchInput {
  return {
    id: 'IRS2026000000001',
    uuid: 'e1a2b3c4-0001-4000-8001-000000000001',
    datetime: '2026-04-23T10:00:00',
    sender: {
      taxNumber: '1234567890',
      name: 'Gönderici A.Ş.',
      address: 'Barbaros Bulvarı No:123',
      district: 'Üsküdar',
      city: 'İstanbul',
      zipCode: '34664',
      taxOffice: 'Üsküdar',
    },
    customer: {
      taxNumber: '9876543210',
      name: 'Alıcı Ltd. Şti.',
      address: 'Bağdat Caddesi No:456',
      district: 'Kadıköy',
      city: 'İstanbul',
      zipCode: '34710',
      taxOffice: 'Kadıköy',
    },
    shipment: {
      actualDespatchDatetime: '2026-04-23T14:00:00',
      deliveryAddress: {
        address: 'Bağdat Caddesi No:456',
        district: 'Kadıköy',
        city: 'İstanbul',
        zipCode: '34710',
      },
      drivers: [{ firstName: 'Mehmet', familyName: 'Sürücü', nationalityId: '12345678901' }],
      licensePlates: [{ value: '34ABC123' }],
    },
    lines: [{ name: 'Standart Ürün', quantity: 10, unitCode: 'Adet' }],
    ...overrides,
  };
}

describe('mapSimpleToDespatchInput — tarih/saat bölünmesi', () => {
  it('datetime tek alanını issueDate + issueTime ikilisine böler', () => {
    const out = mapSimpleToDespatchInput(baseInput());
    expect(out.issueDate).toBe('2026-04-23');
    expect(out.issueTime).toBe('10:00:00');
  });

  it('actualDespatchDatetime tek alanını tarih + saate böler', () => {
    const out = mapSimpleToDespatchInput(baseInput());
    expect(out.shipment.actualDespatchDate).toBe('2026-04-23');
    expect(out.shipment.actualDespatchTime).toBe('14:00:00');
  });

  it('datetime verilmezse DÜZENLEME anı "şimdi" olur (fatura ile aynı sözleşme)', () => {
    const out = mapSimpleToDespatchInput(baseInput({ datetime: undefined }));
    expect(out.issueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(out.issueTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('🔴 FİİLİ SEVK anı verilmezse UYDURULMAZ — boş kalır, doğrulayıcı bildirir', () => {
    /* Düzenleme anı "şimdi"dir çünkü belge şu an düzenleniyor. Fiili sevk anı ise
     * dış dünyaya ait bir olgudur; bilinmiyorken "şimdi" yazmak belgeye gerçek
     * olmayan veri koymaktır (posta kodu '00000' ile aynı hata sınıfı). */
    const input = baseInput();
    input.shipment.actualDespatchDatetime = '';
    const out = mapSimpleToDespatchInput(input);
    expect(out.shipment.actualDespatchDate).toBe('');
    expect(out.shipment.actualDespatchTime).toBe('');
  });
});

describe('mapSimpleToDespatchInput — varsayılanlar ve tip/profil', () => {
  it('type/profil verilmezse SEVK + TEMELIRSALIYE varsayar', () => {
    const out = mapSimpleToDespatchInput(baseInput({ type: undefined, profile: undefined }));
    expect(out.despatchTypeCode).toBe('SEVK');
    expect(out.profileId).toBe('TEMELIRSALIYE');
  });

  it('düz string tip/profil ham enum alanına taşınır (nominal enum GEREKMEZ)', () => {
    const out = mapSimpleToDespatchInput(baseInput({ type: 'MATBUDAN', profile: 'HKSIRSALIYE' }));
    expect(out.despatchTypeCode).toBe('MATBUDAN');
    expect(out.profileId).toBe('HKSIRSALIYE');
  });

  it('tanınmayan tip/profil değerinde ATMAZ — reddi doğrulayıcıya bırakır', () => {
    // Fatura emsali: mapper `calc.profile as InvoiceProfileId` ile cast eder,
    // whitelist kontrolü validator'dadır. Tek istisna yerine TÜM hataları
    // yol bilgisiyle toplayabilmek için.
    const out = mapSimpleToDespatchInput(baseInput({ type: 'HAYALET' }));
    expect(out.despatchTypeCode).toBe('HAYALET');
  });

  it('uuid verilmezse üretilir', () => {
    const out = mapSimpleToDespatchInput(baseInput({ uuid: undefined }));
    expect(out.uuid).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('id verilmezse boş string — numaratör çağıranın işidir', () => {
    expect(mapSimpleToDespatchInput(baseInput({ id: undefined })).id).toBe('');
  });
});

describe('mapSimpleToDespatchInput — sevkiyat', () => {
  it('drivers → driverPersons', () => {
    const out = mapSimpleToDespatchInput(baseInput());
    expect(out.shipment.driverPersons).toEqual([
      { firstName: 'Mehmet', familyName: 'Sürücü', nationalityId: '12345678901' },
    ]);
  });

  it('licensePlates şeması verilmezse PLAKA varsayar', () => {
    const out = mapSimpleToDespatchInput(baseInput());
    expect(out.shipment.licensePlates).toEqual([{ plateNumber: '34ABC123', schemeId: 'PLAKA' }]);
  });

  it('verilen plaka şemasını korur', () => {
    const input = baseInput();
    input.shipment.licensePlates = [{ value: '34XYZ99', scheme: 'DORSEPLAKA' }];
    const out = mapSimpleToDespatchInput(input);
    expect(out.shipment.licensePlates?.[0].schemeId).toBe('DORSEPLAKA');
  });

  /* 🔴 BU TEST ESKİDEN KUSURU ÇİVİLİYORDU: girdi adresi taşıyor, beklenen çıktı
     ADRESSİZDİ. Taşıyıcı kendi dar eşleyicisinden geçtiği için adres atılıyor,
     `cac:PostalAddress` hiç basılamıyor ve GİB belgeyi reddediyordu. Artık taraf
     dönüşümü ORTAK `mapSimpleParty`den geçer — dosya başındaki "Taraf dönüşümü
     ORTAK, kopyalanmaz" kuralının tek istisnası kapandı. */
  it('carrier → carrierParty ORTAK eşleyiciden geçer; adres KORUNUR', () => {
    const input = baseInput();
    input.shipment.carrier = {
      taxNumber: '1112223334',
      name: 'Nakliyeci A.Ş.',
      address: 'Liman Cad. 5',
      district: 'Konak',
      city: 'İzmir',
    };
    const out = mapSimpleToDespatchInput(input);
    expect(out.shipment.carrierParty).toEqual(mapSimpleParty(input.shipment.carrier));
    expect(out.shipment.carrierParty).toMatchObject({
      vknTckn: '1112223334',
      taxIdType: 'VKN',
      name: 'Nakliyeci A.Ş.',
      streetName: 'Liman Cad. 5',
      citySubdivisionName: 'Konak',
      cityName: 'İzmir',
    });
  });

  /* ── Dorse plakası: B-49 kanonik yol ──────────────────────────────────────
     `cac:RoadTransport` XSD'de TEK `cbc:LicensePlateID` kabul eder; dorse ikinci
     satır olarak YAZILAMAZ. Simple katmanı ham katmanda zaten var olan
     `transportHandlingUnits` yolunu açar. */
  it('trailerPlates → transportHandlingUnits; varsayılan şema DORSEPLAKA', () => {
    const input = baseInput();
    input.shipment.trailerPlates = [{ value: '34DEF456' }];
    const out = mapSimpleToDespatchInput(input);
    expect(out.shipment.transportHandlingUnits).toEqual([
      { transportEquipmentId: '34DEF456', schemeId: 'DORSEPLAKA' },
    ]);
  });

  it('trailerPlates çekici plakasına KARIŞMAZ — licensePlates tek kalır', () => {
    const input = baseInput();
    input.shipment.licensePlates = [{ value: '34ABC123', scheme: 'PLAKA' }];
    input.shipment.trailerPlates = [{ value: '34DEF456', scheme: 'DORSE' }];
    const out = mapSimpleToDespatchInput(input);
    expect(out.shipment.licensePlates).toHaveLength(1);
    expect(out.shipment.transportHandlingUnits?.[0].schemeId).toBe('DORSE');
  });

  it('trailerPlates verilmezse transportHandlingUnits HİÇ doğmaz', () => {
    const out = mapSimpleToDespatchInput(baseInput());
    expect(out.shipment.transportHandlingUnits).toBeUndefined();
  });

  it('carrier TCKN ise ad/soyad ORTAK bölme kuralından geçer', () => {
    const input = baseInput();
    input.shipment.carrier = {
      taxNumber: '12345678901',
      name: 'Hasan Taşıyıcı',
      address: 'Liman Cad. 5',
      district: 'Konak',
      city: 'İzmir',
    };
    const out = mapSimpleToDespatchInput(input);
    expect(out.shipment.carrierParty).toMatchObject({
      taxIdType: 'TCKN',
      firstName: 'Hasan',
      familyName: 'Taşıyıcı',
    });
  });

  it('🔑 düzleştirilmiş goodsValue → goodsItem.valueAmount (para birimi varsayılanı TRY)', () => {
    const input = baseInput();
    input.shipment.goodsValue = 1250.5;
    const out = mapSimpleToDespatchInput(input);
    expect(out.shipment.goodsItem).toEqual({
      valueAmount: { value: 1250.5, currencyId: 'TRY' },
    });
  });

  it('goodsValue verilmezse goodsItem hiç açılmaz', () => {
    expect(mapSimpleToDespatchInput(baseInput()).shipment.goodsItem).toBeUndefined();
  });

  it('teslimat adresi ülkesi verilmezse Türkiye varsayar', () => {
    expect(mapSimpleToDespatchInput(baseInput()).shipment.deliveryAddress.country).toBe('Türkiye');
  });
});

describe('mapSimpleToDespatchInput — kalemler', () => {
  it('satır numarasını 1\'den başlayarak indeksten türetir', () => {
    const out = mapSimpleToDespatchInput(baseInput({
      lines: [
        { name: 'A', quantity: 1, unitCode: 'C62' },
        { name: 'B', quantity: 2, unitCode: 'C62' },
      ],
    }));
    expect(out.lines.map(l => l.id)).toEqual(['1', '2']);
  });

  it('quantity → deliveredQuantity', () => {
    expect(mapSimpleToDespatchInput(baseInput()).lines[0].deliveredQuantity).toBe(10);
  });

  it('ek kimlikleri scheme/value → schemeId/value taşır', () => {
    const out = mapSimpleToDespatchInput(baseInput({
      lines: [{
        name: 'Künyeli Ürün',
        quantity: 1,
        unitCode: 'C62',
        additionalIdentifications: [{ scheme: 'KUNYENO', value: '1234567890123456789' }],
      }],
    }));
    expect(out.lines[0].item.additionalItemIdentifications).toEqual([
      { schemeId: 'KUNYENO', value: '1234567890123456789' },
    ]);
  });

  it('B-102: description ve note ham katmana BAĞLANIR (sessizce düşmez)', () => {
    const out = mapSimpleToDespatchInput(baseInput({
      lines: [{
        name: 'Ürün', quantity: 1, unitCode: 'C62',
        description: 'Kırılacak eşya', note: 'Üst üste konmasın',
      }],
    }));
    expect(out.lines[0].item.description).toBe('Kırılacak eşya');
    expect(out.lines[0].note).toBe('Üst üste konmasın');
  });
});

describe('mapSimpleToDespatchInput — referanslar ve taraflar', () => {
  it('sipariş referansı tarihsizse belgenin tarihi yedektir (XSD IssueDate 1..1)', () => {
    const out = mapSimpleToDespatchInput(baseInput({
      orderReferences: [{ id: 'SIP-1' }, { id: 'SIP-2', issueDate: '2026-04-01' }],
    }));
    expect(out.orderReferences).toEqual([
      { id: 'SIP-1', issueDate: '2026-04-23' },
      { id: 'SIP-2', issueDate: '2026-04-01' },
    ]);
  });

  it('MATBUDAN\'da ek belgeye DocumentType="MATBU" SABİTİ yazılır (kılavuz V1.2)', () => {
    const out = mapSimpleToDespatchInput(baseInput({
      type: 'MATBUDAN',
      additionalDocuments: [{ id: 'A-1', issueDate: '2026-04-20', description: 'Matbu irsaliye' }],
    }));
    expect(out.additionalDocuments?.[0]).toMatchObject({
      id: 'A-1',
      issueDate: '2026-04-20',
      documentType: 'MATBU',
      documentDescription: 'Matbu irsaliye',
    });
  });

  it('SEVK\'te ek belgeye MATBU sabiti YAZILMAZ', () => {
    const out = mapSimpleToDespatchInput(baseInput({
      additionalDocuments: [{ id: 'A-1', issueDate: '2026-04-20' }],
    }));
    expect(out.additionalDocuments?.[0].documentType).toBeUndefined();
  });

  it('opsiyonel üç taraf (buyerCustomer/sellerSupplier/originator) ortak eşleyiciden geçer', () => {
    const extraParty = {
      taxNumber: '5556667778',
      name: 'Üçüncü Taraf A.Ş.',
      address: 'Adres',
      district: 'İlçe',
      city: 'İl',
    };
    const out = mapSimpleToDespatchInput(baseInput({
      buyerCustomer: extraParty,
      sellerSupplier: extraParty,
      originator: extraParty,
    }));
    expect(out.buyerCustomer?.vknTckn).toBe('5556667778');
    expect(out.sellerSupplier?.name).toBe('Üçüncü Taraf A.Ş.');
    expect(out.originator?.taxIdType).toBe('VKN');
  });

  it('opsiyonel taraflar verilmezse alanlar hiç açılmaz', () => {
    const out = mapSimpleToDespatchInput(baseInput());
    expect(out.buyerCustomer).toBeUndefined();
    expect(out.sellerSupplier).toBeUndefined();
    expect(out.originator).toBeUndefined();
    expect(out.additionalDocuments).toBeUndefined();
    expect(out.orderReferences).toBeUndefined();
  });

  it('despatchContactName taşınır', () => {
    const out = mapSimpleToDespatchInput(baseInput({ despatchContactName: 'Teslim Eden Kişi' }));
    expect(out.despatchContactName).toBe('Teslim Eden Kişi');
  });
});
