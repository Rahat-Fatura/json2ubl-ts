import { describe, it, expect } from 'vitest';
import { validateDespatch } from '../../src/validators/despatch-validators';
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

describe('despatch-validators — O3 whitelist runtime', () => {
  it('geçerli ProfileID kabul eder', () => {
    const input = createValidDespatchInput();
    const errors = validateDespatch(input);
    expect(errors.filter(e => e.path === 'profileId')).toHaveLength(0);
  });

  it('geçersiz ProfileID reddedilir', () => {
    const input = createValidDespatchInput();
    // @ts-expect-error test: invalid enum value
    input.profileId = 'INVALIDPROFILE';
    const errors = validateDespatch(input);
    const profileErr = errors.find(e => e.path === 'profileId');
    expect(profileErr).toBeDefined();
    expect(profileErr?.code).toBe('INVALID_FORMAT');
  });

  it('geçerli DespatchTypeCode kabul eder', () => {
    const input = createValidDespatchInput();
    const errors = validateDespatch(input);
    expect(errors.filter(e => e.path === 'despatchTypeCode')).toHaveLength(0);
  });

  it('geçersiz DespatchTypeCode reddedilir', () => {
    const input = createValidDespatchInput();
    // @ts-expect-error test: invalid enum value
    input.despatchTypeCode = 'INVALIDTYPE';
    const errors = validateDespatch(input);
    const typeErr = errors.find(e => e.path === 'despatchTypeCode');
    expect(typeErr).toBeDefined();
    expect(typeErr?.code).toBe('INVALID_FORMAT');
  });
});

describe('despatch-validators — O4 DespatchLineId numeric', () => {
  it('numerik ID kabul eder', () => {
    const input = createValidDespatchInput();
    input.lines = [
      { id: '1', deliveredQuantity: 5, unitCode: 'C62', item: { name: 'A' } },
      { id: '42', deliveredQuantity: 3, unitCode: 'C62', item: { name: 'B' } },
    ];
    const errors = validateDespatch(input);
    expect(errors.filter(e => e.path?.startsWith('lines[') && e.path.endsWith('.id'))).toHaveLength(0);
  });

  it('numerik olmayan ID reddedilir', () => {
    const input = createValidDespatchInput();
    input.lines[0].id = 'LINE-001';
    const errors = validateDespatch(input);
    const err = errors.find(e => e.path === 'lines[0].id');
    expect(err).toBeDefined();
    expect(err?.code).toBe('INVALID_FORMAT');
  });
});

describe('despatch-validators — O7 MATBUDAN + DocumentType cross-check', () => {
  it('MATBUDAN + documentType="MATBU" kabul eder', () => {
    const input = createValidDespatchInput();
    input.despatchTypeCode = DespatchTypeCode.MATBUDAN;
    input.additionalDocuments = [{
      id: 'DOC-001',
      issueDate: '2024-01-01',
      documentType: 'MATBU',
    }];
    const errors = validateDespatch(input);
    expect(errors.filter(e => e.path?.includes('additionalDocuments'))).toHaveLength(0);
  });

  it('MATBUDAN + documentType eksik reddedilir', () => {
    const input = createValidDespatchInput();
    input.despatchTypeCode = DespatchTypeCode.MATBUDAN;
    input.additionalDocuments = [{
      id: 'DOC-001',
      issueDate: '2024-01-01',
      // documentType yok
    }];
    const errors = validateDespatch(input);
    const err = errors.find(e => e.path === 'additionalDocuments.documentType');
    expect(err).toBeDefined();
    expect(err?.code).toBe('PROFILE_REQUIREMENT');
  });

  it('MATBUDAN + documentType="DIGER" reddedilir', () => {
    const input = createValidDespatchInput();
    input.despatchTypeCode = DespatchTypeCode.MATBUDAN;
    input.additionalDocuments = [{
      id: 'DOC-001',
      issueDate: '2024-01-01',
      documentType: 'DIGER',
    }];
    const errors = validateDespatch(input);
    const err = errors.find(e => e.path === 'additionalDocuments.documentType');
    expect(err).toBeDefined();
  });

  it('SEVK + documentType yok kabul eder (MATBUDAN olmayan)', () => {
    const input = createValidDespatchInput();
    // default SEVK
    input.additionalDocuments = undefined;
    const errors = validateDespatch(input);
    expect(errors.filter(e => e.path?.includes('additionalDocuments'))).toHaveLength(0);
  });
});

describe('despatch-validators — B-104 DriverPerson nationalityId TCKN (11-hane)', () => {
  it('B-104: geçerli 11-hane TCKN kabul eder', () => {
    const input = createValidDespatchInput();
    input.shipment.driverPersons = [{
      firstName: 'Mehmet',
      familyName: 'Kara',
      nationalityId: '12345678901',
    }];
    const errors = validateDespatch(input);
    expect(errors.filter(e => e.path?.endsWith('.nationalityId'))).toHaveLength(0);
  });

  it('B-104: nationalityId="TR" (ISO kodu) reddedilir', () => {
    const input = createValidDespatchInput();
    input.shipment.driverPersons = [{
      firstName: 'Mehmet',
      familyName: 'Kara',
      nationalityId: 'TR',
    }];
    const errors = validateDespatch(input);
    const err = errors.find(e => e.path === 'shipment.driverPersons[0].nationalityId');
    expect(err).toBeDefined();
    expect(err?.code).toBe('INVALID_FORMAT');
  });
});
