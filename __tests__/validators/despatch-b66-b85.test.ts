import { describe, it, expect } from 'vitest';
import { validateDespatch, validateCarrierParty } from '../../src/validators/despatch-validators';
import { DespatchProfileId, DespatchTypeCode } from '../../src/types/enums';
import type { DespatchInput } from '../../src/types/despatch-input';

function createValidMatbudanInput(): DespatchInput {
  return {
    id: 'ABC2024000000001',
    uuid: '12345678-1234-1234-1234-123456789012',
    profileId: DespatchProfileId.TEMELIRSALIYE,
    despatchTypeCode: DespatchTypeCode.MATBUDAN,
    issueDate: '2024-01-15',
    issueTime: '10:30:00',
    supplier: { vknTckn: '1234567890', taxIdType: 'VKN', name: 'Sender',
      cityName: 'İstanbul', citySubdivisionName: 'Kadıköy', country: 'Türkiye' },
    customer: { vknTckn: '0987654321', taxIdType: 'VKN', name: 'Receiver',
      cityName: 'Ankara', citySubdivisionName: 'Çankaya', country: 'Türkiye' },
    shipment: {
      actualDespatchDate: '2024-01-15',
      actualDespatchTime: '14:00:00',
      deliveryAddress: {
        citySubdivisionName: 'Çankaya', cityName: 'Ankara',
        postalZone: '06100', country: 'Türkiye',
      },
      driverPersons: [{ firstName: 'M', familyName: 'K', nationalityId: '12345678901' }],
    },
    lines: [{ id: '1', deliveredQuantity: 10, unitCode: 'C62', item: { name: 'X' } }],
    additionalDocuments: [{
      id: 'MATBU-001', issueDate: '2024-01-01', documentType: 'MATBU',
    }],
  };
}

describe('despatch-validators — B-66 MATBUDAN ID+IssueDate zorunluluğu', () => {
  it('B-66: MATBUDAN AdditionalDocument.id boş → reddedilir', () => {
    const input = createValidMatbudanInput();
    input.additionalDocuments = [{ id: '', issueDate: '2024-01-01', documentType: 'MATBU' }];
    const errors = validateDespatch(input);
    expect(errors.some(e => e.path === 'additionalDocuments[0].id')).toBe(true);
  });

  it('B-66: MATBUDAN AdditionalDocument.issueDate boş → reddedilir', () => {
    const input = createValidMatbudanInput();
    input.additionalDocuments = [{ id: 'M-1', issueDate: '', documentType: 'MATBU' }];
    const errors = validateDespatch(input);
    expect(errors.some(e => e.path === 'additionalDocuments[0].issueDate')).toBe(true);
  });

  it('B-66: MATBUDAN issueDate geçersiz format → reddedilir', () => {
    const input = createValidMatbudanInput();
    input.additionalDocuments = [{ id: 'M-1', issueDate: '01-01-2024', documentType: 'MATBU' }];
    const errors = validateDespatch(input);
    expect(errors.some(e => e.path === 'additionalDocuments[0].issueDate'
      && e.code === 'INVALID_FORMAT')).toBe(true);
  });

  it('B-66: Geçerli MATBUDAN → hata yok', () => {
    const errors = validateDespatch(createValidMatbudanInput());
    expect(errors.filter(e => e.path?.startsWith('additionalDocuments'))).toHaveLength(0);
  });
});

describe('despatch-validators — B-85 CarrierParty VKN/TCKN + schemeID whitelist', () => {
  it('B-85: validateCarrierParty — VKN 9 hane → reddedilir', () => {
    const errors = validateCarrierParty(
      { vknTckn: '123456789', taxIdType: 'VKN', name: 'Taşıyıcı' },
      'shipment.carrierParty',
    );
    expect(errors.some(e => e.path === 'shipment.carrierParty.vknTckn'
      && e.code === 'INVALID_FORMAT')).toBe(true);
  });

  it('B-85: validateCarrierParty — TCKN 10 hane → reddedilir', () => {
    const errors = validateCarrierParty(
      { vknTckn: '1234567890', taxIdType: 'TCKN' },
      'shipment.carrierParty',
    );
    expect(errors.some(e => e.path === 'shipment.carrierParty.vknTckn'
      && e.code === 'INVALID_FORMAT')).toBe(true);
  });

  it('B-85: validateCarrierParty — geçersiz schemeID → reddedilir', () => {
    const errors = validateCarrierParty(
      {
        vknTckn: '1234567890', taxIdType: 'VKN', name: 'Taşıyıcı',
        additionalIdentifiers: [{ schemeId: 'INVALIDSCHEME', value: '123' }],
      },
      'shipment.carrierParty',
    );
    expect(errors.some(e => e.path === 'shipment.carrierParty.additionalIdentifiers[0].schemeId'
      && e.code === 'INVALID_VALUE')).toBe(true);
  });

  it('B-85: validateCarrierParty — geçerli → hata yok', () => {
    const errors = validateCarrierParty(
      {
        vknTckn: '1234567890', taxIdType: 'VKN', name: 'Taşıyıcı',
        additionalIdentifiers: [{ schemeId: 'TICARETSICILNO', value: '123' }],
      },
      'shipment.carrierParty',
    );
    expect(errors).toHaveLength(0);
  });

  it('B-85: validateDespatch üzerinden carrierParty bozuk VKN → hata yakalanır', () => {
    const input = createValidMatbudanInput();
    input.shipment.driverPersons = undefined;
    input.shipment.carrierParty = { vknTckn: '999', taxIdType: 'VKN', name: 'X' };
    const errors = validateDespatch(input);
    expect(errors.some(e => e.path === 'shipment.carrierParty.vknTckn')).toBe(true);
  });
});
