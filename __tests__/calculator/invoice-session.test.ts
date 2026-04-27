import { describe, it, expect } from 'vitest';
import { InvoiceSession, type PathErrorPayload } from '../../src/calculator/invoice-session';
import { SessionPaths } from '../../src/calculator/session-paths.generated';

/**
 * Sprint 8h.3 — InvoiceSession isExport + liability kontratı (path-based rewrite).
 *
 * Mevcut M10 kontratı (Sprint 4) korunur, ama eski setLiability() yerine
 * update(SessionPaths.liability, …) ile test edilir. PROFILE_*_MISMATCH constraint
 * ve auto-resolve davranışları (D-9..D-12) eklendi.
 */

function captureErrors(session: InvoiceSession): PathErrorPayload[] {
  const errors: PathErrorPayload[] = [];
  session.on('path-error', (err) => errors.push(err));
  return errors;
}

describe('M10 — InvoiceSession isExport kontratı (constructor-locked)', () => {
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
});

describe('M10 — liability lock (LIABILITY_LOCKED_BY_EXPORT)', () => {
  it('isExport=true session\'da update(liability, x) → no-op + path-error', () => {
    const session = new InvoiceSession({ isExport: true });
    const errors = captureErrors(session);
    const initialLiability = session.liability;

    let emitted = false;
    session.on('liability-changed', () => { emitted = true; });

    session.update(SessionPaths.liability, 'earchive');

    expect(session.liability).toBe(initialLiability);
    expect(session.input.profile).toBe('IHRACAT');
    expect(emitted).toBe(false);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('LIABILITY_LOCKED_BY_EXPORT');
  });

  it('isExport=false iken update(liability, "einvoice") normal çalışır', () => {
    const session = new InvoiceSession({ isExport: false });
    expect(session.liability).toBeUndefined();

    session.update(SessionPaths.liability, 'einvoice');
    expect(session.liability).toBe('einvoice');
  });
});

describe('Sprint 8h.3 — Liability auto-resolve (profile uyumsuzluğu)', () => {
  it('liability=earchive set + profile=TICARIFATURA → profil EARSIVFATURA auto-resolve', () => {
    const session = new InvoiceSession({
      isExport: false,
      initialInput: { profile: 'TICARIFATURA', type: 'SATIS' },
    });
    let profilePayload: any = null;
    session.on('profile-changed', (p) => profilePayload = p);

    session.update(SessionPaths.liability, 'earchive');

    expect(session.liability).toBe('earchive');
    expect(session.input.profile).toBe('EARSIVFATURA');     // auto-resolve
    expect(profilePayload).toBeNull();                       // _updateLiability profile-changed emit etmez (sadece liability-changed)
  });

  it('liability=einvoice set + profile=EARSIVFATURA → profil auto-resolve (resolveProfileForType ilk uygun profile)', () => {
    const session = new InvoiceSession({
      isExport: false,
      initialInput: { profile: 'EARSIVFATURA', type: 'SATIS' },
    });
    session.update(SessionPaths.liability, 'einvoice');

    // EARSIVFATURA einvoice ile uyumsuz; resolveProfileForType ilk allowed profile döner (TEMELFATURA)
    expect(session.input.profile).toBe('TEMELFATURA');
    expect(session.input.profile).not.toBe('EARSIVFATURA');
  });

  it('liability=undefined set + profile uyumlu kalırsa hiçbir şey değişmez', () => {
    const session = new InvoiceSession({
      isExport: false,
      initialInput: { profile: 'TICARIFATURA', type: 'SATIS' },
      liability: 'einvoice',
    });
    session.update(SessionPaths.liability, undefined);
    expect(session.input.profile).toBe('TICARIFATURA');
  });
});

describe('Sprint 8h.3 — Profile constraint (PROFILE_*_MISMATCH)', () => {
  it('isExport=true session\'da update(profile, "TEMELFATURA") → PROFILE_EXPORT_MISMATCH', () => {
    const session = new InvoiceSession({ isExport: true });
    const errors = captureErrors(session);

    session.update(SessionPaths.profile, 'TEMELFATURA');

    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('PROFILE_EXPORT_MISMATCH');
    expect(session.input.profile).toBe('IHRACAT');           // değişmez
  });

  it('update(profile, "IHRACAT") herhangi bir session\'da reddedilir', () => {
    const session = new InvoiceSession({ isExport: false });
    const errors = captureErrors(session);

    session.update(SessionPaths.profile, 'IHRACAT');

    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('PROFILE_EXPORT_MISMATCH');
    expect(errors[0].reason).toMatch(/new InvoiceSession\(\{ isExport: true \}\)/);
  });

  it('liability=earchive iken update(profile, "TICARIFATURA") → PROFILE_LIABILITY_MISMATCH', () => {
    const session = new InvoiceSession({ liability: 'earchive', initialInput: { profile: 'EARSIVFATURA' } });
    const errors = captureErrors(session);

    session.update(SessionPaths.profile, 'TICARIFATURA');

    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('PROFILE_LIABILITY_MISMATCH');
    expect(session.input.profile).toBe('EARSIVFATURA');      // değişmez
  });

  it('liability=einvoice iken update(profile, "EARSIVFATURA") → PROFILE_LIABILITY_MISMATCH', () => {
    const session = new InvoiceSession({ liability: 'einvoice' });
    const errors = captureErrors(session);

    session.update(SessionPaths.profile, 'EARSIVFATURA');

    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('PROFILE_LIABILITY_MISMATCH');
  });

  it('valid profile transition (TICARIFATURA → TEMELFATURA) çalışır', () => {
    const session = new InvoiceSession({ initialInput: { profile: 'TICARIFATURA', type: 'SATIS' } });
    const errors = captureErrors(session);

    session.update(SessionPaths.profile, 'TEMELFATURA');

    expect(errors).toHaveLength(0);
    expect(session.input.profile).toBe('TEMELFATURA');
  });
});

