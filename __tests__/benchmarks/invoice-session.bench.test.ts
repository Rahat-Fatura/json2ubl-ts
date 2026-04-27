/**
 * InvoiceSession performance benchmark (Sprint 8h.7.1 / D-7 ZORUNLU).
 *
 * MR-1 mitigation: update() per call < 15ms hedef (60fps form için frame budget altı).
 * Cache hit/miss ayrımı + sequential update sequence ölçümü.
 *
 * Threshold aşılırsa Sprint 8h.8 öncesi `autoValidate: 'manual'` opsiyonu Faz 1'e taşınır.
 *
 * Standart vitest run ile çalışır (bench mode değil) — performance.now() bazlı timing.
 * Bench raporu: audit/sprint-08h-benchmark.md
 */

import { describe, it, expect } from 'vitest';
import { performance } from 'node:perf_hooks';
import { InvoiceSession } from '../../src/calculator/invoice-session';
import { SessionPaths } from '../../src/calculator/session-paths.generated';
import type { SimpleLineInput } from '../../src/calculator/simple-types';

const THRESHOLD_MS = 15;

function createSession(lineCount: number): InvoiceSession {
  const lines: SimpleLineInput[] = Array.from({ length: lineCount }, (_, i) => ({
    name: `Demo Item ${i}`,
    quantity: 1,
    price: 100 + i,
    kdvPercent: 18,
  }));

  return new InvoiceSession({
    initialInput: {
      sender: { taxNumber: '1234567890', name: 'Acme A.Ş.', taxOffice: 'Beşiktaş', address: 'Levent', district: 'Beşiktaş', city: 'İstanbul' },
      customer: { taxNumber: '9876543210', name: 'Müşteri Ltd.', taxOffice: 'Kadıköy', address: 'Bağdat Cd.', district: 'Kadıköy', city: 'İstanbul' },
      lines,
      type: 'SATIS',
      profile: 'TICARIFATURA',
    },
  });
}

function timeUpdate(session: InvoiceSession, path: any, value: any): number {
  const start = performance.now();
  session.update(path, value);
  return performance.now() - start;
}

describe('Sprint 8h.7.1 — InvoiceSession performance benchmark (ZORUNLU D-7)', () => {
  it('100 line + 50 sequential doc-level update <15ms/update average', () => {
    const session = createSession(100);
    const timings: number[] = [];

    // Warm-up (cache + JIT)
    for (let i = 0; i < 5; i++) {
      session.update(SessionPaths.senderName, `warmup-${i}`);
    }

    // Measure 50 doc-level updates
    for (let i = 0; i < 50; i++) {
      timings.push(timeUpdate(session, SessionPaths.senderName, `iter-${i}`));
    }

    const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
    const max = Math.max(...timings);
    const p95 = timings.sort((a, b) => a - b)[Math.floor(timings.length * 0.95)];

    console.log(`[bench] 100-line doc-update: avg=${avg.toFixed(2)}ms, p95=${p95.toFixed(2)}ms, max=${max.toFixed(2)}ms (threshold ${THRESHOLD_MS}ms)`);

    expect(avg).toBeLessThan(THRESHOLD_MS);
  });

  it('100 line + 50 sequential line-level update <15ms/update average', () => {
    const session = createSession(100);
    const timings: number[] = [];

    for (let i = 0; i < 5; i++) {
      session.update(SessionPaths.lineKdvPercent(i), 8);
    }

    for (let i = 0; i < 50; i++) {
      const lineIdx = i % 100;
      timings.push(timeUpdate(session, SessionPaths.lineKdvPercent(lineIdx), 18 + (i % 5)));
    }

    const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
    const max = Math.max(...timings);
    const p95 = timings.sort((a, b) => a - b)[Math.floor(timings.length * 0.95)];

    console.log(`[bench] 100-line line-update: avg=${avg.toFixed(2)}ms, p95=${p95.toFixed(2)}ms, max=${max.toFixed(2)}ms (threshold ${THRESHOLD_MS}ms)`);

    expect(avg).toBeLessThan(THRESHOLD_MS);
  });

  it('Cache hit (sequential validate) faster than miss', () => {
    const session = createSession(100);

    // Cache miss (cold)
    let coldStart = performance.now();
    session.toInvoiceInput();
    const coldTime = performance.now() - coldStart;

    // Cache hit (no mutation)
    let hotStart = performance.now();
    session.toInvoiceInput();
    const hotTime = performance.now() - hotStart;

    console.log(`[bench] toInvoiceInput cold=${coldTime.toFixed(2)}ms, hot=${hotTime.toFixed(2)}ms (cache D-3)`);

    expect(hotTime).toBeLessThan(coldTime);
    expect(hotTime).toBeLessThan(0.5);     // cache hit <0.5ms (essentially zero)
  });

  it('10 line baseline (small invoice) <5ms/update', () => {
    const session = createSession(10);
    const timings: number[] = [];

    for (let i = 0; i < 5; i++) session.update(SessionPaths.senderName, `warmup-${i}`);

    for (let i = 0; i < 30; i++) {
      timings.push(timeUpdate(session, SessionPaths.senderName, `iter-${i}`));
    }

    const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
    console.log(`[bench] 10-line doc-update: avg=${avg.toFixed(2)}ms (small invoice baseline)`);

    expect(avg).toBeLessThan(5);
  });

  it('500 line stress (3x typical max) <30ms/update tolerated', () => {
    const session = createSession(500);
    const timings: number[] = [];

    for (let i = 0; i < 3; i++) session.update(SessionPaths.senderName, `warmup-${i}`);

    for (let i = 0; i < 20; i++) {
      timings.push(timeUpdate(session, SessionPaths.senderName, `iter-${i}`));
    }

    const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
    console.log(`[bench] 500-line stress: avg=${avg.toFixed(2)}ms (3x typical max, <30ms tolerated)`);

    // 500 line aşırı stres senaryosu — 30ms üstü tolerated, dur+sor olmaz
    expect(avg).toBeLessThan(30);
  });
});
