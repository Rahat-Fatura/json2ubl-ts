/**
 * InvoiceSession.update() testleri (Sprint 8h.2 / AR-10).
 *
 * Path validation 4 katman + LIABILITY_LOCKED_BY_EXPORT constraint + diff detection + liability özel-durum.
 * Field-level events (8h.4), PROFILE_*_MISMATCH (8h.3), auto-resolve (8h.3) ayrı commit'lerde test edilir.
 */

import { describe, it, expect } from 'vitest';
import { InvoiceSession, type PathErrorPayload } from '../../src/calculator/invoice-session';
import { SessionPaths } from '../../src/calculator/session-paths.generated';

function captureErrors(session: InvoiceSession): PathErrorPayload[] {
  const errors: PathErrorPayload[] = [];
  session.on('path-error', (err) => errors.push(err));
  return errors;
}

describe('InvoiceSession.update() — path validation Katman 1: syntax', () => {
  it('emits INVALID_PATH on empty path', () => {
    const session = new InvoiceSession();
    const errors = captureErrors(session);
    session.update('' as any, 'x');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('INVALID_PATH');
    expect(errors[0].reason).toMatch(/empty/);
  });

  it('emits INVALID_PATH on leading dot', () => {
    const session = new InvoiceSession();
    const errors = captureErrors(session);
    session.update('.type' as any, 'x');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('INVALID_PATH');
    expect(errors[0].reason).toMatch(/leading dot/);
  });

  it('emits INVALID_PATH on unterminated bracket', () => {
    const session = new InvoiceSession();
    const errors = captureErrors(session);
    session.update('lines[0' as any, 'x');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('INVALID_PATH');
  });

  it('emits INVALID_PATH on negative index', () => {
    const session = new InvoiceSession();
    const errors = captureErrors(session);
    session.update('lines[-1].kdvPercent' as any, 0 as any);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('INVALID_PATH');
  });

  it('does not mutate state on invalid path', () => {
    const session = new InvoiceSession();
    captureErrors(session);
    const beforeType = session.input.type;
    session.update('.type' as any, 'TEVKIFAT');
    expect(session.input.type).toBe(beforeType);
  });
});

describe('InvoiceSession.update() — path validation Katman 2: read-only', () => {
  it('emits READ_ONLY_PATH on update("isExport", ...)', () => {
    const session = new InvoiceSession();
    const errors = captureErrors(session);
    session.update('isExport' as any, true as any);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('READ_ONLY_PATH');
    expect(errors[0].path).toBe('isExport');
  });

  it('does not change isExport readonly state', () => {
    const session = new InvoiceSession({ isExport: false });
    captureErrors(session);
    session.update('isExport' as any, true as any);
    expect(session.isExport).toBe(false);
  });

  it('READ_ONLY_PATH check runs before UNKNOWN_PATH (isExport not in SessionPaths)', () => {
    const session = new InvoiceSession();
    const errors = captureErrors(session);
    session.update('isExport' as any, true as any);
    // isExport SessionPaths map'inde yok, ama Katman 2 önce read-only der
    expect(errors[0].code).toBe('READ_ONLY_PATH');
    expect(errors[0].code).not.toBe('UNKNOWN_PATH');
  });
});

describe('InvoiceSession.update() — path validation Katman 3: unknown', () => {
  it('emits UNKNOWN_PATH on path not in SessionPaths', () => {
    const session = new InvoiceSession();
    const errors = captureErrors(session);
    session.update('foo.bar' as any, 'x' as any);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('UNKNOWN_PATH');
  });

  it('emits UNKNOWN_PATH on lines doc-level path (lines update via CRUD only)', () => {
    const session = new InvoiceSession();
    const errors = captureErrors(session);
    session.update('lines' as any, [] as any);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('UNKNOWN_PATH');
  });

  it('reason includes normalized template', () => {
    const session = new InvoiceSession();
    const errors = captureErrors(session);
    session.update('lines[0].nonExistentField' as any, 'x' as any);
    expect(errors[0].reason).toMatch(/lines\[\*\]\.nonExistentField/);
  });
});

