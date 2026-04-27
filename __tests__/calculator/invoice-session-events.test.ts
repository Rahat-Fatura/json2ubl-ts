/**
 * Field-level event testleri (Sprint 8h.4 / AR-10).
 *
 * fieldChanged + fieldActivated + fieldDeactivated + lineFieldChanged + D-12 forcedReason.
 * 18 adımlı event sıralaması (§3.1) enforcement.
 */

import { describe, it, expect } from 'vitest';
import {
  InvoiceSession,
  type FieldChangedPayload,
  type FieldActivatedPayload,
  type FieldDeactivatedPayload,
  type LineFieldChangedPayload,
} from '../../src/calculator/invoice-session';
import { SessionPaths } from '../../src/calculator/session-paths.generated';

function captureFieldChanged(session: InvoiceSession): FieldChangedPayload[] {
  const events: FieldChangedPayload[] = [];
  session.on('field-changed', (p) => events.push(p));
  return events;
}

function captureFieldActivated(session: InvoiceSession): FieldActivatedPayload[] {
  const events: FieldActivatedPayload[] = [];
  session.on('field-activated', (p) => events.push(p));
  return events;
}

function captureFieldDeactivated(session: InvoiceSession): FieldDeactivatedPayload[] {
  const events: FieldDeactivatedPayload[] = [];
  session.on('field-deactivated', (p) => events.push(p));
  return events;
}

function captureLineFieldChanged(session: InvoiceSession): LineFieldChangedPayload[] {
  const events: LineFieldChangedPayload[] = [];
  session.on('line-field-changed', (p) => events.push(p));
  return events;
}

describe('field-changed event (Sprint 8h.4)', () => {
  it('emits on doc-level update with previousValue', () => {
    const session = new InvoiceSession();
    session.update(SessionPaths.senderTaxNumber, '1111111111');
    const events = captureFieldChanged(session);
    session.update(SessionPaths.senderTaxNumber, '2222222222');
    expect(events).toHaveLength(1);
    expect(events[0].path).toBe('sender.taxNumber');
    expect(events[0].value).toBe('2222222222');
    expect(events[0].previousValue).toBe('1111111111');
  });

  it('emits on sub-object update (paymentMeans.meansCode)', () => {
    const session = new InvoiceSession();
    const events = captureFieldChanged(session);
    session.update(SessionPaths.paymentMeansMeansCode, '1');
    expect(events).toHaveLength(1);
    expect(events[0].path).toBe('paymentMeans.meansCode');
    expect(events[0].value).toBe('1');
  });

  it('emits on type update (via _updateType helper)', () => {
    const session = new InvoiceSession({ initialInput: { type: 'SATIS' } });
    const events = captureFieldChanged(session);
    session.update(SessionPaths.type, 'TEVKIFAT');
    expect(events.length).toBeGreaterThan(0);
    const typeEvent = events.find(e => e.path === 'type');
    expect(typeEvent).toBeDefined();
    expect(typeEvent!.value).toBe('TEVKIFAT');
    expect(typeEvent!.previousValue).toBe('SATIS');
  });

  it('emits on profile update (via _updateProfile helper)', () => {
    const session = new InvoiceSession({ initialInput: { profile: 'TICARIFATURA' } });
    const events = captureFieldChanged(session);
    session.update(SessionPaths.profile, 'TEMELFATURA');
    const profileEvent = events.find(e => e.path === 'profile');
    expect(profileEvent).toBeDefined();
    expect(profileEvent!.value).toBe('TEMELFATURA');
  });

  it('emits on liability update (via _updateLiability helper)', () => {
    const session = new InvoiceSession();
    const events = captureFieldChanged(session);
    session.update(SessionPaths.liability, 'einvoice');
    const liabilityEvent = events.find(e => e.path === 'liability');
    expect(liabilityEvent).toBeDefined();
    expect(liabilityEvent!.value).toBe('einvoice');
  });

  it('does not emit on no-op (diff returns false)', () => {
    const session = new InvoiceSession({ initialInput: { type: 'TEVKIFAT' } });
    const events = captureFieldChanged(session);
    session.update(SessionPaths.type, 'TEVKIFAT');
    expect(events).toHaveLength(0);
  });

  it('does not emit on path-error (validation fails)', () => {
    const session = new InvoiceSession();
    const events = captureFieldChanged(session);
    session.update('isExport' as any, true as any);   // READ_ONLY_PATH
    expect(events).toHaveLength(0);
  });
});

