import { describe, it, expect } from 'vitest';
import { validateDespatch } from '../../src/validators/despatch-validators';
import { DespatchProfileId, DespatchTypeCode } from '../../src/types/enums';
import {
  LICENSE_PLATE_SCHEME_IDS,
  TR_LICENSE_PLATE_REGEX,
  FOREIGN_LICENSE_PLATE_REGEX,
} from '../../src/config/constants';
import type { DespatchInput, LicensePlateInput } from '../../src/types/despatch-input';

/**
 * Sprint 9 — Schematron 20260701 plaka kuralları (History.txt md.5, 10, 14).
 *
 * - `LicensePlateIDSchemeIDType`: 2 → 6 değer
 * - `LicensePlateIDSchemeIDCheck`: TR / yabancı plaka format assert'leri eklendi
 * - `LicensePlateIDCheck` (YENİ): irsaliyede LicensePlateID ZORUNLU
 *
 * Kapsam notu: kurallar yalnız
 * `desp:DespatchAdvice/cac:Shipment/cac:ShipmentStage/cac:TransportMeans/cac:RoadTransport/cbc:LicensePlateID`
 * context'ine bağlı. TransportHandlingUnit/TransportEquipment/ID (B-49 DORSEPLAKA
 * yolu) Main Schematron'da bu kurallara extends edilmemiş — kapsam dışı.
 */

function createValidInput(plates?: LicensePlateInput[]): DespatchInput {
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
      driverPersons: [{ firstName: 'M', familyName: 'K', nationalityId: '12345678901' }],
      licensePlates: plates ?? [{ plateNumber: '34ABC123', schemeId: 'PLAKA' }],
    },
    lines: [{ id: '1', deliveredQuantity: 10, unitCode: 'C62', item: { name: 'X' } }],
  };
}

const plateErrors = (input: DespatchInput) =>
  validateDespatch(input).filter(e => e.path?.includes('licensePlate'));

// ============================================================
// schemeID seti — 2 → 6
// ============================================================

describe('Sprint 9 — LicensePlateIDSchemeIDType 6 değere genişledi', () => {
  const expected = [
    'PLAKA', 'DORSE', 'DORSEPLAKA',
    'YABANCIPLAKA', 'YABANCIDORSE', 'YABANCIDORSEPLAKA',
  ];

  it('sabit tam 6 değer içeriyor', () => {
    expect(LICENSE_PLATE_SCHEME_IDS).toEqual(new Set(expected));
  });

  for (const schemeId of ['PLAKA', 'DORSE', 'DORSEPLAKA'] as const) {
    it(`${schemeId} + geçerli TR plaka → kabul`, () => {
      const errors = plateErrors(createValidInput([{ plateNumber: '34ABC123', schemeId }]));
      expect(errors).toEqual([]);
    });
  }

  for (const schemeId of ['YABANCIPLAKA', 'YABANCIDORSE', 'YABANCIDORSEPLAKA'] as const) {
    it(`${schemeId} + yabancı plaka → kabul`, () => {
      const errors = plateErrors(createValidInput([{ plateNumber: 'DE-AB-1234', schemeId }]));
      expect(errors).toEqual([]);
    });
  }

  it('bilinmeyen schemeID → reddedilir', () => {
    const input = createValidInput([{ plateNumber: '34ABC123', schemeId: 'ROMORK' as any }]);
    const errors = plateErrors(input);
    expect(errors.some(e => e.path === 'shipment.licensePlates[0].schemeId')).toBe(true);
  });

  it('geçersiz schemeID tek plakaysa zorunluluk da sağlanmıyor', () => {
    // Schematron LicensePlateIDCheck geçerli schemeID'li plaka arar —
    // geçersiz schemeID'li kayıt zorunluluğu karşılamaz.
    const input = createValidInput([{ plateNumber: '34ABC123', schemeId: 'ROMORK' as any }]);
    const errors = validateDespatch(input);
    expect(errors.some(e => e.code === 'DESPATCH_LICENSE_PLATE_REQUIRED')).toBe(true);
  });
});

// ============================================================
// TR plaka format regex
// ============================================================

