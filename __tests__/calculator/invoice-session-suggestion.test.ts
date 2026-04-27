/**
 * InvoiceSession suggestion event integration testleri (Sprint 8i.1 / AR-10 Faz 2).
 *
 * 8i.1 skeleton: SUGGESTION_RULES manifest boş, dolayısıyla suggestion event
 * hiçbir senaryoda emit EDİLMEZ. Bu testler kontrat'ı doğrular:
 * - Event tipi SessionEvents'e eklendi
 * - Pipeline validate() sonunda çağrılır
 * - Boş manifest senaryosunda emit yok (T-4 ile uyumlu)
 *
 * 8i.2'den itibaren kurallar eklendiğinde aynı testler GENİŞLETİLİR (sample integration).
 */

import { describe, it, expect } from 'vitest';
import { InvoiceSession } from '../../src/calculator/invoice-session';
import type { Suggestion } from '../../src/calculator/suggestion-types';
import { SessionPaths } from '../../src/calculator/session-paths.generated';

describe('InvoiceSession.suggestion event — skeleton (8i.1, manifest boş)', () => {
  it('on("suggestion", cb) — handler kayıt edilebilir (TS + runtime kontratı)', () => {
    const session = new InvoiceSession();
    const handler = (_payload: Suggestion[]) => {};
    expect(() => session.on('suggestion', handler)).not.toThrow();
  });

  it('initial state: hiçbir suggestion event emit edilmez', () => {
    const captured: Suggestion[][] = [];
    const session = new InvoiceSession();
    session.on('suggestion', (p) => captured.push(p));
    expect(captured).toHaveLength(0);
  });

  it('validate() çağrısı + boş manifest → suggestion emit yok', () => {
    const captured: Suggestion[][] = [];
    const session = new InvoiceSession({ initialInput: { type: 'SATIS', profile: 'TEMELFATURA' } });
    session.on('suggestion', (p) => captured.push(p));
    session.validate();
    expect(captured).toHaveLength(0);
  });

  it('update() chain + hiçbir kural tetiklenmez (TRY currency, line yok) → suggestion emit yok', () => {
    const captured: Suggestion[][] = [];
    const session = new InvoiceSession({
      initialInput: { type: 'SATIS', profile: 'TEMELFATURA' },
      autoCalculate: true,
    });
    session.on('suggestion', (p) => captured.push(p));
    session.update(SessionPaths.profile, 'TICARIFATURA');
    session.update(SessionPaths.currencyCode, 'TRY'); // USD currency-rate kuralı tetikler
    expect(captured).toHaveLength(0);
  });

  it('addLine sonrası boş manifest → suggestion emit yok', () => {
    const captured: Suggestion[][] = [];
    const session = new InvoiceSession({ initialInput: { type: 'SATIS', profile: 'TEMELFATURA' } });
    session.on('suggestion', (p) => captured.push(p));
    session.addLine({ name: 'Test ürün', quantity: 1, price: 100, kdvPercent: 18 });
    expect(captured).toHaveLength(0);
  });

  it('art arda 3 validate() — manifest boş, emit hep boş', () => {
    const captured: Suggestion[][] = [];
    const session = new InvoiceSession({ initialInput: { type: 'SATIS', profile: 'TEMELFATURA' } });
    session.on('suggestion', (p) => captured.push(p));
    session.validate();
    session.validate();
    session.validate();
    expect(captured).toHaveLength(0);
  });

  it('emit("suggestion", []) — sentetik emit handler çağırır (runtime kontratı)', () => {
    const captured: Suggestion[][] = [];
    const session = new InvoiceSession();
    session.on('suggestion', (p) => captured.push(p));
    // Manuel emit (sadece tip kontratı testi — gerçek pipeline asla [] emit etmez)
    (session as unknown as { emit: (e: string, p: unknown) => void }).emit('suggestion', []);
    expect(captured).toHaveLength(1);
    expect(captured[0]).toEqual([]);
  });

  it('suggestion event sıralaması: warnings event\'inden sonra çağrılır', () => {
    const order: string[] = [];
    const session = new InvoiceSession({ initialInput: { type: 'SATIS', profile: 'TEMELFATURA' } });
    session.on('warnings', () => order.push('warnings'));
    session.on('suggestion', () => order.push('suggestion'));
    // Manifest boş → suggestion emit yok, sadece warnings emit
    session.validate();
    expect(order).toEqual(['warnings']);
    // suggestion event eklenmedi çünkü manifest boş; 8i.2'den itibaren genişler
  });

  it('SessionEvents tip kontratı: suggestion event Suggestion[] payload bekler', () => {
    const session = new InvoiceSession();
    // TypeScript compile zamanı kontrol — runtime no-op
    const handler: (p: Suggestion[]) => void = (p) => {
      expect(Array.isArray(p)).toBe(true);
    };
    session.on('suggestion', handler);
  });

  it('suggestion event tipi `Suggestion[]` batch (T-3 batch payload)', () => {
    const captured: unknown[] = [];
    const session = new InvoiceSession();
    session.on('suggestion', (p) => captured.push(p));
    (session as unknown as { emit: (e: string, p: Suggestion[]) => void }).emit('suggestion', [
      { path: 'a', value: 1, reason: 'r', severity: 'recommended', ruleId: 'test/1' },
      { path: 'b', value: 2, reason: 'r', severity: 'optional', ruleId: 'test/2' },
    ]);
    expect(captured).toHaveLength(1);
    expect(captured[0]).toEqual([
      { path: 'a', value: 1, reason: 'r', severity: 'recommended', ruleId: 'test/1' },
      { path: 'b', value: 2, reason: 'r', severity: 'optional', ruleId: 'test/2' },
    ]);
  });
});
