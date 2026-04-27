/**
 * Validator pipeline + cache testleri (Sprint 8h.7 / AR-10).
 *
 * 5 validator (line-range, manual-exemption, phantom-kdv, sgk-input, cross-matrix)
 * deterministic + ValidationError↔ValidationWarning köprü + validation-error event
 * + getCachedInvoiceInput reference equality cache (D-3).
 */

import { describe, it, expect } from 'vitest';
import { InvoiceSession } from '../../src/calculator/invoice-session';
import { SessionPaths } from '../../src/calculator/session-paths.generated';
import type { ValidationError } from '../../src/errors/ubl-build-error';

describe('5 validator session pipeline (Sprint 8h.7)', () => {
  it('validateSimpleLineRanges: kdvPercent > 100 → error (line-range validator aktif)', () => {
    const session = new InvoiceSession({
      autoCalculate: false,
      initialInput: {
        lines: [{ name: 'L1', quantity: 1, price: 100, kdvPercent: 150 }],
      },
    });
    const warnings = session.validate();
    const rangeErr = warnings.find(w => w.code && w.message.toLowerCase().includes('kdv'));
    expect(rangeErr).toBeDefined();
  });

  it('validateManualExemption: KDV=0 + non-self-exemption type + no exemption → error', () => {
    const session = new InvoiceSession({
      autoCalculate: false,
      initialInput: {
        type: 'SATIS',
        lines: [{ name: 'L1', quantity: 1, price: 100, kdvPercent: 0 }],
      },
    });
    const warnings = session.validate();
    const manualErr = warnings.find(w => w.code && w.message.toLowerCase().includes('istisna'));
    expect(manualErr).toBeDefined();
  });

  it('validatePhantomKdv: YATIRIMTESVIK+ISTISNA + line.kdvPercent=0 → error (phantom-kdv aktif)', () => {
    const session = new InvoiceSession({
      autoCalculate: false,
      initialInput: {
        profile: 'YATIRIMTESVIK',
        type: 'ISTISNA',
        ytbNo: '123456',
        lines: [{
          name: 'L1', quantity: 1, price: 100, kdvPercent: 0,
          itemClassificationCode: '01',
        }],
      },
    });
    const warnings = session.validate();
    // Phantom KDV her satırda 0 < kdvPercent ≤ 100 zorunlu
    const phantomErr = warnings.find(w => w.code);
    expect(phantomErr).toBeDefined();
  });

  it('validateSgkInput: SGK type + sgk obje yok → error', () => {
    const session = new InvoiceSession({
      autoCalculate: false,
      initialInput: {
        type: 'SGK',
        // sgk obje yok
      },
    });
    const warnings = session.validate();
    const sgkErr = warnings.find(w => w.message.toLowerCase().includes('sgk'));
    expect(sgkErr).toBeDefined();
  });

  it('validateCrossMatrix: PROFILE_TYPE_MATRIX whitelist (cross-matrix aktif)', () => {
    const session = new InvoiceSession({
      autoCalculate: false,
      initialInput: {
        profile: 'EARSIVFATURA',
        type: 'KDVTEVKIFAT',     // EARSIVFATURA için geçersiz tip kombinasyon
        lines: [{ name: 'L1', quantity: 1, price: 100, kdvPercent: 18 }],
      },
    });
    const warnings = session.validate();
    // Cross-matrix non-whitelist combo error üretmeli
    expect(warnings.length).toBeGreaterThan(0);
  });
});

describe('ValidationError ↔ ValidationWarning köprü', () => {
  it('bridged warnings code alanini tasir', () => {
    const session = new InvoiceSession({
      autoCalculate: false,
      initialInput: {
        type: 'SATIS',
        lines: [{ name: 'L1', quantity: 1, price: 100, kdvPercent: 0 }],
      },
    });
    const warnings = session.validate();
    const bridged = warnings.filter(w => w.code !== undefined);
    expect(bridged.length).toBeGreaterThan(0);
    expect(bridged[0].code).toBeDefined();
    expect(typeof bridged[0].code).toBe('string');
  });

  it('rules-based warnings have no code (only bridged ones do)', () => {
    const session = new InvoiceSession({
      autoCalculate: false,
      initialInput: {
        profile: 'KAMU',
        // KAMU için paymentMeans zorunlu (rules-based check)
      },
    });
    const warnings = session.validate();
    const rulesWarnings = warnings.filter(w => w.code === undefined);
    expect(rulesWarnings.length).toBeGreaterThan(0);
  });

  it('bridged warning severity always "error"', () => {
    const session = new InvoiceSession({
      autoCalculate: false,
      initialInput: {
        lines: [{ name: 'L1', quantity: 1, price: 100, kdvPercent: 200 }],
      },
    });
    const warnings = session.validate();
    const bridged = warnings.filter(w => w.code !== undefined);
    bridged.forEach(w => expect(w.severity).toBe('error'));
  });
});

