/**
 * InvoiceSession suggestion integration testleri (Sprint 8i.7 / AR-10 Faz 2).
 *
 * 23 kuralın session ile end-to-end testleri:
 * - Domain bazlı senaryolar (KDV/Tevkifat/IHRACKAYITLI/YTB/Delivery/Misc)
 * - Event sıralaması (suggestion 19. adımdan sonra emit)
 * - Diff algoritması session-level (T-2): aynı state 2x → 2. emit yok
 * - Multi-rule: aynı path için 2 kural paralel
 * - Resolved: kural state değişti, sonraki tick'te yokluğu UI fark eder (T-4)
 *
 * Plan §5.1 grupları: event sequence + diff + sample integration.
 */

import { describe, it, expect } from 'vitest';
import { InvoiceSession } from '../../src/calculator/invoice-session';
import type { Suggestion } from '../../src/calculator/suggestion-types';
import { SessionPaths } from '../../src/calculator/session-paths.generated';

function captureSuggestions(session: InvoiceSession): Suggestion[][] {
  const captured: Suggestion[][] = [];
  session.on('suggestion', (p) => captured.push(p));
  return captured;
}

describe('Domain integration: KDV', () => {
  it('TEMELFATURA + addLine kdv=0 → kdv/zero-suggest-351 emit', () => {
    const session = new InvoiceSession({ initialInput: { type: 'SATIS', profile: 'TEMELFATURA' } });
    const captured = captureSuggestions(session);
    session.addLine({ name: 'X', quantity: 1, price: 100, kdvPercent: 0 });
    const flat = captured.flat();
    expect(flat.some(s => s.ruleId === 'kdv/zero-suggest-351' && s.value === '351')).toBe(true);
  });

  it('YATIRIMTESVIK + ISTISNA + itemClass=01 + kdv=0 → ytb-istisna-308 emit', () => {
    const session = new InvoiceSession({
      initialInput: { type: 'ISTISNA', profile: 'YATIRIMTESVIK' },
    });
    const captured = captureSuggestions(session);
    session.addLine({ name: 'CNC Tezgahı', quantity: 1, price: 100000, kdvPercent: 0, itemClassificationCode: '01' });
    const flat = captured.flat();
    expect(flat.some(s => s.ruleId === 'kdv/ytb-istisna-suggest-308' && s.value === '308')).toBe(true);
  });

  it('kdv=8 → reduced-rate-suggest-8-10 emit (optional)', () => {
    const session = new InvoiceSession({ initialInput: { type: 'SATIS', profile: 'TEMELFATURA' } });
    const captured = captureSuggestions(session);
    session.addLine({ name: 'X', quantity: 1, price: 100, kdvPercent: 8 });
    const flat = captured.flat();
    const sug = flat.find(s => s.ruleId === 'kdv/reduced-rate-suggest-8-10');
    expect(sug).toBeDefined();
    expect(sug?.severity).toBe('optional');
  });
});

describe('Domain integration: Tevkifat', () => {
  it('TEVKIFAT + boş withholdingTaxCode → tevkifat-default-codes emit', () => {
    const session = new InvoiceSession({ initialInput: { type: 'TEVKIFAT', profile: 'TICARIFATURA' } });
    const captured = captureSuggestions(session);
    session.addLine({ name: 'Hizmet', quantity: 1, price: 1000, kdvPercent: 18 });
    const flat = captured.flat();
    expect(flat.some(s => s.ruleId === 'withholding/tevkifat-default-codes' && s.value === '602')).toBe(true);
  });

  it('TEVKIFAT + withholding=650 + percent boş → 650-percent-required emit', () => {
    // autoCalculate=false: 650+percent eksik line-calculator throw eder, calculate atlanır
    const session = new InvoiceSession({
      initialInput: { type: 'TEVKIFAT', profile: 'TICARIFATURA' },
      autoCalculate: false,
    });
    const captured = captureSuggestions(session);
    session.addLine({ name: 'Hizmet', quantity: 1, price: 1000, kdvPercent: 18, withholdingTaxCode: '650' });
    const flat = captured.flat();
    expect(flat.some(s => s.ruleId === 'withholding/650-percent-required')).toBe(true);
  });
});

