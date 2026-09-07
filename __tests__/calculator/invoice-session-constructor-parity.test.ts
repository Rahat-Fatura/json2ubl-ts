/**
 * Yapıcı yolu ≡ `update()` yolu — türetilmiş uiState paritesi (v4.4.1).
 *
 * ── Kusur
 * `InvoiceSession` yapıcısı türetilmiş durumu KENDİ elleriyle kuruyordu:
 *   profile = input.profile ?? 'TICARIFATURA'
 *   type    = input.type    ?? 'SATIS'
 * `update('profile'|'type', …)` yolu ise `resolveTypeForProfile` /
 * `resolveProfileForType` kapsam çözücülerini çağırıyordu. İki ayrı kopya iki
 * ayrı gerçek üretti:
 *   - `{ type: 'SARJ' }` yapıcıdan → profil TICARIFATURA (SARJ o profilde YOK),
 *     `update('type','SARJ')` → ENERJI.
 *   - `uiState.warnings` yapıcıdan sonra BOŞ kalıyordu; `update()` yolu
 *     `onChanged() → validate()` ile dolduruyordu.
 * MimForge portalı kayıtlı taslağı `replaceSession(document)` ile — yani
 * YAPICIDAN — açtığı için kullanıcı yanlış kapsam ve boş uyarı listesi görüyordu.
 *
 * ── Kapsam sınırı (BİLEREK)
 * `update()` bir ETKİLEŞİM kapısıdır: `isExport`/`liability` ile bağdaşmayan bir
 * profili `path-error` ile REDDEDER. Yapıcı ise SADIK OKUMA yoludur — beyan
 * edilmiş çifti korur ki `validateCrossMatrix` uyumsuzluğu raporlayabilsin
 * (bkz. examples-matrix/invalid/cross-matrix). Bu yüzden parite iddiası,
 * oturumun kısıt zarfında ERİŞİLEBİLİR profiller/tipler için kurulur.
 */

import { describe, it, expect } from 'vitest';
import { InvoiceSession } from '../../src/calculator/invoice-session';
import { PROFILE_TYPE_MATRIX } from '../../src/config/constants';
import type { SimpleInvoiceInput } from '../../src/calculator/simple-types';

const base = (): SimpleInvoiceInput => ({
  sender: { taxNumber: '1234567890', name: 'S', taxOffice: 'K', address: 'a', district: 'd', city: 'c' },
  customer: { taxNumber: '9876543210', name: 'A', taxOffice: 'B', address: 'a', district: 'd', city: 'c' },
  lines: [{ name: 'x', quantity: 1, price: 1, kdvPercent: 20 }],
});

/** `IHRACAT` yalnız `isExport: true` ile erişilir — `update()` onu reddeder (M10). */
const REACHABLE_PROFILES = Object.keys(PROFILE_TYPE_MATRIX).filter(p => p !== 'IHRACAT');

const ALL_TYPES = Array.from(
  new Set(Object.values(PROFILE_TYPE_MATRIX).flatMap(set => Array.from(set) as string[])),
);