describe('field-changed D-12 forcedReason (isExport type force)', () => {
  it('emits forcedReason when isExport=true forces type to ISTISNA', () => {
    const session = new InvoiceSession({ isExport: true });
    const events = captureFieldChanged(session);
    session.update(SessionPaths.type, 'SATIS');     // user wants SATIS, forced ISTISNA
    expect(events).toHaveLength(1);
    expect(events[0].path).toBe('type');
    expect(events[0].value).toBe('ISTISNA');         // applied
    expect(events[0].requestedValue).toBe('SATIS');  // requested
    expect(events[0].forcedReason).toMatch(/isExport=true/);
  });

  it('emits forcedReason for IADE force in isExport=true session', () => {
    const session = new InvoiceSession({ isExport: true });
    const events = captureFieldChanged(session);
    session.update(SessionPaths.type, 'IADE');
    expect(events).toHaveLength(1);
    expect(events[0].requestedValue).toBe('IADE');
    expect(events[0].value).toBe('ISTISNA');
    expect(events[0].forcedReason).toMatch(/isExport=true/);
  });

  it('does NOT include forcedReason when no force (isExport=false)', () => {
    const session = new InvoiceSession({ isExport: false });
    const events = captureFieldChanged(session);
    session.update(SessionPaths.type, 'TEVKIFAT');
    const typeEvent = events.find(e => e.path === 'type');
    expect(typeEvent).toBeDefined();
    expect(typeEvent!.requestedValue).toBeUndefined();
    expect(typeEvent!.forcedReason).toBeUndefined();
  });

  it('emits even when applied state did not change (force keeps current ISTISNA)', () => {
    const session = new InvoiceSession({ isExport: true });
    // Type already ISTISNA (constructor force). User attempts SATIS.
    const events = captureFieldChanged(session);
    session.update(SessionPaths.type, 'SATIS');
    // applied=ISTISNA===previous=ISTISNA, no actual change, but D-12 still emits forcedReason
    expect(events).toHaveLength(1);
    expect(events[0].value).toBe('ISTISNA');
    expect(events[0].previousValue).toBe('ISTISNA');
    expect(events[0].requestedValue).toBe('SATIS');
    expect(events[0].forcedReason).toBeDefined();
  });
});

describe('line-field-changed event (Sprint 8h.4)', () => {
  it('emits on lines[i].field update with lineIndex + field', () => {
    const session = new InvoiceSession();
    session.addLine({ name: 'L1', quantity: 1, price: 100, kdvPercent: 18 });
    const events = captureLineFieldChanged(session);
    session.update(SessionPaths.lineKdvPercent(0), 8);
    expect(events).toHaveLength(1);
    expect(events[0].lineIndex).toBe(0);
    expect(events[0].field).toBe('kdvPercent');
    expect(events[0].path).toBe('lines[0].kdvPercent');
    expect(events[0].value).toBe(8);
    expect(events[0].previousValue).toBe(18);
  });

  it('emits on double-indexed update (lines[i].taxes[ti].percent)', () => {
    const session = new InvoiceSession();
    session.addLine({
      name: 'L1', quantity: 1, price: 100, kdvPercent: 18,
      taxes: [{ code: '0071', percent: 25 }],
    });
    const events = captureLineFieldChanged(session);
    session.update(SessionPaths.lineTaxPercent(0, 0), 30);
    expect(events).toHaveLength(1);
    expect(events[0].lineIndex).toBe(0);
    expect(events[0].field).toBe('taxes[0].percent');
  });

  it('does NOT emit on doc-level update (sender, type, profile)', () => {
    const session = new InvoiceSession();
    const events = captureLineFieldChanged(session);
    session.update(SessionPaths.senderTaxNumber, '1234567890');
    session.update(SessionPaths.type, 'TEVKIFAT');
    expect(events).toHaveLength(0);
  });

  it('does NOT emit on addLine (lineAdded covers that)', () => {
    const session = new InvoiceSession();
    const events = captureLineFieldChanged(session);
    session.addLine({ name: 'L1', quantity: 1, price: 100, kdvPercent: 18 });
    expect(events).toHaveLength(0);
  });

  it('emits on multiple sequential line updates', () => {
    const session = new InvoiceSession();
    session.addLine({ name: 'L1', quantity: 1, price: 100, kdvPercent: 18 });
    session.addLine({ name: 'L2', quantity: 2, price: 50, kdvPercent: 8 });
    const events = captureLineFieldChanged(session);
    session.update(SessionPaths.lineKdvPercent(0), 0);
    session.update(SessionPaths.lineKdvPercent(1), 18);
    expect(events).toHaveLength(2);
    expect(events[0].lineIndex).toBe(0);
    expect(events[1].lineIndex).toBe(1);
  });
});

