import type { SuggestionRule, Suggestion } from '../suggestion-types';
import { isValidGtip, describeGtipDefect } from '../../utils/gtip';

/**
 * Sprint 8i.6 / AR-10 Faz 2 — Delivery grubu suggestion kuralları (3 kural).
 *
 *  1. delivery/ihracat-incoterms-required — IHRACAT profili + line.delivery.deliveryTermCode boş → CIF
 *  2. delivery/gtip-format-12-digit — gtipNo girildi ama 12 hane değil → format düzeltme
 *  3. delivery/transport-mode-suggest-ihracat — IHRACAT + line.delivery.transportModeCode boş → 4 (Hava)
 *
 * Tasarım dokümanı plan'ında doc-level delivery varsayılmıştı; yapı incelendi —
 * SimpleInvoiceInput'ta doc-level delivery yok, sadece line-level (lines[i].delivery).
 * Kurallar line-level olarak adapte edildi.
 */

const DELIVERY_IHRACAT_INCOTERMS_REQUIRED: SuggestionRule = {
  id: 'delivery/ihracat-incoterms-required',
  applies: (input) =>
    input.profile === 'IHRACAT' &&
    input.lines.some(l => !l.delivery?.deliveryTermCode),
  produce: (input) => {
    const out: Suggestion[] = [];
    for (let i = 0; i < input.lines.length; i++) {
      if (!input.lines[i].delivery?.deliveryTermCode) {
        out.push({
          path: `lines[${i}].delivery.deliveryTermCode`,
          value: 'CIF',
          reason: 'İhracat satırlarında INCOTERMS kodu zorunlu (CIF, FOB, EXW vb.).',
          severity: 'recommended',
          ruleId: 'delivery/ihracat-incoterms-required',
          displayLabel: 'CIF — Cost Insurance Freight',
          displayValue: 'CIF',
        });
      }
    }
    return out;
  },
};

/**
 * GTİP biçim önerisi — hane ölçümü `utils/gtip`'e devredildi.
 *
 * Eskiden burada `gtip.replace(/\D/g, '')` ile AYRI bir sayma vardı; aynı
 * değeri profil doğrulayıcı ve IHRACKAYITLI+702 doğrulayıcı başka başka
 * ölçüyordu (üç katman, üç sonuç). Artık üçü de `isValidGtip` kullanır.
 *
 * 🔴 Bu kural neden hâlâ `recommended` (bloke ETMİYOR)?
 * Şematron GTİP'in 12 hane olmasını YALNIZ `IHRACKAYITLI`+`702` bağlamında
 * (`Common:326`) şart koşar; İHRACAT profilinde 12 hane şartının dayanağı
 * GİB'in 17.01.2017 test duyurusudur ve `profile-validators` onu ZATEN bloke
 * eden hata olarak kurar. Geriye kalan hâllerde (ör. GTİP girilmiş bir SATIS
 * faturası) GİB belgeyi reddetmez; onları bloke etmek kütüphaneyi GİB'den
 * KATI yapar ve bugün geçen belgeleri yarın reddederdi. Bu yüzden advisory
 * kalır — kapı, GİB'in gerçekten reddettiği iki katmandadır.
 *
 * 🔴 `value` neden HER ZAMAN `undefined` (yani somut bir düzeltme önerilmez)?
 * Geçerlilik artık NORMALİZASYON SONRASI ölçülüyor. Dolayısıyla "yalnız ayraç
 * temizliğiyle düzelecek" bir değer (`8471.30.0000.00`) zaten GEÇERLİ sayılır
 * ve bu kural onun için HİÇ tetiklenmez — noktasız yazılmasını serileştirici
 * üstlenir. Geriye kalan tek küme "hane sayısı yanlış" ya da "rakam değil"
 * olanlardır; onların doğrusunu kütüphane UYDURAMAZ. Yani önerilecek somut bir
 * değer YOKTUR; `value: undefined` burada "kullanıcının doldurması/düzeltmesi
 * gereken alan" işaretidir (bkz. `Suggestion.value` sözleşmesi).
 *
 * Not: bu dosyada bir ara `repairable ? normalized : undefined` dalı yazılmıştı.
 * Ölçüldü — `isValidGtip` normalizasyon-farkında olduğu için o dala ULAŞAN
 * hiçbir girdi yok; ÖLÜ KODDU, kaldırıldı.
 */
const DELIVERY_GTIP_FORMAT_12_DIGIT: SuggestionRule = {
  id: 'delivery/gtip-format-12-digit',
  applies: (input) =>
    input.lines.some(l => {
      const gtip = l.delivery?.gtipNo;
      if (!gtip) return false;
      return !isValidGtip(gtip);
    }),
  produce: (input) => {
    const out: Suggestion[] = [];
    for (let i = 0; i < input.lines.length; i++) {
      const gtip = input.lines[i].delivery?.gtipNo;
      if (!gtip) continue;
      const defect = describeGtipDefect(gtip);
      if (defect === undefined) continue;

      out.push({
        path: `lines[${i}].delivery.gtipNo`,
        value: undefined,
        reason: `${defect} Düzeltiniz.`,
        severity: 'recommended',
        ruleId: 'delivery/gtip-format-12-digit',
      });
    }
    return out;
  },
};

const DELIVERY_TRANSPORT_MODE_SUGGEST_IHRACAT: SuggestionRule = {
  id: 'delivery/transport-mode-suggest-ihracat',
  applies: (input) =>
    input.profile === 'IHRACAT' &&
    input.lines.some(l => !l.delivery?.transportModeCode),
  produce: (input) => {
    const out: Suggestion[] = [];
    for (let i = 0; i < input.lines.length; i++) {
      if (!input.lines[i].delivery?.transportModeCode) {
        out.push({
          path: `lines[${i}].delivery.transportModeCode`,
          value: '4',
          reason: 'İhracatta ulaşım modu önerilir (1=Deniz, 3=Karayolu, 4=Havayolu).',
          severity: 'optional',
          ruleId: 'delivery/transport-mode-suggest-ihracat',
          displayLabel: '4 — Havayolu',
          displayValue: '4',
        });
      }
    }
    return out;
  },
};

export const DELIVERY_SUGGESTIONS: SuggestionRule[] = [
  DELIVERY_IHRACAT_INCOTERMS_REQUIRED,
  DELIVERY_GTIP_FORMAT_12_DIGIT,
  DELIVERY_TRANSPORT_MODE_SUGGEST_IHRACAT,
];
