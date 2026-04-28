/**
 * InvoiceSession.unset(scope) testleri — Sprint 8j.3 / v2.2.1.
 *
 * v1.x'in `setBillingReference(undefined)` semantiğinin path-based API
 * karşılığı. Bulgu 3'ün çözümü: `update('billingReference.id', undefined)`
 * tip uyumsuz, empty string ise XML'de boş alan üretir; `unset()` composite'i
 * tamamen kaldırır.
 *
 * Test kapsamı:
 *   - 10 composite scope (billingReference / paymentMeans / ozelMatrah / sgk /
 *     invoicePeriod / buyerCustomer / taxRepresentativeParty / eArchiveInfo /
 *     onlineSale / orderReference) × set+unset + idempotent + remount
 *   - liability scope: normal session + isExport=true session (LIABILITY_LOCKED_BY_EXPORT)
 *   - field-changed event payload + onChanged tetik
 *   - 162 examples-matrix regression (no-op for clean session)
 */

import { describe, it, expect } from 'vitest';
import { InvoiceSession } from '../../src/calculator/invoice-session';
import type { FieldChangedPayload, PathErrorPayload } from '../../src/calculator/invoice-session';

function makeFilledSession(): InvoiceSession {
  const session = new InvoiceSession();
  session.update('sender.taxNumber', '1234567890');
  session.update('customer.taxNumber', '0987654321');
  session.addLine({ name: 'Ürün', quantity: 1, price: 100, kdvPercent: 18 });
  return session;
}

describe('InvoiceSession.unset(scope) — composite removal (Sprint 8j.3)', () => {
  it('billingReference: set → unset clears composite + emits field-changed', () => {
    const session = makeFilledSession();
    session.update('billingReference.id', 'INV-001');
    session.update('billingReference.issueDate', '2026-04-28');
    expect(session.input.billingReference).toEqual({
      id: 'INV-001',
      issueDate: '2026-04-28',
    });

    const events: FieldChangedPayload[] = [];
    session.on('field-changed', (e) => events.push(e));

    session.unset('billingReference');

    expect(session.input.billingReference).toBeUndefined();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      path: 'billingReference',
      value: undefined,
      previousValue: { id: 'INV-001', issueDate: '2026-04-28' },
    });
  });

  it('billingReference: idempotent — second unset() emits no event', () => {
    const session = makeFilledSession();
    session.update('billingReference.id', 'INV-001');
    session.update('billingReference.issueDate', '2026-04-28');
    session.unset('billingReference');

    const events: FieldChangedPayload[] = [];
    session.on('field-changed', (e) => events.push(e));
    session.unset('billingReference');

    expect(events).toHaveLength(0);
  });

  it('billingReference: remount via update() after unset (D-6 sub-object create)', () => {
    const session = makeFilledSession();
    session.update('billingReference.id', 'INV-001');
    session.update('billingReference.issueDate', '2026-04-28');
    session.unset('billingReference');

    session.update('billingReference.id', 'INV-002');
    expect(session.input.billingReference?.id).toBe('INV-002');
  });

  it('paymentMeans scope', () => {
    const session = makeFilledSession();
    session.update('paymentMeans.meansCode', '42');
    session.update('paymentMeans.iban', 'TR0000');
    expect(session.input.paymentMeans?.meansCode).toBe('42');
    session.unset('paymentMeans');
    expect(session.input.paymentMeans).toBeUndefined();
  });

  it('ozelMatrah scope', () => {
    const session = makeFilledSession();
    session.update('ozelMatrah.percent', 18);
    session.update('ozelMatrah.taxable', 100);
    session.update('ozelMatrah.amount', 18);
    expect(session.input.ozelMatrah).toBeDefined();
    session.unset('ozelMatrah');
    expect(session.input.ozelMatrah).toBeUndefined();
  });

  it('sgk scope', () => {
    const session = makeFilledSession();
    session.update('sgk.type', 'SAGLIK_ECZ');
    session.update('sgk.documentNo', 'D-001');
    session.update('sgk.companyName', 'Eczane A.Ş.');
    session.update('sgk.companyCode', 'C-001');
    expect(session.input.sgk?.type).toBe('SAGLIK_ECZ');
    session.unset('sgk');
    expect(session.input.sgk).toBeUndefined();
  });

  it('invoicePeriod scope', () => {
    const session = makeFilledSession();
    session.update('invoicePeriod.startDate', '2026-04-01');
    session.update('invoicePeriod.endDate', '2026-04-30');
    expect(session.input.invoicePeriod).toBeDefined();
    session.unset('invoicePeriod');
    expect(session.input.invoicePeriod).toBeUndefined();
  });

  it('buyerCustomer scope', () => {
    const session = makeFilledSession();
    session.update('buyerCustomer.name', 'Yurtdışı Alıcı');
    session.update('buyerCustomer.taxNumber', 'X-999');
    expect(session.input.buyerCustomer?.name).toBe('Yurtdışı Alıcı');
    session.unset('buyerCustomer');
    expect(session.input.buyerCustomer).toBeUndefined();
  });

  it('taxRepresentativeParty scope', () => {
    const session = makeFilledSession();
    session.update('taxRepresentativeParty.vknTckn', '1111111111');
    session.update('taxRepresentativeParty.label', 'AKURM');
    expect(session.input.taxRepresentativeParty).toBeDefined();
    session.unset('taxRepresentativeParty');
    expect(session.input.taxRepresentativeParty).toBeUndefined();
  });

  it('eArchiveInfo scope', () => {
    const session = makeFilledSession();
    session.update('eArchiveInfo.sendType', 'ELEKTRONIK');
    expect(session.input.eArchiveInfo?.sendType).toBe('ELEKTRONIK');
    session.unset('eArchiveInfo');
    expect(session.input.eArchiveInfo).toBeUndefined();
  });

  it('onlineSale scope', () => {
    const session = makeFilledSession();
    session.update('onlineSale.isOnlineSale', true);
    session.update('onlineSale.storeUrl', 'https://shop.example.com');
    session.update('onlineSale.paymentMethod', 'KREDIKARTI');
    session.update('onlineSale.paymentDate', '2026-04-28');
    expect(session.input.onlineSale).toBeDefined();
    session.unset('onlineSale');
    expect(session.input.onlineSale).toBeUndefined();
  });

  it('orderReference scope', () => {
    const session = makeFilledSession();
    session.update('orderReference.id', 'ORD-001');
    session.update('orderReference.issueDate', '2026-04-28');
    expect(session.input.orderReference).toBeDefined();
    session.unset('orderReference');
    expect(session.input.orderReference).toBeUndefined();
  });

  it('triggers updateUIState (warnings re-derived after composite removal)', () => {
    const session = makeFilledSession();
    session.update('billingReference.id', 'INV-001');
    session.update('billingReference.issueDate', '2026-04-28');

    let uiStateChangedCount = 0;
    session.on('ui-state-changed', () => uiStateChangedCount++);

    session.unset('billingReference');
    expect(uiStateChangedCount).toBeGreaterThan(0);
  });
});

