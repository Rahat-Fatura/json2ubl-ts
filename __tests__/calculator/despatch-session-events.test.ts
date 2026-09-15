/**
 * DespatchSession olay SIRASI ve yükleri.
 *
 * 🔴 Olay sırası bir SÖZLEŞMEDİR: tüketicinin store köprüsüne kadar uzanır ve
 * kapılar (`src/session/path-gates.ts`) bu yüzden SAF tutulur — emit etselerdi
 * sıra sessizce kayar, hiçbir tip hatası yakalamazdı. Bu dosya sırayı çıpalar.
 *
 * Fatura emsali `invoice-session-events.test.ts`.
 */

import { describe, it, expect } from 'vitest';
import { DespatchSession } from '../../src/calculator/despatch-session';
import { DespatchSessionPaths } from '../../src/calculator/despatch-session-paths.generated';

/** Oturumun yaydığı TÜM olayları geliş sırasıyla kaydeder. */
function captureOrder(session: DespatchSession): string[] {
  const order: string[] = [];
  const names = [
    'field-changed', 'line-field-changed', 'field-activated', 'field-deactivated',
    'ui-state-changed', 'changed', 'validation-error', 'warnings',
    'type-changed', 'profile-changed',
  ] as const;
  for (const name of names) session.on(name, () => order.push(name));
  return order;
}

describe('olay sırası — fatura oturumuyla simetrik', () => {
  it('belge düzeyi update: field-changed → ui-state-changed → changed → validation-error → warnings', () => {
    const session = new DespatchSession();
    const order = captureOrder(session);
    session.update(DespatchSessionPaths.senderName, 'Gönderici A.Ş.');
    expect(order).toEqual([
      'field-changed',
      'ui-state-changed',
      'changed',
      'validation-error',
      'warnings',
    ]);
  });

  it('satır düzeyi update: field-changed HEMEN ARDINDAN line-field-changed', () => {
    const session = new DespatchSession();
    session.addLine({ name: 'A', quantity: 1, unitCode: 'C62' });
    const order = captureOrder(session);
    session.update(DespatchSessionPaths.lineQuantity(0), 7);
    expect(order.slice(0, 2)).toEqual(['field-changed', 'line-field-changed']);
    expect(order).toContain('ui-state-changed');
    expect(order.indexOf('changed')).toBeGreaterThan(order.indexOf('line-field-changed'));
  });

  it('görünürlük geçişi ui-state-changed\'DEN ÖNCE yayılır', () => {
    const session = new DespatchSession();
    const order = captureOrder(session);
    session.update(DespatchSessionPaths.profile, 'HKSIRSALIYE');
    expect(order.indexOf('field-activated')).toBeGreaterThan(-1);
    expect(order.indexOf('field-activated')).toBeLessThan(order.indexOf('ui-state-changed'));
  });

  it('tip/profil olayları ui-state-changed SONRASI, changed ÖNCESİ yayılır', () => {
    const session = new DespatchSession();
    const order = captureOrder(session);
    session.update(DespatchSessionPaths.type, 'MATBUDAN');
    expect(order.indexOf('type-changed')).toBeGreaterThan(order.indexOf('ui-state-changed'));
    expect(order.indexOf('type-changed')).toBeLessThan(order.indexOf('changed'));
  });

  it('warnings HER ZAMAN validation-error\'dan SONRA gelir', () => {
    const session = new DespatchSession();
    const order = captureOrder(session);
    session.update(DespatchSessionPaths.customerName, 'Alıcı');
    expect(order.indexOf('warnings')).toBe(order.indexOf('validation-error') + 1);
  });
});

describe('olay yükleri', () => {
  it('field-changed önceki ve yeni değeri taşır', () => {
    const session = new DespatchSession();
    session.update(DespatchSessionPaths.senderTaxNumber, '1111111111');
    const payloads: unknown[] = [];
    session.on('field-changed', p => payloads.push(p));
    session.update(DespatchSessionPaths.senderTaxNumber, '2222222222');
    expect(payloads[0]).toEqual({
      path: 'sender.taxNumber',
      value: '2222222222',
      previousValue: '1111111111',
    });
  });

  it('line-field-changed satır indeksi ve alan adını ayrıştırır', () => {
    const session = new DespatchSession();
    session.addLine({ name: 'A', quantity: 1, unitCode: 'C62' });
    session.addLine({ name: 'B', quantity: 2, unitCode: 'C62' });
    const payloads: Array<{ lineIndex: number; field: string }> = [];
    session.on('line-field-changed', p => payloads.push(p));
    session.update(DespatchSessionPaths.lineUnitCode(1), 'KGM');
    expect(payloads[0]).toMatchObject({ lineIndex: 1, field: 'unitCode' });
  });

  it('type-changed önceki tipi taşır', () => {
    const session = new DespatchSession();
    const payloads: Array<{ type: string; previousType: string }> = [];
    session.on('type-changed', p => payloads.push(p));
    session.update(DespatchSessionPaths.type, 'MATBUDAN');
    expect(payloads[0]).toEqual({ type: 'MATBUDAN', previousType: 'SEVK' });
  });

  it('profile-changed önceki profili taşır', () => {
    const session = new DespatchSession();
    const payloads: Array<{ profile: string; previousProfile: string }> = [];
    session.on('profile-changed', p => payloads.push(p));
    session.update(DespatchSessionPaths.profile, 'IDISIRSALIYE');
    expect(payloads[0]).toEqual({ profile: 'IDISIRSALIYE', previousProfile: 'TEMELIRSALIYE' });
  });

  it('field-activated gerekçe cümlesi tip+profil bağlamını taşır', () => {
    const session = new DespatchSession();
    const reasons: string[] = [];
    session.on('field-activated', p => reasons.push(p.reason));
    session.update(DespatchSessionPaths.profile, 'HKSIRSALIYE');
    expect(reasons[0]).toContain('type=SEVK');
    expect(reasons[0]).toContain('profile=HKSIRSALIYE');
  });

  it('satır CRUD "changed" zincirini tetikler', () => {
    const session = new DespatchSession();
    const order = captureOrder(session);
    session.addLine({ name: 'A', quantity: 1, unitCode: 'C62' });
    expect(order).toEqual(['changed', 'validation-error', 'warnings']);
  });

  it('reddedilen update HİÇBİR olay yaymaz (path-error dışında)', () => {
    const session = new DespatchSession();
    const order = captureOrder(session);
    let pathErrors = 0;
    session.on('path-error', () => pathErrors++);
    session.update('hayalet.alan' as never, 1 as never);
    expect(order).toEqual([]);
    expect(pathErrors).toBe(1);
  });
});
