/**
 * Fiili sevk anı ≥ düzenleme anı — e-İrsaliye Uygulama Kılavuzu V1.2 §10.
 *
 * ⚠️ Şematronda KARŞILIĞI YOKTUR (`DespatchDateCheck` yalnız doluluk + biçim
 * bakar). Kural kılavuz düzeyindedir, bu yüzden kapı kütüphanededir.
 */

import { describe, it, expect } from 'vitest';
import { validateDespatch } from '../../src/validators/despatch-validators';
import type { DespatchInput } from '../../src/types/despatch-input';

const CODE = 'DESPATCH_ACTUAL_BEFORE_ISSUE';

function baseInput(): DespatchInput {
  return {
    id: 'IRS2026000000001',
    uuid: 'e1a2b3c4-0001-4000-8001-000000000001',
    profileId: 'TEMELIRSALIYE' as DespatchInput['profileId'],
    despatchTypeCode: 'SEVK' as DespatchInput['despatchTypeCode'],
    issueDate: '2026-04-23',
    issueTime: '10:00:00',
    supplier: {
      vknTckn: '1234567890', taxIdType: 'VKN', name: 'Gönderici A.Ş.',
      streetName: 'Cadde 1', citySubdivisionName: 'Üsküdar', cityName: 'İstanbul',
      postalZone: '34664', country: 'Türkiye', taxOffice: 'Üsküdar',
    },
    customer: {
      vknTckn: '9876543210', taxIdType: 'VKN', name: 'Alıcı Ltd.',
      streetName: 'Cadde 2', citySubdivisionName: 'Kadıköy', cityName: 'İstanbul',
      postalZone: '34710', country: 'Türkiye', taxOffice: 'Kadıköy',
    },
    shipment: {
      actualDespatchDate: '2026-04-23',
      actualDespatchTime: '14:00:00',
      deliveryAddress: {
        streetName: 'Cadde 2', citySubdivisionName: 'Kadıköy', cityName: 'İstanbul',
        postalZone: '34710', country: 'Türkiye',
      },
      driverPersons: [{ firstName: 'Mehmet', familyName: 'Sürücü', nationalityId: '12345678901' }],
      licensePlates: [{ plateNumber: '34ABC123', schemeId: 'PLAKA' }],
    },
    lines: [{ id: '1', deliveredQuantity: 10, unitCode: 'C62', item: { name: 'Ürün' } }],
  };
}

function chronologyErrors(mutate: (i: DespatchInput) => void) {
  const input = baseInput();
  mutate(input);
  return validateDespatch(input).filter(e => e.code === CODE);
}

describe('§10 — fiili sevk anı düzenleme anından önce olamaz', () => {
  it('aynı gün, sevk saati düzenleme saatinden SONRA → geçerli', () => {
    expect(chronologyErrors(() => {})).toHaveLength(0);
  });

  it('aynı gün, aynı saat → geçerli (kılavuz "aynı olabilir" der)', () => {
    expect(chronologyErrors(i => { i.shipment.actualDespatchTime = '10:00:00'; })).toHaveLength(0);
  });

  it('ileri tarihli sevk → geçerli (kılavuz açıkça serbest bırakır)', () => {
    expect(chronologyErrors(i => { i.shipment.actualDespatchDate = '2026-04-30'; })).toHaveLength(0);
  });

  it('🔴 geri tarihli sevk → REDDEDİLİR', () => {
    const errors = chronologyErrors(i => { i.shipment.actualDespatchDate = '2026-04-20'; });
    expect(errors).toHaveLength(1);
    expect(errors[0].path).toBe('shipment.actualDespatchDate');
    expect(errors[0].message).toContain('§10');
  });

  it('🔴 aynı gün ama sevk saati düzenleme saatinden ÖNCE → REDDEDİLİR', () => {
    expect(chronologyErrors(i => { i.shipment.actualDespatchTime = '09:00:00'; })).toHaveLength(1);
  });

  it('🔴 MATBUDAN İSTİSNASI — matbu dönüşümünde geri tarih SERBEST', () => {
    // Kâğıt irsaliyenin GEÇMİŞTE gerçekleşmiş sevki sonradan e-belgeye geçirilir;
    // kılavuzun "istisnai haller" dediği yer burasıdır.
    const errors = chronologyErrors(i => {
      i.despatchTypeCode = 'MATBUDAN' as DespatchInput['despatchTypeCode'];
      i.shipment.actualDespatchDate = '2026-04-20';
      i.shipment.actualDespatchTime = '09:00:00';
      i.additionalDocuments = [{ id: 'M-1', issueDate: '2026-04-20', documentType: 'MATBU' }];
    });
    expect(errors).toHaveLength(0);
  });

  it('biçimi bozuk tarihte İKİNCİ (yanıltıcı) hata üretmez — biçim hatası zaten var', () => {
    const input = baseInput();
    input.shipment.actualDespatchDate = '20.04.2026';
    const errors = validateDespatch(input);
    expect(errors.filter(e => e.code === CODE)).toHaveLength(0);
    expect(errors.some(e => e.path === 'shipment.actualDespatchDate')).toBe(true);
  });

  it('saat biçimi bozukken AYNI GÜN karşılaştırması yapılmaz (tarih tek başına karar veremez)', () => {
    expect(chronologyErrors(i => { i.shipment.actualDespatchTime = '9:00'; })).toHaveLength(0);
  });

  it('saat bozuk olsa da FARKLI ve geri gün yine reddedilir', () => {
    expect(chronologyErrors(i => {
      i.shipment.actualDespatchTime = '9:00';
      i.shipment.actualDespatchDate = '2026-04-20';
    })).toHaveLength(1);
  });
});