describe('InvoiceSession.update() — path validation Katman 4: index bounds', () => {
  it('emits INDEX_OUT_OF_BOUNDS on lines[5] when length=0', () => {
    const session = new InvoiceSession();
    const errors = captureErrors(session);
    session.update(SessionPaths.lineKdvPercent(5), 18);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('INDEX_OUT_OF_BOUNDS');
    expect(errors[0].reason).toMatch(/index 5 but length=0/);
  });

  it('accepts lines[0] when line exists', () => {
    const session = new InvoiceSession();
    session.addLine({ name: 'L1', quantity: 1, price: 100, kdvPercent: 18 });
    const errors = captureErrors(session);
    session.update(SessionPaths.lineKdvPercent(0), 8);
    expect(errors).toHaveLength(0);
    expect(session.input.lines[0].kdvPercent).toBe(8);
  });

  it('emits INDEX_OUT_OF_BOUNDS on double-indexed taxes[1] when no taxes', () => {
    const session = new InvoiceSession();
    session.addLine({ name: 'L1', quantity: 1, price: 100, kdvPercent: 18 });
    const errors = captureErrors(session);
    session.update(SessionPaths.lineTaxCode(0, 1), '0071');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('INDEX_OUT_OF_BOUNDS');
  });
});

describe('InvoiceSession.update() — LIABILITY_LOCKED_BY_EXPORT (M10 contract)', () => {
  it('emits LIABILITY_LOCKED_BY_EXPORT in isExport=true session', () => {
    const session = new InvoiceSession({ isExport: true });
    const errors = captureErrors(session);
    session.update(SessionPaths.liability, 'einvoice');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('LIABILITY_LOCKED_BY_EXPORT');
  });

  it('does not mutate _liability when isExport=true', () => {
    const session = new InvoiceSession({ isExport: true });
    captureErrors(session);
    const before = session.liability;
    session.update(SessionPaths.liability, 'earchive');
    expect(session.liability).toBe(before);
  });

  it('allows liability update in isExport=false session', () => {
    const session = new InvoiceSession({ isExport: false });
    const errors = captureErrors(session);
    session.update(SessionPaths.liability, 'einvoice');
    expect(errors).toHaveLength(0);
    expect(session.liability).toBe('einvoice');
  });
});

describe('InvoiceSession.update() — diff detection', () => {
  it('does not emit when value unchanged (no-op)', () => {
    const session = new InvoiceSession({ initialInput: { type: 'TEVKIFAT' } });
    let changedCount = 0;
    session.on('changed', () => changedCount++);
    session.update(SessionPaths.type, 'TEVKIFAT');     // same value
    expect(changedCount).toBe(0);
  });

  it('emits when value changes', () => {
    const session = new InvoiceSession({ initialInput: { type: 'TEVKIFAT' } });
    let changedCount = 0;
    session.on('changed', () => changedCount++);
    session.update(SessionPaths.type, 'IADE');
    expect(changedCount).toBe(1);
  });

  it('handles deep object value diff (paymentMeans)', () => {
    const session = new InvoiceSession();
    session.update(SessionPaths.paymentMeansAccountNumber, 'TR000');
    let count = 0;
    session.on('changed', () => count++);
    session.update(SessionPaths.paymentMeansAccountNumber, 'TR000');     // same
    expect(count).toBe(0);
  });
});

