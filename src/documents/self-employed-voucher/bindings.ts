/**
 * e-SMM künye BAĞLAMA tablosu — "NEREDE denetlenecek".
 *
 * 🔑 MİMARİNİN SINANDIĞI YER. e-SMM'in gövdesini GİB dayatmıyor; bu tablo
 * UBL-TR ortak yüklemlerinin GÖNÜLLÜ devralınmasıdır ve her satır tek satırlık
 * bir bağlamadır — hiçbir yüklem burada YENİDEN YAZILMAZ. Prod veri seçimi
 * zaten doğruluyor: kimse zorlamadığı hâlde 12/12 belge `UBLVersionID=2.1`,
 * `CustomizationID=TR1.2`, `^[A-Z0-9]{3}20\d{2}\d{9}$` numara biçimi ve
 * `schemeID ∈ {VKN, TCKN, MERSISNO}` kuralına uyuyor.
 *
 * ── FATURADAN İKİ SAPMA, İKİSİ DE GEREKÇELİ ────────────────────────────────
 *  • `issueTime` ZORUNLU (faturada opsiyonel) — 509 VUK GT IV.4.3-c.
 *  • `profileId`/`voucherTypeCode` kümeleri TEK elemanlıdır; kapalı liste
 *    yüklemi (`enumValueRule`) yine ORTAKTIR, yalnız küme belgeye aittir.
 *
 * ── AŞAMA ──────────────────────────────────────────────────────────────────
 * Belge numarası (`cbc:ID`) belgeden gelmez, gönderim anında seri/numara motoru
 * verir. Form düzenlenirken numara BOŞ olmalıdır; gerekçenin tamamı
 * `SelfEmployedVoucherValidationStage` JSDoc'undadır (irsaliyeyle aynı desen).
 */

import type { SelfEmployedVoucherInput } from './input';
import { SelfEmployedVoucherProfileId, SelfEmployedVoucherTypeCode } from '../../types/enums';
import type { FieldBinding } from '../../ubltr/rules/field-rule';
import {
  documentIdRule,
  uuidRule,
  dateFormatRule,
  timeFormatRule,
  issueDateRangeRule,
  enumValueRule,
} from '../../ubltr/rules/global/common-field-rules';

/**
 * Doğrulamanın koştuğu AŞAMA — `DespatchValidationStage` ile aynı sözleşme.
 *
 *  • `'document'` (VARSAYILAN) — bitmiş belge; numara ZORUNLU.
 *  • `'session'` — düzenlenmekte olan form; numaranın YOKLUĞU hata değildir,
 *    ama VARSA biçimi yine denetlenir (elle yazılmış yanlış numara sessiz kalmamalı).
 */
export type SelfEmployedVoucherValidationStage = 'document' | 'session';

/** e-SMM künye bağlamaları — aşamaya göre numara zorunluluğu değişir. */
export function selfEmployedVoucherHeaderBindings(
  stage: SelfEmployedVoucherValidationStage,
): readonly FieldBinding<SelfEmployedVoucherInput>[] {
  return [
    {
      path: 'id',
      select: v => v.id,
      presence: stage === 'document' ? 'required' : 'optional',
      missingMessage: 'Makbuz numarası (cbc:ID) zorunludur',
      rules: [documentIdRule],
    },
    {
      path: 'uuid',
      select: v => v.uuid,
      presence: 'required',
      missingMessage: 'ETTN (cbc:UUID) zorunludur',
      rules: [uuidRule],
    },
    {
      path: 'profileId',
      select: v => v.profileId,
      presence: 'required',
      missingMessage: 'ProfileID (cbc:ProfileID) zorunludur',
      rules: [enumValueRule(Object.values(SelfEmployedVoucherProfileId))],
    },
    {
      path: 'voucherTypeCode',
      select: v => v.voucherTypeCode,
      presence: 'required',
      missingMessage: 'Belge tipi (cbc:InvoiceTypeCode) zorunludur',
      rules: [enumValueRule(Object.values(SelfEmployedVoucherTypeCode))],
    },
    {
      /* B-65 aralığı — GİB'in ORTAK kuralı (`Common_Schematron:169-170`).
       * Tek satırla devralınıyor; e-SMM için yeniden yazılmadı. */
      path: 'issueDate',
      select: v => v.issueDate,
      presence: 'required',
      missingMessage: 'Düzenleme tarihi (cbc:IssueDate) zorunludur',
      rules: [dateFormatRule, issueDateRangeRule],
    },
    {
      /* 🔴 Faturadan SAPMA: e-SMM'de saat ZORUNLUDUR (509 VUK GT IV.4.3-c);
       * tahsilat anında düzenlenen bir belgede saat belgenin kendisine aittir.
       * 12/12 prod belge taşır. */
      path: 'issueTime',
      select: v => v.issueTime,
      presence: 'required',
      missingMessage: 'Düzenleme saati (cbc:IssueTime) zorunludur',
      rules: [timeFormatRule],
    },
  ];
}
