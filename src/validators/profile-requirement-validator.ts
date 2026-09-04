/**
 * Profil/tip bazlı ZORUNLU ALAN kontrolleri — simple-input katmanı.
 *
 * Buradaki iki kural GİB şematronunda VAR ama kütüphanenin `InvoiceSession`
 * doğrulama boru hattında YOKTU. Sonuç: portal kullanıcısı eksik belgeyi
 * sorunsuz kuruyor, reddi GİB kapısında öğreniyordu (MimForge kaplama seferi).
 *
 * - `EnerjiESURaporIDCheck`         — YALNIZ SARJ'da ESURaporID ek belgesi
 * - `YatirimTesvikItemInstanceCheck` — YTB harcama tipi 01'de marka + model
 * - `DemirbasKDVTaxExemptionCheck`   — 555 kodu KDV 0 ile kullanılamaz
 *
 * `InvoiceInput` katmanındaki `enerji-validator` aynı ESU kuralını zaten
 * uyguluyor; bu dosya onu SİMPLE girdiye taşır ki oturum (ve dolayısıyla portal
 * paneli) belge kurulurken uyarabilsin.
 */

import type { SimpleInvoiceInput } from '../calculator/simple-types';
import type { ValidationError } from '../errors/ubl-build-error';
import { DEMIRBAS_KDV_EXEMPTION_CODES } from '../config/constants';

/* ⚠️ YALNIZ 'SARJ'. Şematron `EnerjiESURaporIDCheck` SARJANLIK'ı KAPSAMAZ —
 * kural ilk yazımda ikisini birden alıyordu ve `enerji-sarjanlik-baseline`
 * fixture'ı bunu anında kırdı. */
const ENERJI_TYPES = new Set(['SARJ']);

function bos(v: unknown): boolean {
  return v === undefined || v === null || String(v).trim() === '';
}

export function validateProfileRequirements(input: SimpleInvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const tip = input.type ?? '';
  const profil = input.profile ?? '';

  // ── SARJ → ESURaporID ek belgesi (SARJANLIK hariç)
  if (ENERJI_TYPES.has(tip)) {
    const varMi = (input.additionalDocuments ?? []).some(
      d => (d as { schemeId?: string }).schemeId === 'ESURaporID',
    );
    if (!varMi) {
      errors.push({
        code: 'MISSING_FIELD',
        message:
          'SARJ faturalarında schemeID="ESURaporID" olan bir ek belge zorunludur (EnerjiESURaporIDCheck).',
        path: 'additionalDocuments',
        expected: 'schemeId="ESURaporID" taşıyan en az bir ek belge',
      });
    }
  }

  // ── Yatırım teşvik, harcama tipi 01 → kalemde marka + model
  const ytbKapsam = profil === 'YATIRIMTESVIK' || tip.startsWith('YTB');
  if (ytbKapsam) {
    input.lines.forEach((line, i) => {
      if (line.itemClassificationCode !== '01') return;
      if (bos(line.brand)) {
        errors.push({
          code: 'MISSING_FIELD',
          message:
            'Yatırım teşvik harcama tipi 01 için kalem markası zorunludur (YatirimTesvikItemInstanceCheck).',
          path: `lines[${i}].brand`,
        });
      }
      if (bos(line.model)) {
        errors.push({
          code: 'MISSING_FIELD',
          message:
            'Yatırım teşvik harcama tipi 01 için kalem modeli zorunludur (YatirimTesvikItemInstanceCheck).',
          path: `lines[${i}].model`,
        });
      }
    });
  }

  // ── 555 (demirbaş KDV) → KDV 0 YASAK
  /* GİB: «Vergi istisna muafiyet kodu 555 olduğu durumda KDV 0 geçilemez.»
   * Bu kod indirimli (sıfır olmayan) bir orana eşlik eder. Portalın istisna
   * seçicisi ise YALNIZ kdvPercent === 0 iken açılıyor — yani 555 kullanıcıya
   * tam da yasak olduğu durumda sunuluyordu ve önizleme kırılıyordu. */
  const belgeKodu = input.kdvExemptionCode;
  input.lines.forEach((line, i) => {
    const kod = line.kdvExemptionCode ?? belgeKodu;
    if (kod && DEMIRBAS_KDV_EXEMPTION_CODES.has(kod) && line.kdvPercent === 0) {
      errors.push({
        code: 'INVALID_VALUE',
        message: `İstisna kodu '${kod}' KDV oranı 0 ile kullanılamaz (DemirbasKDVTaxExemptionCheck).`,
        path: `lines[${i}].kdvPercent`,
        expected: '0’dan büyük bir KDV oranı',
        actual: '0',
      });
    }
  });

  return errors;
}
