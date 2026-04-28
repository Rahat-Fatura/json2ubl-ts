/**
 * `removeIdentification` + `setIdentifications` API testleri (Sprint 8k.4 /
 * Library Öneri #4 — v2.2.3).
 *
 * Path-based `update()` API'si dizide index kaydırma yapamadığı için
 * KAMU MUSTERINO / IDIS SEVKIYATNO ekle-sil akışında splice/replace
 * semantiği gerekli. Bu API her party (sender / customer / buyerCustomer)
 * için identifications array'ini düzenler.
 */

import { describe, it, expect } from 'vitest';
import { InvoiceSession } from '../../src/calculator/invoice-session';
import type { FieldChangedPayload } from '../../src/calculator/invoice-session';

function senderWithIds(ids: Array<{ schemeId: string; value: string }>): InvoiceSession {
  const session = new InvoiceSession();
  session.update('sender.taxNumber', '1234567890');
  ids.forEach((id, i) => {
    session.update(`sender.identifications[${i}].schemeId` as any, id.schemeId);
    session.update(`sender.identifications[${i}].value` as any, id.value);
  });
  return session;
}

describe('InvoiceSession.removeIdentification (Sprint 8k.4)', () => {
  it('sender: removes middle index, shifts subsequent', () => {
    const session = senderWithIds([
      { schemeId: 'MERSISNO', value: '0001' },
      { schemeId: 'KUNYENO', value: 'K-002' },
      { schemeId: 'TICARETSICILNO', value: 'T-003' },
    ]);

    session.removeIdentification('sender', 1);

    expect(session.input.sender.identifications).toEqual([
      { schemeId: 'MERSISNO', value: '0001' },
      { schemeId: 'TICARETSICILNO', value: 'T-003' },
    ]);
  });

  it('customer: removes last index', () => {
    const session = new InvoiceSession();
    session.update('customer.taxNumber', '0987654321');
    session.update('customer.identifications[0].schemeId', 'SEVKIYATNO');
    session.update('customer.identifications[0].value', 'SVK-001');
    session.update('customer.identifications[1].schemeId', 'MUSTERINO');
    session.update('customer.identifications[1].value', 'MUS-002');

    session.removeIdentification('customer', 1);

    expect(session.input.customer.identifications).toEqual([
      { schemeId: 'SEVKIYATNO', value: 'SVK-001' },
    ]);
  });

  it('sender: array tek elemanlı → identifications field undefined yapılır', () => {
    const session = senderWithIds([{ schemeId: 'MERSISNO', value: '0001' }]);

    session.removeIdentification('sender', 0);

    expect(session.input.sender.identifications).toBeUndefined();
  });

  it('sender: out-of-bounds index → no-op', () => {
    const session = senderWithIds([{ schemeId: 'MERSISNO', value: '0001' }]);
    const events: FieldChangedPayload[] = [];
    session.on('field-changed', (e) => events.push(e));

    session.removeIdentification('sender', 99);
    session.removeIdentification('sender', -1);

    expect(events).toHaveLength(0);
    expect(session.input.sender.identifications).toEqual([
      { schemeId: 'MERSISNO', value: '0001' },
    ]);
  });

  it('buyerCustomer: inline literal type compat — splice çalışıyor', () => {
    const session = new InvoiceSession();
    session.update('buyerCustomer.name', 'Test BC');
    session.update('buyerCustomer.identifications[0].schemeId', 'MUSTERINO');
    session.update('buyerCustomer.identifications[0].value', 'M-001');
    session.update('buyerCustomer.identifications[1].schemeId', 'MERSISNO');
    session.update('buyerCustomer.identifications[1].value', 'X-002');

    session.removeIdentification('buyerCustomer', 0);

    expect(session.input.buyerCustomer?.identifications).toEqual([
      { schemeId: 'MERSISNO', value: 'X-002' },
    ]);
  });

  it('emits field-changed event with full path', () => {
    const session = senderWithIds([
      { schemeId: 'A', value: '1' },
      { schemeId: 'B', value: '2' },
    ]);

    const events: FieldChangedPayload[] = [];
    session.on('field-changed', (e) => events.push(e));

    session.removeIdentification('sender', 0);

    const last = events[events.length - 1];
    expect(last.path).toBe('sender.identifications');
    expect(last.value).toEqual([{ schemeId: 'B', value: '2' }]);
    expect(last.previousValue).toEqual([
      { schemeId: 'A', value: '1' },
      { schemeId: 'B', value: '2' },
    ]);
  });
});

describe('InvoiceSession.setIdentifications (Sprint 8k.4)', () => {
  it('sender: tam replace ile yeni dizi yazar', () => {
    const session = senderWithIds([{ schemeId: 'OLD', value: 'X' }]);

    session.setIdentifications('sender', [
      { schemeId: 'MERSISNO', value: '0001' },
      { schemeId: 'KUNYENO', value: 'K-002' },
    ]);

    expect(session.input.sender.identifications).toEqual([
      { schemeId: 'MERSISNO', value: '0001' },
      { schemeId: 'KUNYENO', value: 'K-002' },
    ]);
  });

  it('sender: empty array → undefined yapar', () => {
    const session = senderWithIds([{ schemeId: 'MERSISNO', value: '0001' }]);

    session.setIdentifications('sender', []);

    expect(session.input.sender.identifications).toBeUndefined();
  });

  it('sender: undefined parametresi → undefined yapar', () => {
    const session = senderWithIds([{ schemeId: 'MERSISNO', value: '0001' }]);

    session.setIdentifications('sender', undefined);

    expect(session.input.sender.identifications).toBeUndefined();
  });

  it('emits field-changed event payload', () => {
    const session = senderWithIds([{ schemeId: 'A', value: '1' }]);
    const events: FieldChangedPayload[] = [];
    session.on('field-changed', (e) => events.push(e));

    session.setIdentifications('sender', [{ schemeId: 'B', value: '2' }]);

    const last = events[events.length - 1];
    expect(last.path).toBe('sender.identifications');
    expect(last.value).toEqual([{ schemeId: 'B', value: '2' }]);
    expect(last.previousValue).toEqual([{ schemeId: 'A', value: '1' }]);
  });

  it('deepEqual no-op (aynı içerikli array) → event emit yok', () => {
    const session = senderWithIds([{ schemeId: 'A', value: '1' }]);
    const events: FieldChangedPayload[] = [];
    session.on('field-changed', (e) => events.push(e));

    session.setIdentifications('sender', [{ schemeId: 'A', value: '1' }]);

    expect(events).toHaveLength(0);
  });

  it('buyerCustomer mount edilmemiş → no-op (event yok, state değişmez)', () => {
    const session = new InvoiceSession();
    const events: FieldChangedPayload[] = [];
    session.on('field-changed', (e) => events.push(e));

    session.setIdentifications('buyerCustomer', [
      { schemeId: 'MUSTERINO', value: 'M-001' },
    ]);

    expect(events).toHaveLength(0);
    expect(session.input.buyerCustomer).toBeUndefined();
  });
});
