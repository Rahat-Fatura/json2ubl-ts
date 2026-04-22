import { describe, it, expect } from 'vitest';
import { InvoiceSession } from '../../src/calculator/invoice-session';

/**
 * Sprint 4 / M10 — isExport session kontratı:
 *  - Profil her zaman IHRACAT (constructor'da zorlanır)
 *  - Tip ISTISNA (M2 identity: IHRACAT yalnız ISTISNA kabul eder)
 *  - setLiability() no-op (error değil, sessiz yok sayma)
 */

describe('M10 — InvoiceSession isExport kontratı', () => {
  it('isExport=true → profil IHRACAT, tip ISTISNA otomatik (input vermese de)', () => {
    const session = new InvoiceSession({ isExport: true });
    expect(session.input.profile).toBe('IHRACAT');
    expect(session.input.type).toBe('ISTISNA');
    expect(session.isExport).toBe(true);
  });

  it('isExport=true + kullanıcı type="SATIS" verse de tip ISTISNA zorlanır', () => {
    const session = new InvoiceSession({
      isExport: true,
      initialInput: { type: 'SATIS' },
    });
    expect(session.input.profile).toBe('IHRACAT');
    expect(session.input.type).toBe('ISTISNA');
  });

  it('isExport=false → profil ve tip kullanıcı girdisine saygı duyar', () => {
    const session = new InvoiceSession({
      isExport: false,
      initialInput: { profile: 'TICARIFATURA', type: 'SATIS' },
    });
    expect(session.input.profile).toBe('TICARIFATURA');
    expect(session.input.type).toBe('SATIS');
  });

  it('M10: isExport=true session\'ında setLiability() no-op (liability değişmez)', () => {
    const session = new InvoiceSession({ isExport: true });
    const initialLiability = session.liability;

    let emitted = false;
    session.on('liability-changed', () => { emitted = true; });

    session.setLiability('earchive');

    expect(session.liability).toBe(initialLiability);
    expect(session.input.profile).toBe('IHRACAT');
    expect(emitted).toBe(false);
  });

  it('isExport=false iken setLiability() normal çalışır', () => {
    const session = new InvoiceSession({ isExport: false });
    expect(session.liability).toBeUndefined();

    session.setLiability('einvoice');
    expect(session.liability).toBe('einvoice');
  });
});
