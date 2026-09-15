/**
 * İrsaliye kurallar motoru — SAF görünürlük türetimi.
 *
 * Fatura emsali `invoice-rules.test.ts`. Her bayrağın NORMATİF bir kaynağı
 * olduğunu ve faturadan ithal edilmiş kavramların (mükellefiyet, ihracat,
 * istisna, tevkifat) BURAYA SIZMADIĞINI çıpalar.
 */

import { describe, it, expect } from 'vitest';
import {
  deriveDespatchFieldVisibility,
  deriveDespatchUIState,
  DEFAULT_DESPATCH_TYPE,
  DEFAULT_DESPATCH_PROFILE,
} from '../../src/calculator/despatch-rules';

describe('deriveDespatchFieldVisibility', () => {
  it('SEVK + TEMELIRSALIYE — hiçbir profil/tip özel zorunluluğu açılmaz', () => {
    const fields = deriveDespatchFieldVisibility('SEVK', 'TEMELIRSALIYE');
    expect(fields.requireAdditionalDocuments).toBe(false);
    expect(fields.requireItemKunyeNo).toBe(false);
    expect(fields.requireItemEtiketNo).toBe(false);
    expect(fields.requireSevkiyatNo).toBe(false);
    expect(fields.allowBackdatedDespatch).toBe(false);
  });

  it('MATBUDAN — ek belge zorunlu, geriye dönük sevk serbest', () => {
    const fields = deriveDespatchFieldVisibility('MATBUDAN', 'TEMELIRSALIYE');
    expect(fields.requireAdditionalDocuments).toBe(true);
    expect(fields.allowBackdatedDespatch).toBe(true);
  });

  it('HKSIRSALIYE — yalnız KUNYENO zorunluluğu açılır', () => {
    const fields = deriveDespatchFieldVisibility('SEVK', 'HKSIRSALIYE');
    expect(fields.requireItemKunyeNo).toBe(true);
    expect(fields.requireItemEtiketNo).toBe(false);
    expect(fields.requireSevkiyatNo).toBe(false);
  });

  it('IDISIRSALIYE — ETIKETNO ve SEVKIYATNO birlikte açılır', () => {
    const fields = deriveDespatchFieldVisibility('SEVK', 'IDISIRSALIYE');
    expect(fields.requireItemEtiketNo).toBe(true);
    expect(fields.requireSevkiyatNo).toBe(true);
    expect(fields.requireItemKunyeNo).toBe(false);
  });

  it('🔴 plaka ve şoför/taşıyıcı zorunlulukları tip/profilden BAĞIMSIZ sabittir', () => {
    // `LicensePlateIDCheck` taşıyıcı firma verilse BİLE plaka arar; ekranın
    // "kargoya verdim" dalına kaçmasını kodda engelleyen bayrak budur.
    for (const type of ['SEVK', 'MATBUDAN']) {
      for (const profile of ['TEMELIRSALIYE', 'HKSIRSALIYE', 'IDISIRSALIYE']) {
        const fields = deriveDespatchFieldVisibility(type, profile);
        expect(fields.requireLicensePlate).toBe(true);
        expect(fields.requireDriverOrCarrier).toBe(true);
      }
    }
  });

  it('tip ve profil BAĞIMSIZ eksenlerdir — her kombinasyon türetilebilir', () => {
    /* Faturadaki profil↔tip uzlaşma matrisinin irsaliyede karşılığı YOKTUR;
     * uzlaştırılacak bir çakışma olmadığı için oturum da matris taşımaz. */
    const combos = ['SEVK', 'MATBUDAN'].flatMap(t =>
      ['TEMELIRSALIYE', 'HKSIRSALIYE', 'IDISIRSALIYE'].map(p => deriveDespatchFieldVisibility(t, p)));
    expect(combos).toHaveLength(6);
    expect(combos.every(c => typeof c.requireLicensePlate === 'boolean')).toBe(true);
  });

  it('tanınmayan tip/profil değerinde ATMAZ — özel zorunluluk açmaz', () => {
    const fields = deriveDespatchFieldVisibility('HAYALET', 'HAYALETPROFIL');
    expect(fields.requireAdditionalDocuments).toBe(false);
    expect(fields.requireItemKunyeNo).toBe(false);
  });
});

describe('deriveDespatchUIState', () => {
  it('🔴 uyarıları DOLDURMAZ — saf kapsam hesabıdır, uyarıyı oturum taşır', () => {
    expect(deriveDespatchUIState('SEVK', 'TEMELIRSALIYE').warnings).toEqual([]);
  });

  it('fields alanını türetir', () => {
    const state = deriveDespatchUIState('MATBUDAN', 'IDISIRSALIYE');
    expect(state.fields.requireAdditionalDocuments).toBe(true);
    expect(state.fields.requireSevkiyatNo).toBe(true);
  });

  it('varsayılan tip/profil sabitleri belgelenen değerlerdir', () => {
    expect(DEFAULT_DESPATCH_TYPE).toBe('SEVK');
    expect(DEFAULT_DESPATCH_PROFILE).toBe('TEMELIRSALIYE');
  });
});