describe('Domain integration: IHRACKAYITLI', () => {
  it('IHRACKAYITLI + line + boş kod → 702-default-suggestion emit', () => {
    const session = new InvoiceSession({ initialInput: { type: 'IHRACKAYITLI', profile: 'TICARIFATURA' } });
    const captured = captureSuggestions(session);
    session.addLine({ name: 'İhraç ürün', quantity: 1, price: 1000, kdvPercent: 0 });
    const flat = captured.flat();
    expect(flat.some(s => s.ruleId === 'ihrackayitli/702-default-suggestion' && s.value === '702')).toBe(true);
  });
});

describe('Domain integration: YATIRIMTESVIK', () => {
  it('YATIRIMTESVIK + boş itemClass + name="Makine" → itemclass-default 01', () => {
    const session = new InvoiceSession({ initialInput: { type: 'ISTISNA', profile: 'YATIRIMTESVIK' } });
    const captured = captureSuggestions(session);
    session.addLine({ name: 'Makine', quantity: 1, price: 100000, kdvPercent: 0 });
    const flat = captured.flat();
    expect(flat.some(s => s.ruleId === 'yatirim-tesvik/itemclass-default' && s.value === '01')).toBe(true);
  });

  it('YATIRIMTESVIK + name="İnşaat" → insaat-suggest-itemclass-02 (heuristic)', () => {
    const session = new InvoiceSession({ initialInput: { type: 'ISTISNA', profile: 'YATIRIMTESVIK' } });
    const captured = captureSuggestions(session);
    session.addLine({ name: 'İnşaat malzemesi', quantity: 100, price: 50, kdvPercent: 0 });
    const flat = captured.flat();
    expect(flat.some(s => s.ruleId === 'yatirim-tesvik/insaat-suggest-itemclass-02')).toBe(true);
  });
});

describe('Domain integration: Delivery + Misc', () => {
  it('IHRACAT profile + line + boş incoterms → ihracat-incoterms-required emit', () => {
    const session = new InvoiceSession({
      initialInput: { type: 'ISTISNA', profile: 'IHRACAT' },
      isExport: true,
    });
    const captured = captureSuggestions(session);
    session.addLine({ name: 'İhraç', quantity: 1, price: 1000, kdvPercent: 0 });
    const flat = captured.flat();
    expect(flat.some(s => s.ruleId === 'delivery/ihracat-incoterms-required' && s.value === 'CIF')).toBe(true);
  });

  it('USD currency + exchangeRate boş → currency/exchange-rate-required emit', () => {
    const session = new InvoiceSession({
      initialInput: { type: 'SATIS', profile: 'TEMELFATURA', currencyCode: 'USD' },
    });
    const captured = captureSuggestions(session);
    session.addLine({ name: 'X', quantity: 1, price: 100, kdvPercent: 18 });
    const flat = captured.flat();
    expect(flat.some(s => s.ruleId === 'currency/exchange-rate-required')).toBe(true);
  });
});

describe('Diff algoritması session-level (T-2)', () => {
  it('Aynı state 2x validate → 2. emit yok (idempotent)', () => {
    const session = new InvoiceSession({ initialInput: { type: 'SATIS', profile: 'TEMELFATURA' } });
    session.addLine({ name: 'X', quantity: 1, price: 100, kdvPercent: 0 }); // 1. emit
    const captured = captureSuggestions(session);
    session.validate(); // 2. validate, state aynı
    expect(captured).toHaveLength(0);
  });

  it('Kural state değişti (kdv 0→18) → emit yok (kural artık tetiklenmez), removed iç hesaplanır', () => {
    const session = new InvoiceSession({ initialInput: { type: 'SATIS', profile: 'TEMELFATURA' } });
    session.addLine({ name: 'X', quantity: 1, price: 100, kdvPercent: 0 }); // suggestion var
    const captured = captureSuggestions(session);
    session.update(SessionPaths.lineKdvPercent(0), 18); // kural artık tetiklenmez
    // Yeni suggestion yok, removed da emit edilmez (T-4)
    const flat = captured.flat();
    expect(flat.every(s => s.ruleId !== 'kdv/zero-suggest-351')).toBe(true);
  });

  it('Yeni kural state oluştu → emit (added)', () => {
    const session = new InvoiceSession({ initialInput: { type: 'SATIS', profile: 'TEMELFATURA' } });
    session.addLine({ name: 'X', quantity: 1, price: 100, kdvPercent: 18 });
    const captured = captureSuggestions(session);
    session.update(SessionPaths.lineKdvPercent(0), 0); // KDV=0 oldu, kural tetiklenir
    const flat = captured.flat();
    expect(flat.some(s => s.ruleId === 'kdv/zero-suggest-351')).toBe(true);
  });

  it('Çoklu satır: 2 satır kdv=0 → 2 ayrı suggestion (path bazlı)', () => {
    const session = new InvoiceSession({ initialInput: { type: 'SATIS', profile: 'TEMELFATURA' } });
    const captured = captureSuggestions(session);
    session.addLine({ name: 'A', quantity: 1, price: 100, kdvPercent: 0 });
    session.addLine({ name: 'B', quantity: 1, price: 200, kdvPercent: 0 });
    const flat = captured.flat();
    const zero351 = flat.filter(s => s.ruleId === 'kdv/zero-suggest-351');
    const paths = new Set(zero351.map(s => s.path));
    expect(paths.has('lines[0].kdvExemptionCode')).toBe(true);
    expect(paths.has('lines[1].kdvExemptionCode')).toBe(true);
  });
});

