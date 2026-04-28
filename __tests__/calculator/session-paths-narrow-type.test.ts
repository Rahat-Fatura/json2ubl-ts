/**
 * SessionPaths fonksiyon path narrow literal return type testi (Sprint 8k.2 /
 * Library Öneri #2).
 *
 * v2.2.2'ye kadar `SessionPaths.senderIdentificationSchemeId(0)` plain
 * `string` döndürüyordu; `update<P extends keyof SessionPathMap>(path: P, ...)`
 * generic'iyle assign etmek için `as any` cast gerekliydi (S-8 ihlali).
 *
 * v2.2.3 generator output: `(i: number) => \`...[${i}]...\` as \`...[${number}]...\``
 * narrow cast eklendi → cast'siz `update()` çağrısı compile-time tip güvenliği sağlar.
 *
 * Bu testteki `_check` satırları compile-time type assertion. Test
 * çalışırken runtime davranış da doğrulanır (return değeri doğru template).
 */

import { describe, it, expect } from 'vitest';
import { SessionPaths, type SessionPathMap, InvoiceSession } from '../../src';

describe('SessionPaths narrow path return type (Sprint 8k.2)', () => {
  it('identifications path narrow assignable to keyof SessionPathMap', () => {
    const path = SessionPaths.senderIdentificationSchemeId(0);
    const _check: keyof SessionPathMap = path;
    expect(path).toBe('sender.identifications[0].schemeId');
    expect(_check).toBe(path);
  });

  it('lineKdvPercent narrow assignable', () => {
    const path = SessionPaths.lineKdvPercent(0);
    const _check: keyof SessionPathMap = path;
    expect(path).toBe('lines[0].kdvPercent');
    expect(_check).toBe(path);
  });

  it('double-indexed lineTaxCode narrow assignable', () => {
    const path = SessionPaths.lineTaxCode(0, 1);
    const _check: keyof SessionPathMap = path;
    expect(path).toBe('lines[0].taxes[1].code');
    expect(_check).toBe(path);
  });

  it('cast-free integration with InvoiceSession.update() generic', () => {
    const session = new InvoiceSession();
    session.addLine({ name: 'L1', quantity: 1, price: 100, kdvPercent: 18 });
    // Aşağıdaki çağrılar `as any` cast'i olmadan compile etmeli — generic
    // narrow tip ile anonim cast olmadan doğrulanır.
    session.update(SessionPaths.senderIdentificationSchemeId(0), 'MERSISNO');
    session.update(SessionPaths.senderIdentificationValue(0), '0123456789012345');
    session.update(SessionPaths.lineKdvPercent(0), 20);
    session.update(SessionPaths.lineTaxCode(0, 0), '0071');
    expect(session.input.sender.identifications?.[0]?.schemeId).toBe('MERSISNO');
    expect(session.input.lines[0]?.kdvPercent).toBe(20);
  });
});