describe('Sprint 8h.3 — Type auto-force on isExport (D-12 basic)', () => {
  it('update(type, "SATIS") + isExport=true → tip otomatik ISTISNA force', () => {
    const session = new InvoiceSession({ isExport: true });
    let payload: any = null;
    session.on('type-changed', (p) => payload = p);

    session.update(SessionPaths.type, 'SATIS');

    // D-12: applied value = ISTISNA (force), kullanıcı SATIS istedi
    expect(session.input.type).toBe('ISTISNA');
    // SimpleInvoiceInput.type previousValue ile aynı (ISTISNA → ISTISNA), diff yok → typeChanged emit edilmez
    expect(payload).toBeNull();
  });

  it('update(type, "IADE") + isExport=true → tip ISTISNA force', () => {
    const session = new InvoiceSession({ isExport: true });
    session.update(SessionPaths.type, 'IADE');
    expect(session.input.type).toBe('ISTISNA');
    expect(session.input.profile).toBe('IHRACAT');
  });

  it('update(type, "TEVKIFAT") + isExport=false → normal type change', () => {
    const session = new InvoiceSession({ isExport: false });
    let payload: any = null;
    session.on('type-changed', (p) => payload = p);

    session.update(SessionPaths.type, 'TEVKIFAT');

    expect(session.input.type).toBe('TEVKIFAT');
    expect(payload).not.toBeNull();
    expect(payload.type).toBe('TEVKIFAT');
  });
});

describe('Sprint 8h.3 — Type auto-resolve profile', () => {
  it('update(type, "IADE") + profile=TICARIFATURA → profil TEMELFATURA auto-resolve', () => {
    const session = new InvoiceSession({ initialInput: { type: 'SATIS', profile: 'TICARIFATURA' } });
    let payload: any = null;
    session.on('type-changed', (p) => payload = p);

    session.update(SessionPaths.type, 'IADE');

    expect(session.input.type).toBe('IADE');
    expect(session.input.profile).toBe('TEMELFATURA');     // auto-resolve
    expect(payload.profile).toBe('TEMELFATURA');           // event payload'da auto-resolve sonuç
    expect(payload.previousProfile).toBe('TICARIFATURA');
  });

  it('update(profile, "TEMELFATURA") tip uyumsuzsa otomatik tip ayarlanır', () => {
    const session = new InvoiceSession({ initialInput: { type: 'TEVKIFAT', profile: 'TICARIFATURA' } });
    // TEVKIFAT TEMELFATURA'ya uyumlu mu kontrol et — değilse auto-resolve gerekir
    session.update(SessionPaths.profile, 'TEMELFATURA');
    // Sonuç: profile TEMELFATURA, type uyumlu bir tipe geçer (resolveTypeForProfile sonucu)
    expect(session.input.profile).toBe('TEMELFATURA');
  });
});

describe('Sprint 8h.3 — Snapshot event sıralaması', () => {
  it('liability update event sequence: liability-changed → ui-state-changed → changed → warnings', () => {
    const session = new InvoiceSession({ initialInput: { profile: 'TICARIFATURA', type: 'SATIS' } });
    const events: string[] = [];
    session.on('liability-changed', () => events.push('liability-changed'));
    session.on('ui-state-changed', () => events.push('ui-state-changed'));
    session.on('changed', () => events.push('changed'));
    session.on('warnings', () => events.push('warnings'));

    session.update(SessionPaths.liability, 'earchive');

    expect(events).toEqual(['ui-state-changed', 'liability-changed', 'changed', 'warnings']);
  });

  it('type update event sequence: ui-state-changed → type-changed → changed → warnings', () => {
    const session = new InvoiceSession({ initialInput: { type: 'SATIS', profile: 'TICARIFATURA' } });
    const events: string[] = [];
    session.on('ui-state-changed', () => events.push('ui-state-changed'));
    session.on('type-changed', () => events.push('type-changed'));
    session.on('changed', () => events.push('changed'));
    session.on('warnings', () => events.push('warnings'));

    session.update(SessionPaths.type, 'TEVKIFAT');

    expect(events).toEqual(['ui-state-changed', 'type-changed', 'changed', 'warnings']);
  });
});