describe('Sprint 9 — TR plaka format regex', () => {
  const valid = ['34ABC123', '01A1', '81Z9999', '06BBB1', '34DRS456', '07AB1234'];
  const invalid = [
    '00ABC123',   // il kodu 00
    '82ABC123',   // il kodu 82 (>81)
    '3ABC123',    // tek haneli il kodu
    '34abc123',   // küçük harf
    '34123ABC',   // rakam-harf sırası ters
    '34ABC',      // rakam yok
    '34-ABC-123', // ayraç
    'ABC34123',   // harfle başlıyor
    '',           // boş
  ];

  for (const p of valid) {
    it(`${p} geçerli`, () => expect(TR_LICENSE_PLATE_REGEX.test(p)).toBe(true));
  }
  for (const p of invalid) {
    it(`${JSON.stringify(p)} geçersiz`, () => expect(TR_LICENSE_PLATE_REGEX.test(p)).toBe(false));
  }

  it('PLAKA + geçersiz TR plaka → reddedilir', () => {
    const errors = plateErrors(createValidInput([{ plateNumber: '82ABC123', schemeId: 'PLAKA' }]));
    expect(errors).toHaveLength(1);
    expect(errors[0].path).toBe('shipment.licensePlates[0].plateNumber');
  });

  it('DORSEPLAKA da TR regex\'ine tabi', () => {
    const errors = plateErrors(createValidInput([{ plateNumber: '34abc123', schemeId: 'DORSEPLAKA' }]));
    expect(errors).toHaveLength(1);
  });
});

// ============================================================
// Yabancı plaka format regex
// ============================================================

describe('Sprint 9 — yabancı plaka format regex', () => {
  it('yabancı plaka TR regex\'ine takılmıyor', () => {
    expect(TR_LICENSE_PLATE_REGEX.test('DE-AB-1234')).toBe(false);
    expect(FOREIGN_LICENSE_PLATE_REGEX.test('DE-AB-1234')).toBe(true);
  });

  const valid = ['DE-AB-1234', 'ABC_123', 'XYZ999', '34ABC123'];
  const invalid = ['de-ab-1234', 'AB CD 12', 'ÄBÇ123', ''];

  for (const p of valid) {
    it(`${p} geçerli`, () => expect(FOREIGN_LICENSE_PLATE_REGEX.test(p)).toBe(true));
  }
  for (const p of invalid) {
    it(`${JSON.stringify(p)} geçersiz`, () => expect(FOREIGN_LICENSE_PLATE_REGEX.test(p)).toBe(false));
  }

  it('YABANCIPLAKA + boşluklu değer → reddedilir', () => {
    const errors = plateErrors(createValidInput([{ plateNumber: 'AB CD 12', schemeId: 'YABANCIPLAKA' }]));
    expect(errors).toHaveLength(1);
  });
});

// ============================================================
// LicensePlateIDCheck — plaka ZORUNLU
// ============================================================

describe('Sprint 9 — LicensePlateIDCheck: irsaliyede plaka zorunlu', () => {
  it('licensePlates hiç yok → reddedilir', () => {
    const input = createValidInput();
    delete input.shipment!.licensePlates;
    const errors = validateDespatch(input);
    expect(errors.some(e => e.code === 'DESPATCH_LICENSE_PLATE_REQUIRED')).toBe(true);
  });

  it('licensePlates boş dizi → reddedilir', () => {
    const errors = validateDespatch(createValidInput([]));
    expect(errors.some(e => e.code === 'DESPATCH_LICENSE_PLATE_REQUIRED')).toBe(true);
  });

  it('plateNumber boş string → zorunluluk sağlanmıyor', () => {
    const errors = validateDespatch(createValidInput([{ plateNumber: '  ', schemeId: 'PLAKA' }]));
    expect(errors.some(e => e.code === 'DESPATCH_LICENSE_PLATE_REQUIRED')).toBe(true);
  });

  it('geçerli plaka var → zorunluluk hatası yok', () => {
    const errors = validateDespatch(createValidInput());
    expect(errors.some(e => e.code === 'DESPATCH_LICENSE_PLATE_REQUIRED')).toBe(false);
  });

  it('MATBUDAN irsaliyede de zorunlu', () => {
    const input = createValidInput([]);
    input.despatchTypeCode = DespatchTypeCode.MATBUDAN;
    input.additionalDocuments = [{ id: 'M-1', issueDate: '2024-01-01', documentType: 'MATBU' }];
    const errors = validateDespatch(input);
    expect(errors.some(e => e.code === 'DESPATCH_LICENSE_PLATE_REQUIRED')).toBe(true);
  });
});