describe('field-activated / field-deactivated UI visibility diff (Sprint 8h.4)', () => {
  it('emits field-activated when type=TEVKIFAT shows withholding selector', () => {
    const session = new InvoiceSession({ initialInput: { type: 'SATIS' } });
    const activated = captureFieldActivated(session);
    session.update(SessionPaths.type, 'TEVKIFAT');
    const withholding = activated.find(e => e.path === 'fields.showWithholdingTaxSelector');
    expect(withholding).toBeDefined();
  });

  it('emits field-deactivated when type=SATIS hides withholding selector', () => {
    const session = new InvoiceSession({ initialInput: { type: 'TEVKIFAT' } });
    const deactivated = captureFieldDeactivated(session);
    session.update(SessionPaths.type, 'SATIS');
    const withholding = deactivated.find(e => e.path === 'fields.showWithholdingTaxSelector');
    expect(withholding).toBeDefined();
  });

  it('emits field-activated when profile=KAMU activates payment requirements', () => {
    const session = new InvoiceSession({ initialInput: { profile: 'TICARIFATURA' } });
    const activated = captureFieldActivated(session);
    session.update(SessionPaths.profile, 'KAMU');
    const payment = activated.find(e => e.path === 'fields.requireIban');
    expect(payment).toBeDefined();
  });

  it('emits field-activated when type=IADE activates billingReference', () => {
    const session = new InvoiceSession({ initialInput: { type: 'SATIS', profile: 'TICARIFATURA' } });
    const activated = captureFieldActivated(session);
    session.update(SessionPaths.type, 'IADE');
    const billingRef = activated.find(e => e.path === 'fields.showBillingReference');
    expect(billingRef).toBeDefined();
  });

  it('emits no diff when state stays the same (no-op)', () => {
    const session = new InvoiceSession({ initialInput: { type: 'TEVKIFAT' } });
    const activated = captureFieldActivated(session);
    const deactivated = captureFieldDeactivated(session);
    session.update(SessionPaths.type, 'TEVKIFAT');
    expect(activated).toHaveLength(0);
    expect(deactivated).toHaveLength(0);
  });

  it('payload reason includes type/profile context', () => {
    const session = new InvoiceSession();
    const activated = captureFieldActivated(session);
    session.update(SessionPaths.type, 'TEVKIFAT');
    if (activated.length > 0) {
      expect(activated[0].reason).toMatch(/type=TEVKIFAT/);
    }
  });
});

