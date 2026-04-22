import { describe, it, expect } from 'vitest';
import {
  validateAddress,
  validatePaymentMeans,
  validateDocumentReference,
  validateOrderReference,
  validatePartyAddressFields,
} from '../../src/validators/common-validators';
import type {
  AddressInput,
  PaymentMeansInput,
  DocumentReferenceInput,
  OrderReferenceInput,
  PartyInput,
} from '../../src/types/common';

/**
 * Sprint 3 / M6 — Parent-Child Conditional Required testleri.
 * Her conditional için iki senaryo:
 *  (a) Parent yok → no-op (hata yok)
 *  (b) Parent var + child eksik → hata
 */

describe('M6 / B-35 — Address parent-child', () => {
  it('parent yok (undefined) → no-op', () => {
    expect(validateAddress(undefined, 'delivery.deliveryAddress')).toEqual([]);
    expect(validateAddress(null, 'delivery.deliveryAddress')).toEqual([]);
  });

  it('parent var ama cityName boş → hata', () => {
    const addr = { citySubdivisionName: 'Çankaya', cityName: '' } as unknown as AddressInput;
    const errors = validateAddress(addr, 'delivery.deliveryAddress');
    expect(errors.some(e => e.path === 'delivery.deliveryAddress.cityName')).toBe(true);
  });

  it('parent var ama citySubdivisionName boş → hata', () => {
    const addr = { citySubdivisionName: '', cityName: 'Ankara' } as unknown as AddressInput;
    const errors = validateAddress(addr, 'delivery.deliveryAddress');
    expect(errors.some(e => e.path === 'delivery.deliveryAddress.citySubdivisionName')).toBe(true);
  });

  it('parent var ve her iki alan dolu → hata yok', () => {
    const addr: AddressInput = { cityName: 'Ankara', citySubdivisionName: 'Çankaya' };
    expect(validateAddress(addr, 'delivery.deliveryAddress')).toEqual([]);
  });
});

describe('M6 / B-34 — Party PostalAddress alanları', () => {
  it('Party.cityName eksik → hata (B-34)', () => {
    const party = {
      vknTckn: '1234567890',
      taxIdType: 'VKN',
      name: 'Test',
      citySubdivisionName: 'Çankaya',
    } as unknown as PartyInput;
    const errors = validatePartyAddressFields(party, 'supplier');
    expect(errors.some(e => e.path === 'supplier.cityName')).toBe(true);
  });

  it('Party tüm adres alanları dolu → hata yok', () => {
    const party = {
      vknTckn: '1234567890',
      taxIdType: 'VKN',
      name: 'Test',
      cityName: 'Ankara',
      citySubdivisionName: 'Çankaya',
    } as PartyInput;
    expect(validatePartyAddressFields(party, 'supplier')).toEqual([]);
  });
});

describe('M6 / B-70 — PaymentMeans parent-child', () => {
  it('parent yok → no-op', () => {
    expect(validatePaymentMeans(undefined, 'paymentMeans[0]')).toEqual([]);
  });

  it('parent var ama paymentMeansCode boş → hata', () => {
    const pm = { paymentMeansCode: '' } as unknown as PaymentMeansInput;
    const errors = validatePaymentMeans(pm, 'paymentMeans[0]');
    expect(errors.some(e => e.path === 'paymentMeans[0].paymentMeansCode')).toBe(true);
  });

  it('parent var ve paymentMeansCode dolu → hata yok', () => {
    const pm: PaymentMeansInput = { paymentMeansCode: '42' };
    expect(validatePaymentMeans(pm, 'paymentMeans[0]')).toEqual([]);
  });
});

describe('M6 / B-32 — DocumentReference parent-child', () => {
  it('parent yok → no-op', () => {
    expect(validateDocumentReference(undefined, 'despatchReferences[0]')).toEqual([]);
  });

  it('parent var ama issueDate boş → hata', () => {
    const ref = { id: 'ABC', issueDate: '' } as unknown as DocumentReferenceInput;
    const errors = validateDocumentReference(ref, 'despatchReferences[0]');
    expect(errors.some(e => e.path === 'despatchReferences[0].issueDate')).toBe(true);
  });

  it('issueDate formatı yanlış → hata', () => {
    const ref: DocumentReferenceInput = { id: 'ABC', issueDate: '15/01/2024' };
    const errors = validateDocumentReference(ref, 'despatchReferences[0]');
    expect(errors.some(e => e.path === 'despatchReferences[0].issueDate')).toBe(true);
  });

  it('issueDate doğru formatta → hata yok', () => {
    const ref: DocumentReferenceInput = { id: 'ABC', issueDate: '2024-01-15' };
    expect(validateDocumentReference(ref, 'despatchReferences[0]')).toEqual([]);
  });
});

describe('M6 / B-33 — OrderReference parent-child', () => {
  it('parent yok → no-op', () => {
    expect(validateOrderReference(undefined, 'orderReference')).toEqual([]);
  });

  it('parent var ama issueDate boş → hata', () => {
    const ref = { id: 'ORD-1', issueDate: '' } as unknown as OrderReferenceInput;
    const errors = validateOrderReference(ref, 'orderReference');
    expect(errors.some(e => e.path === 'orderReference.issueDate')).toBe(true);
  });

  it('parent var ve alanlar dolu → hata yok', () => {
    const ref: OrderReferenceInput = { id: 'ORD-1', issueDate: '2024-01-15' };
    expect(validateOrderReference(ref, 'orderReference')).toEqual([]);
  });
});