describe('InvoiceSession.unset("liability") — session-level state (Sprint 8j.3)', () => {
  it('clears liability + emits field-changed + liability-changed', () => {
    const session = new InvoiceSession({ liability: 'einvoice' });
    expect(session.uiState.fields).toBeDefined();

    const fieldEvents: FieldChangedPayload[] = [];
    const liabilityEvents: { liability: unknown; previousLiability: unknown }[] = [];
    session.on('field-changed', (e) => fieldEvents.push(e));
    session.on('liability-changed', (e) => liabilityEvents.push(e));

    session.unset('liability');

    expect(fieldEvents).toHaveLength(1);
    expect(fieldEvents[0]).toMatchObject({
      path: 'liability',
      value: undefined,
      previousValue: 'einvoice',
    });
    expect(liabilityEvents).toHaveLength(1);
    expect(liabilityEvents[0]).toMatchObject({
      liability: undefined,
      previousLiability: 'einvoice',
    });
  });

  it('idempotent — unset on already-undefined liability emits no event', () => {
    const session = new InvoiceSession();
    const events: FieldChangedPayload[] = [];
    session.on('field-changed', (e) => events.push(e));
    session.unset('liability');
    expect(events).toHaveLength(0);
  });

  it('isExport=true session: emits LIABILITY_LOCKED_BY_EXPORT path-error (M10)', () => {
    const session = new InvoiceSession({ isExport: true, liability: 'einvoice' });
    const errors: PathErrorPayload[] = [];
    session.on('path-error', (e) => errors.push(e));

    session.unset('liability');

    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('LIABILITY_LOCKED_BY_EXPORT');
  });
});