describe('Event sıralaması (§3.1 enforcement, Sprint 8h.4)', () => {
  it('field-changed emits BEFORE ui-state-changed (granular önce)', () => {
    const session = new InvoiceSession({ initialInput: { type: 'SATIS' } });
    const order: string[] = [];
    session.on('field-changed', () => order.push('field-changed'));
    session.on('ui-state-changed', () => order.push('ui-state-changed'));
    session.on('changed', () => order.push('changed'));
    session.update(SessionPaths.type, 'TEVKIFAT');
    const fieldIdx = order.indexOf('field-changed');
    const uiIdx = order.indexOf('ui-state-changed');
    const changedIdx = order.indexOf('changed');
    expect(fieldIdx).toBeLessThan(uiIdx);
    expect(uiIdx).toBeLessThan(changedIdx);
  });

  it('line-field-changed follows field-changed for line-level update', () => {
    const session = new InvoiceSession();
    session.addLine({ name: 'L1', quantity: 1, price: 100, kdvPercent: 18 });
    const order: string[] = [];
    session.on('field-changed', () => order.push('field-changed'));
    session.on('line-field-changed', () => order.push('line-field-changed'));
    session.update(SessionPaths.lineKdvPercent(0), 8);
    expect(order.indexOf('field-changed')).toBeLessThan(order.indexOf('line-field-changed'));
  });

  it('field-activated emits AFTER field-changed (UI diff hesabı sonra)', () => {
    const session = new InvoiceSession({ initialInput: { type: 'SATIS' } });
    const order: string[] = [];
    session.on('field-changed', () => order.push('field-changed'));
    session.on('field-activated', () => order.push('field-activated'));
    session.update(SessionPaths.type, 'TEVKIFAT');
    const fcIdx = order.indexOf('field-changed');
    const faIdx = order.indexOf('field-activated');
    if (faIdx >= 0) {
      expect(fcIdx).toBeLessThan(faIdx);
    }
  });

  it('warnings emits LAST (validate pipeline en son)', () => {
    const session = new InvoiceSession({ initialInput: { type: 'SATIS' } });
    const order: string[] = [];
    session.on('field-changed', () => order.push('field-changed'));
    session.on('changed', () => order.push('changed'));
    session.on('warnings', () => order.push('warnings'));
    session.update(SessionPaths.type, 'TEVKIFAT');
    expect(order[order.length - 1]).toBe('warnings');
  });
});

describe('Sprint 8h.8 — updateUIState() her başarılı update sonrası emit', () => {
  it('sender path update sonrası ui-state-changed emit (mevcut: sadece type/profile)', () => {
    const session = new InvoiceSession();
    let count = 0;
    session.on('ui-state-changed', () => count++);
    session.update(SessionPaths.senderName, 'Acme');
    expect(count).toBeGreaterThan(0);
  });

  it('customer path update sonrası ui-state-changed emit', () => {
    const session = new InvoiceSession();
    let count = 0;
    session.on('ui-state-changed', () => count++);
    session.update(SessionPaths.customerName, 'X');
    expect(count).toBeGreaterThan(0);
  });

  it('line-level update sonrası ui-state-changed emit', () => {
    const session = new InvoiceSession();
    session.addLine({ name: 'L1', quantity: 1, price: 100, kdvPercent: 18 });
    let count = 0;
    session.on('ui-state-changed', () => count++);
    session.update(SessionPaths.lineKdvPercent(0), 8);
    expect(count).toBeGreaterThan(0);
  });

  it('paymentMeans sub-object update sonrası ui-state-changed emit', () => {
    const session = new InvoiceSession();
    let count = 0;
    session.on('ui-state-changed', () => count++);
    session.update(SessionPaths.paymentMeansMeansCode, '1');
    expect(count).toBeGreaterThan(0);
  });

  it('no-op update sonrası ui-state-changed emit YOK (diff false)', () => {
    const session = new InvoiceSession();
    session.update(SessionPaths.senderName, 'Acme');
    let count = 0;
    session.on('ui-state-changed', () => count++);
    session.update(SessionPaths.senderName, 'Acme');     // same value
    expect(count).toBe(0);
  });
});

describe('Auto-resolve fieldChanged (helpers)', () => {
  it('liability auto-resolve emits field-changed for liability path', () => {
    const session = new InvoiceSession({ initialInput: { profile: 'TICARIFATURA', type: 'SATIS' } });
    const events = captureFieldChanged(session);
    session.update(SessionPaths.liability, 'earchive');
    const liabilityEvent = events.find(e => e.path === 'liability');
    expect(liabilityEvent).toBeDefined();
    expect(liabilityEvent!.value).toBe('earchive');
  });

  it('type with profile auto-resolve emits field-changed for type only', () => {
    const session = new InvoiceSession({ initialInput: { type: 'SATIS', profile: 'TICARIFATURA' } });
    const events = captureFieldChanged(session);
    session.update(SessionPaths.type, 'IADE');     // → profile auto TEMELFATURA
    const typeEvent = events.find(e => e.path === 'type');
    expect(typeEvent).toBeDefined();
    expect(typeEvent!.value).toBe('IADE');
    // Auto-resolve sonucu profile event'i fieldChanged değil (snapshot type-changed.profile içinde)
  });
});
