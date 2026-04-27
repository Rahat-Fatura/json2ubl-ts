/**
 * SuggestionEngine performance benchmark (Sprint 8i.8 / AR-10 Faz 2).
 *
 * MR-1 + master plan §3.4 mitigation:
 * - Suggestion engine alt-bütçe: ≤5ms (23 kural × 100 satır = 2300 evaluation)
 * - Toplam pipeline (validate + suggestion + UI state): ≤15ms threshold
 *
 * Aşılırsa Sprint 8i.8 sonrası `autoCalculate: false` veya kural caching/grouping refactor
 * kararı Berkay'ın (R2 mitigation).
 *
 * Standart vitest run ile çalışır — performance.now() bazlı timing.
 */

import { describe, it, expect } from 'vitest';
import { performance } from 'node:perf_hooks';
import { runSuggestionEngine } from '../../src/calculator/suggestion-engine';
import { InvoiceSession } from '../../src/calculator/invoice-session';
import { deriveUIState } from '../../src/calculator/invoice-rules';
import { SessionPaths } from '../../src/calculator/session-paths.generated';
import type { SimpleInvoiceInput, SimpleLineInput } from '../../src/calculator/simple-types';

const SUGGESTION_THRESHOLD_MS = 5;
const TOTAL_THRESHOLD_MS = 15;

function makeInput(lineCount: number, lineKdv: number = 0): SimpleInvoiceInput {
  const lines: SimpleLineInput[] = Array.from({ length: lineCount }, (_, i) => ({
    name: `Demo Item ${i}`,
    quantity: 1,
    price: 100 + i,
    kdvPercent: lineKdv,
  }));
  return {
    type: 'SATIS',
    profile: 'TEMELFATURA',
    currencyCode: 'TRY',
    lines,
  };
}

describe('SuggestionEngine performance bench (Sprint 8i.8 / R2 mitigation)', () => {
  it('100 satır × 23 kural × kdv=0 (max trigger) → engine ≤5ms', () => {
    const input = makeInput(100, 0);
    const ui = deriveUIState(input.type!, input.profile!);

    // Warmup
    for (let i = 0; i < 5; i++) runSuggestionEngine(input, ui);

    const iterations = 100;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      runSuggestionEngine(input, ui);
    }
    const avgMs = (performance.now() - start) / iterations;

    console.log(`[bench] suggestion engine 100-line kdv=0: avg=${avgMs.toFixed(3)}ms (threshold ${SUGGESTION_THRESHOLD_MS}ms)`);
    expect(avgMs).toBeLessThan(SUGGESTION_THRESHOLD_MS);
  });

  it('100 satır × 23 kural × kdv=18 (min trigger) → engine ≤5ms (early exit gerçekleşmeli)', () => {
    const input = makeInput(100, 18);
    const ui = deriveUIState(input.type!, input.profile!);

    for (let i = 0; i < 5; i++) runSuggestionEngine(input, ui);

    const iterations = 100;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      runSuggestionEngine(input, ui);
    }
    const avgMs = (performance.now() - start) / iterations;

    console.log(`[bench] suggestion engine 100-line kdv=18: avg=${avgMs.toFixed(3)}ms (threshold ${SUGGESTION_THRESHOLD_MS}ms)`);
    expect(avgMs).toBeLessThan(SUGGESTION_THRESHOLD_MS);
  });

  it('500 satır stress (3x typical) → engine ≤15ms (toleranslı, bütçe içi)', () => {
    const input = makeInput(500, 0);
    const ui = deriveUIState(input.type!, input.profile!);

    for (let i = 0; i < 3; i++) runSuggestionEngine(input, ui);

    const iterations = 50;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      runSuggestionEngine(input, ui);
    }
    const avgMs = (performance.now() - start) / iterations;

    console.log(`[bench] suggestion engine 500-line kdv=0: avg=${avgMs.toFixed(3)}ms (3x stress)`);
    expect(avgMs).toBeLessThan(TOTAL_THRESHOLD_MS);
  });

  it('Toplam pipeline (update + validate + suggestion) 100 satır → ≤15ms threshold', () => {
    const session = new InvoiceSession({
      initialInput: makeInput(100, 0),
    });

    // Warmup
    session.update(SessionPaths.profile, 'TEMELFATURA');

    const iterations = 50;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      session.update(SessionPaths.lineKdvPercent(i % 100), i % 2 === 0 ? 0 : 18);
    }
    const avgMs = (performance.now() - start) / iterations;

    console.log(`[bench] toplam pipeline (update+validate+suggestion) 100-line: avg=${avgMs.toFixed(3)}ms (threshold ${TOTAL_THRESHOLD_MS}ms)`);
    expect(avgMs).toBeLessThan(TOTAL_THRESHOLD_MS);
  });

  it('Diff hesabı 100 suggestion stable → emit yok overhead ≤5ms', () => {
    const session = new InvoiceSession({
      initialInput: makeInput(100, 0),
    });

    // İlk validate suggestion'ları üretir
    session.validate();

    // Sonraki validate'ler diff boş, emit yok
    const iterations = 100;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      session.validate();
    }
    const avgMs = (performance.now() - start) / iterations;

    console.log(`[bench] diff stable 100 suggestion: avg=${avgMs.toFixed(3)}ms (emit overhead)`);
    expect(avgMs).toBeLessThan(SUGGESTION_THRESHOLD_MS);
  });
});
