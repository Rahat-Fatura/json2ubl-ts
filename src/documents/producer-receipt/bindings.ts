/**
 * e-MM künye BAĞLAMA tablosu — "NEREDE denetlenecek".
 *
 * 🔑 KÖK DEĞİŞTİ, YÜKLEMLER DEĞİŞMEDİ. e-MM `CreditNote` köklüdür; buna rağmen
 * künye kuralları `Invoice` köklü belgelerle BİREBİR aynıdır ve bu bir tahmin
 * değil ÖLÇÜMDÜR. CANLI şematron `CreditNote` kökünde şunları koşturuyor
 * (2026-09-17, :8081):
 *   • `cbc:ID` biçimi (`ABC2009123456789`)      → `documentIdRule`
 *   • `cbc:IssueDate ≥ 2005-01-01` (B-65)        → `issueDateRangeRule`
 *   • `cbc:CustomizationID ∈ {TR1.2, TR1.2.1}`   → `UBL_CONSTANTS` sabiti
 *   • `schemeID` kod-listesi + VKN/TCKN varlığı  → `validateParty`
 *   • `unitCode` kod-listesi                     → `validateLineIdentity`
 * Yani ortak yüklem katmanı buraya BEDAVA devrolur; tek satırlık bağlamalar.
 *
 * ── 🔴 ŞEMATRONUN KOŞTURMADIKLARI — KAPI BİZDE ─────────────────────────────
 * Aynı ölçümde şunların `CreditNote` kökünde HİÇ assert'i OLMADIĞI görüldü:
 *   • `cbc:ProfileID`          — uydurma bir profil bile geçiyor,
 *   • `cbc:CreditNoteTypeCode` — uydurma bir tip kodu bile geçiyor,
 *   • `cbc:TaxTypeCode`        — kod listesi dışı kod bile geçiyor.
 * e-SMM'de bu üçü için bir BASTIRMA profili gerekiyordu (şematron reddediyordu);
 * e-MM'de tam tersi bir risk var: şematron SESSİZ. Bu yüzden kapalı kümeler
 * aşağıda ve `input.ts`te TİP DÜZEYİNDE tutuluyor — doğrulayıcı tutmuyorsa
 * tutacak olan biziz.
 *
 * ── AŞAMA ──────────────────────────────────────────────────────────────────
 * Belge numarası (`cbc:ID`) belgeden gelmez, gönderim anında seri/numara motoru
 * verir. Gerekçenin tamamı ortak `ValidationStage` JSDoc'undadır.
 */

import type { ProducerReceiptInput } from './input';
import { ProducerReceiptProfileId, ProducerReceiptTypeCode } from '../../types/enums';
import type { FieldBinding } from '../../ubltr/rules/field-rule';
import type { ValidationStage } from '../../ubltr/rules/shared/validation-stage';
import {
  documentIdRule,
  uuidRule,
  dateFormatRule,
  timeFormatRule,
  issueDateRangeRule,
  enumValueRule,
} from '../../ubltr/rules/global/common-field-rules';

/**
 * Doğrulamanın koştuğu AŞAMA — ortak `ValidationStage`in TAKMA ADI.
 * Gövde `ubltr/rules/shared/validation-stage.ts`tedir.
 */
export type ProducerReceiptValidationStage = ValidationStage;

/** e-MM künye bağlamaları — aşamaya göre numara zorunluluğu değişir. */
export function producerReceiptHeaderBindings(
  stage: ProducerReceiptValidationStage,
): readonly FieldBinding<ProducerReceiptInput>[] {
  return [
    {
      path: 'id',
      select: r => r.id,
      presence: stage === 'document' ? 'required' : 'optional',
      missingMessage: 'Makbuz numarası (cbc:ID) zorunludur',
      rules: [documentIdRule],
    },
    {
      path: 'uuid',
      select: r => r.uuid,
      presence: 'required',
      missingMessage: 'ETTN (cbc:UUID) zorunludur',
      rules: [uuidRule],
    },
    {
      /* 🔴 Şematron bu alanı `CreditNote` kökünde DENETLEMİYOR (ölçüldü) —
       * kapalı liste yüklemi burada tek kapıdır, kolaylık değil. */
      path: 'profileId',
      select: r => r.profileId,
      presence: 'required',
      missingMessage: 'ProfileID (cbc:ProfileID) zorunludur',
      rules: [enumValueRule(Object.values(ProducerReceiptProfileId))],
    },
    {
      // 🔴 Aynı durum: `CreditNoteTypeCode` için şematron assert'i YOK.
      path: 'receiptTypeCode',
      select: r => r.receiptTypeCode,
      presence: 'required',
      missingMessage: 'Belge tipi (cbc:CreditNoteTypeCode) zorunludur',
      rules: [enumValueRule(Object.values(ProducerReceiptTypeCode))],
    },
    {
      /* B-65 aralığı — GİB'in ORTAK kuralı. CANLI ÖLÇÜLDÜ: `CreditNote`
       * kökünde de patlıyor ("01.01.2005 tarihinden önce bir tarih olamaz").
       * Tek satırla devralınıyor; e-MM için yeniden yazılmadı. */
      path: 'issueDate',
      select: r => r.issueDate,
      presence: 'required',
      missingMessage: 'Düzenleme tarihi (cbc:IssueDate) zorunludur',
      rules: [dateFormatRule, issueDateRangeRule],
    },
    {
      /* Saat ZORUNLU — 27/27 prod belge taşır (e-SMM ile aynı aile). */
      path: 'issueTime',
      select: r => r.issueTime,
      presence: 'required',
      missingMessage: 'Düzenleme saati (cbc:IssueTime) zorunludur',
      rules: [timeFormatRule],
    },
    {
      /* Teslim tarihi OPSİYONELDİR ama VARSA biçimi denetlenir. Zorunlu
       * yapılmadı: 27/27 prod belgede var olması "her e-MM'de olmalı"
       * demek değildir, ve olmayan bir zorunluluğu dayatmak kütüphanenin
       * yanlışlıkla reddetme disiplinine aykırıdır. */
      path: 'actualDeliveryDate',
      select: r => r.actualDeliveryDate,
      presence: 'optional',
      rules: [dateFormatRule],
    },
  ];
}
