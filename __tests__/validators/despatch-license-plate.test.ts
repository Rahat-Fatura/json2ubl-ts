import { describe, it, expect } from 'vitest';
import { validateDespatch } from '../../src/documents/despatch-advice/validators';
import { DespatchProfileId, DespatchTypeCode } from '../../src/types/enums';
import {
  LICENSE_PLATE_SCHEME_IDS,
  TR_LICENSE_PLATE_REGEX,
  FOREIGN_LICENSE_PLATE_REGEX,
} from '../../src/ubltr/vocabulary/constants';
import type { DespatchInput, LicensePlateInput } from '../../src/types/despatch-input';

/**
 * Plaka kuralları — Sprint 9 (Schematron 20260701, History.txt md.5, 10, 14) ve
 * GİB paketi 24.08.2026 (T-KOD-9).
 *
 * - `LicensePlateIDSchemeIDType`: 20260701'de 6 değerdi; 24.08.2026 paketinde
 *   yalnız `PLAKA`, `YABANCIPLAKA` (`UBL-TR_Codelist.xml:37`).
 * - `LicensePlateIDSchemeIDCheck`: TR / yabancı plaka format assert'leri
 * - `LicensePlateIDCheck`: kütüphanede plaka her irsaliyede ZORUNLU
 *
 * Kapsam notu: bu kurallar yalnız
 * `desp:DespatchAdvice/cac:Shipment/cac:ShipmentStage/cac:TransportMeans/cac:RoadTransport/cbc:LicensePlateID`
 * context'ine bağlı. `TransportHandlingUnit/TransportEquipment/cbc:ID` (B-49 dorse
 * yolu) ayrı kümeye tabidir: `$TransportEquipmentIDSchemeIDType`
 * (`UBL-TR_Codelist.xml:38`), kural `TransportEquipmentIDSchemeIDCheck`.
 */

/** `$TransportEquipmentIDSchemeIDType` — `UBL-TR_Codelist.xml:38`, yalnız dorse düğümünde geçerli. */
const TRAILER_SCHEME_IDS = ['DORSE', 'DORSEPLAKA', 'YABANCIDORSE', 'YABANCIDORSEPLAKA'] as const;

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
// schemeID seti — paket 24.08.2026: çekici plakası yalnız 2 değer
// ============================================================

describe('GİB 24.08.2026 — LicensePlateIDSchemeIDType yalnız PLAKA ve YABANCIPLAKA', () => {
  it('sabit tam 2 değer içeriyor', () => {
    expect(LICENSE_PLATE_SCHEME_IDS).toEqual(new Set(['PLAKA', 'YABANCIPLAKA']));
  });

  it('PLAKA + geçerli TR plaka → kabul', () => {
    const errors = plateErrors(createValidInput([{ plateNumber: '34ABC123', schemeId: 'PLAKA' }]));
    expect(errors).toEqual([]);
  });

  it('YABANCIPLAKA + yabancı plaka → kabul', () => {
    const errors = plateErrors(createValidInput([{ plateNumber: 'DE-AB-1234', schemeId: 'YABANCIPLAKA' }]));
    expect(errors).toEqual([]);
  });

  /* GT-03: GİB TEST, çekici plakasında dorse şeması taşıyan belgeyi 1150 ile
   * reddediyor. Hem TR hem yabancı biçimli değer aynı şekilde reddedilir:
   * şema geçersizse biçim regex'i hiç seçilmez. */
  for (const schemeId of TRAILER_SCHEME_IDS) {
    for (const plateNumber of ['34ABC123', 'DE-AB-1234']) {
      it(`${schemeId} çekici plakasında (${plateNumber}) → reddedilir`, () => {
        const errors = plateErrors(createValidInput([{ plateNumber, schemeId: schemeId as never }]));
        expect(errors.some(e => e.path === 'shipment.licensePlates[0].schemeId')).toBe(true);
      });
    }

    it(`${schemeId} tek çekici plakasıysa plaka zorunluluğunu karşılamaz`, () => {
      const errors = validateDespatch(createValidInput([{ plateNumber: '34ABC123', schemeId: schemeId as never }]));
      expect(errors.some(e => e.code === 'DESPATCH_LICENSE_PLATE_REQUIRED')).toBe(true);
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
// Dorse düğümü — çekici kümesi buna uygulanmaz
// ============================================================

describe('Dorse düğümü — TransportEquipment/cbc:ID şemaları değişmedi', () => {
  for (const schemeId of TRAILER_SCHEME_IDS) {
    it(`${schemeId} dorse düğümünde → hata yok`, () => {
      const input = createValidInput();
      input.shipment!.transportHandlingUnits = [{ transportEquipmentId: '34DRS456', schemeId }];
      const errors = validateDespatch(input).filter(
        e => e.path?.includes('licensePlate') || e.path?.includes('transportHandlingUnits'),
      );
      expect(errors).toEqual([]);
    });
  }
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