describe('validation-error event (raw stream)', () => {
  it('emits ValidationError[] on every validate()', () => {
    const session = new InvoiceSession({ autoCalculate: false });
    let emitted: ValidationError[] | null = null;
    session.on('validation-error', (errors) => emitted = errors);
    session.validate();
    expect(emitted).not.toBeNull();
    expect(Array.isArray(emitted)).toBe(true);
  });

  it('emits non-empty errors when validators find issues', () => {
    const session = new InvoiceSession({
      autoCalculate: false,
      initialInput: {
        lines: [{ name: 'L1', quantity: 1, price: 100, kdvPercent: 200 }],     // range error
      },
    });
    let emitted: ValidationError[] = [];
    session.on('validation-error', (errors) => emitted = errors);
    session.validate();
    expect(emitted.length).toBeGreaterThan(0);
  });

  it('errors include path field (ValidationError.path)', () => {
    const session = new InvoiceSession({
      autoCalculate: false,
      initialInput: {
        lines: [{ name: 'L1', quantity: 1, price: 100, kdvPercent: 200 }],
      },
    });
    let emitted: ValidationError[] = [];
    session.on('validation-error', (errors) => emitted = errors);
    session.validate();
    const withPath = emitted.find(e => e.path && e.path.includes('lines'));
    expect(withPath).toBeDefined();
  });
});

describe('toInvoiceInput cache (D-3 reference equality)', () => {
  it('returns same instance on repeated calls without mutation', () => {
    const session = new InvoiceSession({
      initialInput: {
        sender: { taxNumber: '1234567890', name: 'X', taxOffice: 'X', address: 'X', district: 'X', city: 'X' },
        customer: { taxNumber: '9876543210', name: 'Y', taxOffice: 'Y', address: 'Y', district: 'Y', city: 'Y' },
        lines: [{ name: 'L1', quantity: 1, price: 100, kdvPercent: 18 }],
      },
    });
    const first = session.toInvoiceInput();
    const second = session.toInvoiceInput();
    expect(first).toBe(second);     // reference equality
  });

  it('invalidates on update() mutation', () => {
    const session = new InvoiceSession({
      initialInput: {
        sender: { taxNumber: '1234567890', name: 'X', taxOffice: 'X', address: 'X', district: 'X', city: 'X' },
        customer: { taxNumber: '9876543210', name: 'Y', taxOffice: 'Y', address: 'Y', district: 'Y', city: 'Y' },
        lines: [{ name: 'L1', quantity: 1, price: 100, kdvPercent: 18 }],
      },
    });
    const first = session.toInvoiceInput();
    session.update(SessionPaths.senderName, 'Updated');
    const second = session.toInvoiceInput();
    expect(first).not.toBe(second);     // cache invalidated
  });

  it('preserves cache on no-op update (diff false)', () => {
    const session = new InvoiceSession({
      initialInput: {
        sender: { taxNumber: '1234567890', name: 'Acme', taxOffice: 'X', address: 'X', district: 'X', city: 'X' },
        customer: { taxNumber: '9876543210', name: 'Y', taxOffice: 'Y', address: 'Y', district: 'Y', city: 'Y' },
        lines: [{ name: 'L1', quantity: 1, price: 100, kdvPercent: 18 }],
      },
    });
    const first = session.toInvoiceInput();
    session.update(SessionPaths.senderName, 'Acme');     // same value, no-op
    const second = session.toInvoiceInput();
    expect(first).toBe(second);     // cache preserved
  });

  it('invalidates on addLine', () => {
    const session = new InvoiceSession({
      initialInput: {
        sender: { taxNumber: '1234567890', name: 'X', taxOffice: 'X', address: 'X', district: 'X', city: 'X' },
        customer: { taxNumber: '9876543210', name: 'Y', taxOffice: 'Y', address: 'Y', district: 'Y', city: 'Y' },
        lines: [{ name: 'L1', quantity: 1, price: 100, kdvPercent: 18 }],
      },
    });
    const first = session.toInvoiceInput();
    session.addLine({ name: 'L2', quantity: 1, price: 50, kdvPercent: 8 });
    const second = session.toInvoiceInput();
    expect(first).not.toBe(second);
  });
});

describe('CALCULATION_ERROR handling (validateCrossMatrix throw)', () => {
  it('mapper throw → CALCULATION_ERROR validation hatası, error event uncaught olmaz', () => {
    const session = new InvoiceSession({
      autoCalculate: false,
      initialInput: {
        type: 'TEVKIFAT',
        sender: { taxNumber: '1234567890', name: 'X', taxOffice: 'X', address: 'X', district: 'X', city: 'X' },
        customer: { taxNumber: '9876543210', name: 'Y', taxOffice: 'Y', address: 'Y', district: 'Y', city: 'Y' },
        lines: [{
          name: 'L1', quantity: 1, price: 100, kdvPercent: 18,
          withholdingTaxCode: '650',     // dinamik percent eksik → calculator throw
        }],
      },
    });
    const warnings = session.validate();
    const calcErr = warnings.find(w => w.code === 'CALCULATION_ERROR');
    expect(calcErr).toBeDefined();
    expect(calcErr!.message).toMatch(/650/);
  });
});
