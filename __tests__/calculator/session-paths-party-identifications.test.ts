/**
 * Party identifications path entries — Sprint 8j.2.
 *
 * Bulgu 2: SessionPathMap'te party-level identifications path'leri yoktu.
 * Generator script'i interface array (sender/customer.identifications) ve
 * inline literal array (buyerCustomer.identifications) üzerinden ek path
 * entry türetecek şekilde genişletildi.
 *
 * Bu test paketi her path'in:
 *   1. SessionPaths const'ında bulunduğunu (template fonksiyonu)
 *   2. SessionPathMap tipinde olduğunu (compile-time)
 *   3. Runtime update() ile başarılı set edebildiğini (sub-object create + value)
 * doğrular.
 */

import { describe, it, expect } from 'vitest';
import { InvoiceSession } from '../../src/calculator/invoice-session';
import { SessionPaths } from '../../src/calculator/session-paths.generated';

describe('SessionPaths party identifications (Sprint 8j.2)', () => {
  it('exposes sender.identifications path templates', () => {
    expect(SessionPaths.senderIdentificationSchemeId(0)).toBe('sender.identifications[0].schemeId');
    expect(SessionPaths.senderIdentificationValue(0)).toBe('sender.identifications[0].value');
    expect(SessionPaths.senderIdentificationSchemeId(2)).toBe('sender.identifications[2].schemeId');
  });

  it('exposes customer.identifications path templates', () => {
    expect(SessionPaths.customerIdentificationSchemeId(0)).toBe('customer.identifications[0].schemeId');
    expect(SessionPaths.customerIdentificationValue(0)).toBe('customer.identifications[0].value');
  });

  it('exposes buyerCustomer.identifications path templates (inline literal array)', () => {
    expect(SessionPaths.buyerCustomerIdentificationSchemeId(0)).toBe('buyerCustomer.identifications[0].schemeId');
    expect(SessionPaths.buyerCustomerIdentificationValue(0)).toBe('buyerCustomer.identifications[0].value');
  });

  it('runtime: sender.identifications[0].schemeId + value via update()', () => {
    const session = new InvoiceSession();
    session.update(SessionPaths.senderIdentificationSchemeId(0), 'MERSISNO');
    session.update(SessionPaths.senderIdentificationValue(0), '1234567890123456');
    expect(session.input.sender.identifications?.[0]).toEqual({
      schemeId: 'MERSISNO',
      value: '1234567890123456',
    });
  });

  it('runtime: customer.identifications[0] — IDIS profili SEVKIYATNO senaryosu', () => {
    const session = new InvoiceSession();
    session.update(SessionPaths.customerIdentificationSchemeId(0), 'SEVKIYATNO');
    session.update(SessionPaths.customerIdentificationValue(0), 'SVK-2026-0001');
    expect(session.input.customer.identifications?.[0]).toEqual({
      schemeId: 'SEVKIYATNO',
      value: 'SVK-2026-0001',
    });
  });

  it('runtime: buyerCustomer.identifications[0] — KAMU profili MUSTERINO (B-83)', () => {
    const session = new InvoiceSession();
    // buyerCustomer composite henüz mount değil; prerequisite alanlarla mount
    session.update(SessionPaths.buyerCustomerName, 'Kamu Müşterisi A.Ş.');
    session.update(SessionPaths.buyerCustomerIdentificationSchemeId(0), 'MUSTERINO');
    session.update(SessionPaths.buyerCustomerIdentificationValue(0), 'MUS-9876');
    expect(session.input.buyerCustomer?.identifications?.[0]).toEqual({
      schemeId: 'MUSTERINO',
      value: 'MUS-9876',
    });
  });

  it('runtime: çoklu sender identifications (HKS profili KUNYENO + MERSISNO)', () => {
    const session = new InvoiceSession();
    session.update(SessionPaths.senderIdentificationSchemeId(0), 'KUNYENO');
    session.update(SessionPaths.senderIdentificationValue(0), 'K-001');
    session.update(SessionPaths.senderIdentificationSchemeId(1), 'MERSISNO');
    session.update(SessionPaths.senderIdentificationValue(1), '0123456789012345');
    expect(session.input.sender.identifications).toHaveLength(2);
    expect(session.input.sender.identifications?.[0]?.schemeId).toBe('KUNYENO');
    expect(session.input.sender.identifications?.[1]?.schemeId).toBe('MERSISNO');
  });
});