describe('Yapıcı yolu ≡ update() yolu (uiState paritesi)', () => {
  describe('regresyon pini: HKS profili yapıcıdan verildiğinde kapsam UYGULANIR', () => {
    // Kusurun bildirildiği senaryo: kayıtlı HKS taslağı açılınca tip listesinde
    // HKS'de OLMAMASI gereken tipler sunuluyordu.
    const HKS_TYPES = ['SATIS', 'ISTISNA', 'TEVKIFAT', 'KOMISYONCU'];

    it('profil + tip yapıcıda verildi → allowedTypes HKS kümesi', () => {
      const s = new InvoiceSession({ initialInput: { ...base(), profile: 'HKS', type: 'SATIS' } });
      expect(s.uiState.allowedTypes).toEqual(HKS_TYPES);
    });

    it('validate() kapsamı BOZMAZ (eski kusurda da düzeltmiyordu)', () => {
      const s = new InvoiceSession({ initialInput: { ...base(), profile: 'HKS', type: 'SATIS' } });
      s.validate();
      expect(s.uiState.allowedTypes).toEqual(HKS_TYPES);
    });

    it('HKS dışı tipler SUNULMAZ (OZELMATRAH / IHRACKAYITLI / KONAKLAMAVERGISI)', () => {
      const s = new InvoiceSession({ initialInput: { ...base(), profile: 'HKS', type: 'SATIS' } });
      for (const forbidden of ['OZELMATRAH', 'IHRACKAYITLI', 'KONAKLAMAVERGISI', 'SGK']) {
        expect(s.uiState.allowedTypes).not.toContain(forbidden);
      }
    });

    it('yapıcı ≡ update: HKS', () => {
      const ctor = new InvoiceSession({ initialInput: { ...base(), profile: 'HKS' } });
      const upd = new InvoiceSession({ initialInput: base() });
      upd.update('profile', 'HKS');
      expect(ctor.uiState).toEqual(upd.uiState);
    });
  });

  describe('profil yapıcıda verildi ≡ update("profile", …) — TÜM uiState', () => {
    // Görev üç profili şart koşuyor; hepsini taramak aynı maliyette ve
    // kusurun "yalnız HKS'ye özgü değil" olduğunu kanıtlıyor.
    for (const profile of ['HKS', 'EARSIVFATURA', 'YATIRIMTESVIK', ...REACHABLE_PROFILES]) {
      it(`profile=${profile}`, () => {
        const ctor = new InvoiceSession({ initialInput: { ...base(), profile } });
        const upd = new InvoiceSession({ initialInput: base() });
        upd.update('profile', profile);

        // uiState'in TAMAMI — yalnız allowedTypes değil.
        expect(ctor.uiState).toEqual(upd.uiState);
        expect(ctor.input.profile).toBe(upd.input.profile);
        expect(ctor.input.type).toBe(upd.input.type);
      });
    }
  });

  describe('tip yapıcıda verildi ≡ update("type", …) — TÜM uiState', () => {
    for (const type of ALL_TYPES) {
      it(`type=${type}`, () => {
        const ctor = new InvoiceSession({ initialInput: { ...base(), type } });
        const upd = new InvoiceSession({ initialInput: base() });
        upd.update('type', type);

        expect(ctor.uiState).toEqual(upd.uiState);
        expect(ctor.input.profile).toBe(upd.input.profile);
        expect(ctor.input.type).toBe(upd.input.type);
      });
    }
  });

  describe('varsayılan tip seçimi (resolveTypeForProfile → allowed[0])', () => {
    it.each([
      ['HKS', 'SATIS'],
      ['EARSIVFATURA', 'SATIS'],
      ['YATIRIMTESVIK', 'SATIS'],
      ['TEMELFATURA', 'SATIS'],
      ['ENERJI', 'SARJ'],
      ['YOLCUBERABERFATURA', 'ISTISNA'],
      ['OZELFATURA', 'ISTISNA'],
    ])('profile=%s, tip verilmedi → type=%s', (profile, expected) => {
      const s = new InvoiceSession({ initialInput: { ...base(), profile } });
      expect(s.input.type).toBe(expected);
      expect(s.uiState.allowedTypes[0]).toBe(expected);
    });

    it('profil verilmedi → kütüphane varsayılanı TICARIFATURA korunur', () => {
      const s = new InvoiceSession({ initialInput: base() });
      expect(s.input.profile).toBe('TICARIFATURA');
      expect(s.input.type).toBe('SATIS');
    });

    it('yalnız type=SATIS verildi → profil TEMELFATURA’ya KAYMAZ', () => {
      // resolveProfileForType(undefined, 'SATIS') `allowed[0]`=TEMELFATURA döner;
      // çözücü boş oturumun varsayılanından başlamazsa varsayılan sessizce kayar.
      const s = new InvoiceSession({ initialInput: { ...base(), type: 'SATIS' } });
      expect(s.input.profile).toBe('TICARIFATURA');
    });

    it('type=SARJ verildi → profil ENERJI’ye taşınır (eskiden TICARIFATURA kalıyordu)', () => {
      const s = new InvoiceSession({ initialInput: { ...base(), type: 'SARJ' } });
      expect(s.input.profile).toBe('ENERJI');
      expect(s.uiState.allowedTypes).toEqual(['SARJ', 'SARJANLIK']);
    });

    it('type=IADE verildi → profil TEMELFATURA (TICARIFATURA IADE kabul etmez)', () => {
      const s = new InvoiceSession({ initialInput: { ...base(), type: 'IADE' } });
      expect(s.input.profile).toBe('TEMELFATURA');
    });
  });

  describe('warnings — yapıcının kurmadığı ikinci türetilmiş alan', () => {
    it('yapıcıdan hemen sonra uiState.warnings DOLU (validate() beklemeden)', () => {
      const s = new InvoiceSession({
        initialInput: { ...base(), profile: 'YATIRIMTESVIK' },
      });
      // YATIRIMTESVIK → ytbNo zorunlu; girdide yok.
      expect(s.uiState.warnings.length).toBeGreaterThan(0);
      expect(s.warnings).toBe(s.uiState.warnings);
    });

    it('yapıcı warnings ≡ update() yolundaki warnings', () => {
      const ctor = new InvoiceSession({ initialInput: { ...base(), profile: 'YATIRIMTESVIK' } });
      const upd = new InvoiceSession({ initialInput: base() });
      upd.update('profile', 'YATIRIMTESVIK');
      expect(ctor.uiState.warnings).toEqual(upd.uiState.warnings);
    });

    it('yapıcı öneri hattını TÜKETMEZ — ilk suggestion emisyonu korunur', () => {
      // `_lastSuggestions` yapıcıda dolsaydı ilk diff boş çıkar ve olay
      // sessizce yutulurdu (T-4 kontratı).
      const s = new InvoiceSession({
        initialInput: {
          ...base(),
          type: 'TEVKIFAT',
          lines: [{ name: 'Hizmet', quantity: 1, price: 1000, kdvPercent: 18 }],
        },
        autoCalculate: false,
      });
      let emitted = 0;
      s.on('suggestion', () => { emitted += 1; });
      s.validate();
      expect(emitted).toBeGreaterThan(0);
    });
  });

  describe('kısıt zarfı — yapıcı sadık okuma, update() etkileşim kapısı', () => {
    it('isExport=true → profil IHRACAT + tip ISTISNA (girdi ne olursa olsun)', () => {
      const s = new InvoiceSession({
        isExport: true,
        initialInput: { ...base(), profile: 'HKS', type: 'SATIS' },
      });
      expect(s.input.profile).toBe('IHRACAT');
      expect(s.input.type).toBe('ISTISNA');
      expect(s.uiState.allowedTypes).toEqual(['ISTISNA']);
    });

    it('uyumsuz profil+tip çifti yapıcıda KORUNUR (CROSS_MATRIX raporlanabilsin)', () => {
      const s = new InvoiceSession({ initialInput: { ...base(), profile: 'IHRACAT', type: 'SATIS' } });
      expect(s.input.profile).toBe('IHRACAT');
      expect(s.input.type).toBe('SATIS');
      // Kapsam listesi yine de doğru: IHRACAT sadece ISTISNA kabul eder.
      expect(s.uiState.allowedTypes).toEqual(['ISTISNA']);
    });
  });

  describe('calculate() açık profili EZMEZ', () => {
    it('profile=ENERJI + otomatik tip tespiti → profil ENERJI kalır', () => {
      // `resolveInvoiceType` tevkifat yoksa 'SATIS' türetir; benimsenirse
      // `resolveProfileForType` profili TEMELFATURA'ya çevirir ve kullanıcının
      // seçtiği profil silinirdi.
      const s = new InvoiceSession({ initialInput: { ...base(), profile: 'ENERJI' } });
      s.calculate();
      expect(s.input.profile).toBe('ENERJI');
      expect(s.input.type).toBe('SARJ');
    });

    it('profil kapsamındaki otomatik tespit HÂLÂ çalışır (B-41: tevkifat → TEVKIFAT)', () => {
      const s = new InvoiceSession({
        initialInput: {
          ...base(),
          lines: [{ name: 'Hizmet', quantity: 1, price: 1000, kdvPercent: 20, withholdingTaxCode: '602' }],
        },
      });
      s.calculate();
      expect(s.input.type).toBe('TEVKIFAT');
    });
  });
});