describe('Multi-rule paralel: aynı path için 2 kural', () => {
  it('TEVKIFAT + withholding+exemption aynı satır → kdv/exemption-mismatch + withholding/exemption-conflict 2 paralel suggestion', () => {
    const session = new InvoiceSession({ initialInput: { type: 'TEVKIFAT', profile: 'TICARIFATURA' } });
    const captured = captureSuggestions(session);
    session.addLine({
      name: 'Hizmet',
      quantity: 1,
      price: 1000,
      kdvPercent: 0,
      withholdingTaxCode: '602',
      kdvExemptionCode: '351',
    });
    const flat = captured.flat();
    const ruleIds = flat.map(s => s.ruleId);
    expect(ruleIds).toContain('kdv/exemption-mismatch-tax-type');
    expect(ruleIds).toContain('withholding/exemption-conflict');
  });
});

describe('Boş diff: emit yok kontratı', () => {
  it('addLine kdv=18 + tüm kurallar applies false → emit yok', () => {
    const session = new InvoiceSession({ initialInput: { type: 'SATIS', profile: 'TEMELFATURA', currencyCode: 'TRY' } });
    const captured = captureSuggestions(session);
    session.addLine({ name: 'X', quantity: 1, price: 100, kdvPercent: 18, kdvExemptionCode: undefined });
    expect(captured).toHaveLength(0);
  });

  it('Initial state (line yok) → emit yok', () => {
    const captured: Suggestion[][] = [];
    const session = new InvoiceSession({ initialInput: { type: 'SATIS', profile: 'TEMELFATURA' } });
    session.on('suggestion', (p) => captured.push(p));
    expect(captured).toHaveLength(0);
  });
});

describe('Severity ve payload kontratı', () => {
  it('Suggestion payload Suggestion[] tipinde batch (T-3)', () => {
    const session = new InvoiceSession({ initialInput: { type: 'SATIS', profile: 'TEMELFATURA' } });
    const captured = captureSuggestions(session);
    session.addLine({ name: 'X', quantity: 1, price: 100, kdvPercent: 0 });
    expect(captured.length).toBeGreaterThan(0);
    const first = captured[0];
    expect(Array.isArray(first)).toBe(true);
    if (first.length > 0) {
      const s = first[0];
      expect(s).toHaveProperty('path');
      expect(s).toHaveProperty('value');
      expect(s).toHaveProperty('reason');
      expect(s).toHaveProperty('severity');
      expect(s).toHaveProperty('ruleId');
      expect(['recommended', 'optional']).toContain(s.severity);
    }
  });

  it('Severity 2-seviye konvansiyonu (T-1)', () => {
    const session = new InvoiceSession({ initialInput: { type: 'SATIS', profile: 'TEMELFATURA' } });
    const captured = captureSuggestions(session);
    // Birden fazla kuralı tetikleyen senaryo
    session.addLine({ name: 'X', quantity: 1, price: 100, kdvPercent: 0 }); // kdv/zero-suggest-351 (recommended)
    session.addLine({ name: 'Y', quantity: 1, price: 100, kdvPercent: 8 });  // reduced-rate-suggest-8-10 (optional)
    const flat = captured.flat();
    const severities = new Set(flat.map(s => s.severity));
    expect(severities.size).toBeGreaterThanOrEqual(1);
    severities.forEach(s => expect(['recommended', 'optional']).toContain(s));
  });
});