describe('InvoiceSession.update() — successful mutation', () => {
  it('updates doc-level primitive (type)', () => {
    const session = new InvoiceSession({ initialInput: { type: 'SATIS' } });
    session.update(SessionPaths.type, 'TEVKIFAT');
    expect(session.input.type).toBe('TEVKIFAT');
  });

  it('updates sub-object field (sender.taxNumber)', () => {
    const session = new InvoiceSession();
    session.update(SessionPaths.senderTaxNumber, '1234567890');
    expect(session.input.sender.taxNumber).toBe('1234567890');
  });

  it('updates line-level field (lines[0].kdvPercent)', () => {
    const session = new InvoiceSession();
    session.addLine({ name: 'L1', quantity: 1, price: 100, kdvPercent: 18 });
    session.update(SessionPaths.lineKdvPercent(0), 0);
    expect(session.input.lines[0].kdvPercent).toBe(0);
  });

  it('updates id (no longer skips onChanged — S-5 fix)', () => {
    const session = new InvoiceSession();
    let validateCount = 0;
    session.on('warnings', () => validateCount++);
    session.update(SessionPaths.id, 'INV2026000001');
    expect(session.input.id).toBe('INV2026000001');
    expect(validateCount).toBeGreaterThan(0);     // S-5: validate() artık tetiklenir
  });

  it('updates datetime (S-5: validate tetiklenir)', () => {
    const session = new InvoiceSession();
    let validateCount = 0;
    session.on('warnings', () => validateCount++);
    session.update(SessionPaths.datetime, '2026-04-27T10:00:00');
    expect(session.input.datetime).toBe('2026-04-27T10:00:00');
    expect(validateCount).toBeGreaterThan(0);
  });

  it('creates opsiyonel sub-object on first set (D-6: paymentMeans)', () => {
    const session = new InvoiceSession();
    session.update(SessionPaths.paymentMeansMeansCode, '1');
    expect(session.input.paymentMeans).toEqual({ meansCode: '1' });
  });

  it('updates double-indexed field (lines[0].taxes[0].percent)', () => {
    const session = new InvoiceSession();
    session.addLine({
      name: 'L1', quantity: 1, price: 100, kdvPercent: 18,
      taxes: [{ code: '0071', percent: 25 }],
    });
    session.update(SessionPaths.lineTaxPercent(0, 0), 30);
    expect(session.input.lines[0].taxes![0].percent).toBe(30);
    expect(session.input.lines[0].taxes![0].code).toBe('0071');
  });
});

describe('InvoiceSession.update() — liability path özel-durum', () => {
  it('emits liability-changed snapshot event', () => {
    const session = new InvoiceSession({ liability: undefined });
    let payload: any = null;
    session.on('liability-changed', (p) => payload = p);
    session.update(SessionPaths.liability, 'einvoice');
    expect(payload).toEqual({ liability: 'einvoice', previousLiability: undefined });
  });

  it('reads previous liability from _liability private field (not _input)', () => {
    const session = new InvoiceSession({ liability: 'einvoice' });
    session.update(SessionPaths.liability, 'earchive');
    expect(session.liability).toBe('earchive');
  });

  it('updates session.liability getter', () => {
    const session = new InvoiceSession();
    session.update(SessionPaths.liability, 'einvoice');
    expect(session.liability).toBe('einvoice');
  });

  it('emits ui-state-changed after liability update', () => {
    const session = new InvoiceSession();
    let count = 0;
    session.on('ui-state-changed', () => count++);
    session.update(SessionPaths.liability, 'einvoice');
    expect(count).toBeGreaterThan(0);
  });
});

describe('InvoiceSession.update() — onChanged chain (mevcut)', () => {
  it('triggers changed event after successful update', () => {
    const session = new InvoiceSession();
    let payload: any = null;
    session.on('changed', (p) => payload = p);
    session.update(SessionPaths.id, 'X');
    expect(payload).not.toBeNull();
    expect(payload.id).toBe('X');
  });

  it('triggers warnings event after successful update (validate chain)', () => {
    const session = new InvoiceSession();
    let count = 0;
    session.on('warnings', () => count++);
    session.update(SessionPaths.type, 'IADE');
    expect(count).toBeGreaterThan(0);
  });
});
