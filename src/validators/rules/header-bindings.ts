/**
 * S3 — BAĞLAMA katmanı: **NEREDE denetlenecek**.
 *
 * GİB'in `UBL-TR_Main_Schematron`'unun karşılığı: 0 assert, yalnız context +
 * `extends`. Buradaki her satır "şu ortak yüklem, şu belgenin şu alanına
 * bağlıdır" der. Yüklem BURAYA YAZILMAZ — `common-field-rules.ts`ten alınır.
 *
 * Tablolar KOD DEĞİL VERİDİR: yeni bir belge türü (e-SMM, e-MM, e-Müstahsil)
 * geldiğinde buraya bir tablo eklenir, yüklem katmanına DOKUNULMAZ. Bir ortak
 * kuralın bir belgede eksik olup olmadığı da artık tabloya bakılarak GÖRÜLÜR —
 * S3 öncesinde bunu görmenin yolu üç ayrı dosyayı satır satır karşılaştırmaktı
 * ve `issue-date-range` tam bu yüzden gözden kaçmıştı.
 *
 * ## Sözlük farkları BİLEREK burada
 *
 * "Fatura numarası (cbc:ID) zorunludur" ↔ "İrsaliye numarası zorunludur":
 * kural aynı, metin farklı. Metin belgeye aitse bağlama satırına aittir.
 * Mevcut mesajlar S3'te BİREBİR korunmuştur — bu adım davranış değiştirmez,
 * yalnız `issueDate` aralığını irsaliyeye BAĞLAR.
 */

import type { InvoiceInput } from '../../types/invoice-input';
import type { DespatchInput } from '../../types/despatch-input';
import type { DespatchValidationStage } from '../despatch-validators';
import { InvoiceProfileId, DespatchProfileId, DespatchTypeCode } from '../../types/enums';
import type { FieldBinding } from './field-rule';
import {
  documentIdRule,
  uuidRule,
  dateFormatRule,
  timeFormatRule,
  issueDateRangeRule,
  enumValueRule,
} from './common-field-rules';

/**
 * e-Fatura künye bağlamaları — `validateCommon`ın §1.2 bloğunun tamamı.
 * Sıra = eski koddaki değerlendirme sırası (hata dizisi sırası korunur).
 */
export const INVOICE_HEADER_BINDINGS: readonly FieldBinding<InvoiceInput>[] = [
  {
    path: 'id',
    select: i => i.id,
    presence: 'required',
    missingMessage: 'Fatura numarası (cbc:ID) zorunludur',
    rules: [documentIdRule],
  },
  {
    path: 'uuid',
    select: i => i.uuid,
    presence: 'required',
    missingMessage: 'UUID (cbc:UUID) zorunludur',
    rules: [uuidRule],
  },
  {
    /* B-68: ProfileID kapalı listesi (`Common_Schematron:147`). Yüklem ortak,
     * küme faturaya özgü. */
    path: 'profileId',
    select: i => i.profileId,
    presence: 'required',
    missingMessage: 'ProfileID (cbc:ProfileID) zorunludur',
    rules: [enumValueRule(Object.values(InvoiceProfileId))],
  },
  {
    /* Tip yalnız DOLULUK denetlenir; geçerli tip kümesi profille birlikte
     * `validateCrossMatrix`te sınanır (profil×tip matrisi). */
    path: 'invoiceTypeCode',
    select: i => i.invoiceTypeCode,
    presence: 'required',
    missingMessage: 'InvoiceTypeCode (cbc:InvoiceTypeCode) zorunludur',
    rules: [],
  },
  {
    /* B-65 aralığı ARTIK BURADA GÖRÜNÜR — gövdeye gömülü değil. */
    path: 'issueDate',
    select: i => i.issueDate,
    presence: 'required',
    missingMessage: 'Düzenleme tarihi (cbc:IssueDate) zorunludur',
    rules: [dateFormatRule, issueDateRangeRule],
  },
  {
    /* Faturada `cbc:IssueTime` OPSİYONELDİR (irsaliyenin aksine) — verilirse
     * biçimi denetlenir. */
    path: 'issueTime',
    select: i => i.issueTime,
    presence: 'optional',
    rules: [timeFormatRule],
  },
];

/**
 * e-İrsaliye künye bağlamaları.
 *
 * 🔴 `issueDate` aralığı (B-65) S3'te İLK KEZ buraya bağlandı. GİB'in ORTAK
 * kuralı olduğu hâlde irsaliye onu hiç almıyordu: 1999 tarihli ya da gelecek
 * yıla düzenlenmiş bir irsaliye kütüphaneden sessizce geçiyordu. **Bu kasıtlı
 * bir sıkılaşmadır**; bugün geçen bazı girdiler artık reddedilir.
 *
 * ⚠️ Aralık kuralı ile `validateDespatchChronology` FARKLI kapılardır ve ikisi
 * de gereklidir: kronoloji "sevk ≥ düzenleme" der (belge İÇİ tutarlılık),
 * aralık ise "düzenleme ≤ bugün" der (takvim kapısı). MATBUDAN istisnası yalnız
 * kronolojiye aittir — matbu dönüşümde DÜZENLEME tarihi yine gelecekte olamaz.
 *
 * ── Numara neden AŞAMAya bağlı
 * Belge numarası (`cbc:ID`) belgenin kendisinden gelmez; gönderim anında
 * seri/numara motoru verir. Form düzenlenirken numara BOŞ olmalıdır. Gerekçenin
 * tamamı `DespatchValidationStage` JSDoc'undadır.
 */
export function despatchHeaderBindings(
  stage: DespatchValidationStage,
): readonly FieldBinding<DespatchInput>[] {
  return [
    {
      path: 'id',
      select: d => d.id,
      presence: stage === 'document' ? 'required' : 'optional',
      missingMessage: 'İrsaliye numarası zorunludur',
      // Biçim denetimi HER AŞAMADA koşar: elle yazılmış yanlış numara sessiz kalmamalı.
      rules: [documentIdRule],
    },
    {
      path: 'uuid',
      select: d => d.uuid,
      presence: 'required',
      missingMessage: 'UUID zorunludur',
      expected: 'UUID formatı',
      rules: [uuidRule],
    },
    {
      // O3 — Schematron `ProfileIDTypeDespatchAdvice`.
      path: 'profileId',
      select: d => d.profileId,
      presence: 'required',
      missingMessage: 'ProfileID zorunludur',
      rules: [enumValueRule(Object.values(DespatchProfileId))],
    },
    {
      // O3 — Schematron `DespatchAdviceTypeCodeCheck`.
      path: 'despatchTypeCode',
      select: d => d.despatchTypeCode,
      presence: 'required',
      missingMessage: 'DespatchAdviceTypeCode zorunludur',
      rules: [enumValueRule(Object.values(DespatchTypeCode))],
    },
    {
      path: 'issueDate',
      select: d => d.issueDate,
      presence: 'required',
      missingMessage: 'Düzenleme tarihi zorunludur',
      rules: [dateFormatRule, issueDateRangeRule],
    },
    {
      /* B-18: irsaliyede `cbc:IssueTime` XSD'de ZORUNLUDUR (M6 parent-child —
       * parent `Despatch` zorunlu ⇒ `issueTime` zorunlu). */
      path: 'issueTime',
      select: d => d.issueTime,
      presence: 'required',
      missingMessage: 'Düzenleme saati (cbc:IssueTime) zorunludur (B-18)',
      rules: [timeFormatRule],
    },
  ];
}
