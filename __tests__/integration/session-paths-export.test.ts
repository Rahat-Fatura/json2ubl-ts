/**
 * SessionPaths public runtime export testleri (Sprint 8j.1).
 *
 * Bulgu: v2.2.0'da `SessionPaths` constant generated dosyada vardı ama
 * ana paket entry'sinden re-export edilmemişti — README örnekleri
 * `import { SessionPaths } from '@rahat-fatura/json2ubl-ts'` formundaydı,
 * fakat runtime'da bulunmuyordu. v2.2.1 ile re-export eklendi.
 *
 * Bu test paketi public surface'i kontrol eder: kütüphane index'inden
 * `SessionPaths` ve `SessionPathMap` import edilebiliyor mu, doğru
 * şekilde tipli mi, tüm bilinen alanlar erişilebilir mi.
 */

import { describe, it, expect } from 'vitest';
import {
  SessionPaths,
  type SessionPathMap,
  InvoiceSession,
} from '../../src';

describe('SessionPaths public export (Sprint 8j.1)', () => {
  it('is importable from main package entry as a runtime constant', () => {
    expect(SessionPaths).toBeDefined();
    expect(typeof SessionPaths).toBe('object');
  });

  it('exposes well-known top-level path constants as strings', () => {
    expect(SessionPaths.senderTaxNumber).toBe('sender.taxNumber');
    expect(SessionPaths.customerTaxNumber).toBe('customer.taxNumber');
    expect(SessionPaths.type).toBe('type');
    expect(SessionPaths.profile).toBe('profile');
    expect(SessionPaths.liability).toBe('liability');
  });

  it('exposes line-level path templates as functions returning bracket notation', () => {
    expect(typeof SessionPaths.lineKdvPercent).toBe('function');
    expect(SessionPaths.lineKdvPercent(0)).toBe('lines[0].kdvPercent');
    expect(SessionPaths.lineKdvPercent(3)).toBe('lines[3].kdvPercent');
  });

  it('exposes double-indexed path templates (lines[i].taxes[ti].*) as functions', () => {
    expect(typeof SessionPaths.lineTaxCode).toBe('function');
    expect(SessionPaths.lineTaxCode(0, 1)).toBe('lines[0].taxes[1].code');
  });

  it('integrates with InvoiceSession.update() — round-trip path-based mutation', () => {
    const session = new InvoiceSession();
    session.addLine({ name: 'Ürün A', quantity: 1, price: 100, kdvPercent: 18 });
    session.update(SessionPaths.senderTaxNumber, '1234567890');
    session.update(SessionPaths.lineKdvPercent(0), 20);
    expect(session.input.sender.taxNumber).toBe('1234567890');
    expect(session.input.lines[0]?.kdvPercent).toBe(20);
  });

  it('preserves type narrowing for SessionPathMap (compile-time contract)', () => {
    const path: keyof SessionPathMap = SessionPaths.senderTaxNumber;
    expect(path).toBe('sender.taxNumber');
  });
});
