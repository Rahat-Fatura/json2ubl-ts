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
 * - KAMU profili                    — alıcı kurum (buyerCustomer) ve VKN/TCKN'si
 * - Fatura numarası deseni          — doluysa GİB biçimine uymalı
 * - `EnerjiPartyIdentificationPlakaCheck`  — SARJ/SARJANLIK'ta alıcıda PLAKA
 * - `EnerjiInvoicePeriodCheck`             — SARJ/SARJANLIK'ta dönem + saatleri
 * - `EnerjiItemInstanceSerialIDCheck`      — SARJANLIK'ta kalemde seri no
 * - `YatirimTesvikCommodityClassificationCheck` — YTB'de harcama tipi
 * - `YatirimTesvikContractDocumentReferenceIDCheck` — YTB'de 6 haneli YTB no
 *
 * `InvoiceInput` katmanındaki `enerji-validator` aynı ESU kuralını zaten
 * uyguluyor; bu dosya onu SİMPLE girdiye taşır ki oturum (ve dolayısıyla portal
 * paneli) belge kurulurken uyarabilsin.
 */

import type { SimpleInvoiceInput } from '../calculator/simple-types';
import type { ValidationError } from '../errors/ubl-build-error';
import { DEMIRBAS_KDV_EXEMPTION_CODES, INVOICE_ID_REGEX } from '../config/constants';

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

  // ── Fatura numarası deseni (doluysa)
  /* `InvoiceBuilder` bu deseni strict'te zaten uyguluyor ama oturum doğrulaması
   * görmüyordu; portalın "elle seri" girişinde (`series-template-row.tsx`)
   * kullanıcı bozuk numara yazınca hiçbir uyarı çıkmıyordu. GİB tarafı da
   * numarasız-doğrulama profilinde bu kontrolü bastırdığı için çift kör noktaydı.
   *
   * ⚠️ BOŞ numara HATA DEĞİLDİR: portal numarayı mimkit serisinden gönderim
   * anında ayırır; taslak aşamasında numarasız belge meşrudur. */
  if (!bos(input.id) && !INVOICE_ID_REGEX.test(String(input.id))) {
    errors.push({
      code: 'INVALID_FORMAT',
      message: 'Fatura numarası GİB biçimine uymuyor: 3 harf/rakam + yıl (20XX) + 9 rakam.',
      path: 'id',
      expected: String(INVOICE_ID_REGEX.source),
      actual: String(input.id),
    });
  }

  // ── KAMU → alıcı kurum + VKN
  /* `profile-validators.ts` bu kuralı InvoiceInput katmanında zaten uyguluyor,
   * ama orası YALNIZ `SimpleInvoiceBuilder` strict yolunda çalışır. Oturum
   * doğrulamasında yoktu → portal sessiz kalıyordu ve GİB de yakalamıyordu
   * (kaplama seferi K4-031: iki taraflı kör nokta). */
  if (profil === 'KAMU') {
    const bc = input.buyerCustomer as { name?: string; taxNumber?: string } | undefined;
    if (!bc) {
      errors.push({
        code: 'PROFILE_REQUIREMENT',
        message: 'Kamu faturalarında alıcı kurum (buyerCustomer) zorunludur.',
        path: 'buyerCustomer',
      });
    } else if (bos(bc.taxNumber)) {
      errors.push({
        code: 'PROFILE_REQUIREMENT',
        message: 'Kamu faturalarında alıcı kurumun VKN/TCKN bilgisi zorunludur.',
        path: 'buyerCustomer.taxNumber',
      });
    }
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

  // ── ENERJİ: alıcıda PLAKA, fatura dönemi (saatli), SARJANLIK'ta kalem seri no
  if (tip === 'SARJ' || tip === 'SARJANLIK') {
    const kimlikler = (input.customer?.identifications ?? []) as Array<{ schemeId?: string; value?: string }>;
    const plaka = kimlikler.find(k => k.schemeId === 'PLAKA');
    if (!plaka || bos(plaka.value)) {
      errors.push({
        code: 'PROFILE_REQUIREMENT',
        message: 'Şarj faturalarında alıcıda PLAKA kimliği zorunludur.',
        path: 'customer.identifications',
        expected: "schemeId='PLAKA' taşıyan bir kimlik",
      });
    } else if (!/^[A-Z0-9_-]{1,50}$/.test(String(plaka.value).trim())) {
      errors.push({
        code: 'INVALID_FORMAT',
        message: 'PLAKA değeri yalnız büyük harf, rakam, tire ve alt çizgi içerebilir (en çok 50 karakter).',
        path: 'customer.identifications',
        actual: String(plaka.value),
      });
    }

    /* Şematron yalnız dönemin VARLIĞINI değil, başlangıç/bitiş SAATLERİNİ de arar. */
    const d = input.invoicePeriod as
      { startDate?: string; startTime?: string; endDate?: string; endTime?: string } | undefined;
    const eksik = !d || bos(d.startDate) || bos(d.startTime) || bos(d.endDate) || bos(d.endTime);
    if (eksik) {
      errors.push({
        code: 'PROFILE_REQUIREMENT',
        message: 'Şarj faturalarında fatura dönemi başlangıç/bitiş tarih VE saatleriyle birlikte zorunludur.',
        path: 'invoicePeriod',
        expected: 'startDate + startTime + endDate + endTime',
      });
    }

    if (tip === 'SARJANLIK') {
      input.lines.forEach((line, i) => {
        if (bos(line.serialId)) {
          errors.push({
            code: 'PROFILE_REQUIREMENT',
            message: 'Şarj anlık faturalarında her kalemde seri numarası zorunludur.',
            path: `lines[${i}].serialId`,
          });
        }
      });
    }
  }

  // ── YATIRIM TEŞVİK: harcama tipi + 6 haneli YTB numarası
  if (ytbKapsam) {
    input.lines.forEach((line, i) => {
      if (bos(line.itemClassificationCode)) {
        errors.push({
          code: 'PROFILE_REQUIREMENT',
          message: 'Yatırım teşvik faturasında kalem harcama tipi zorunludur.',
          path: `lines[${i}].itemClassificationCode`,
        });
      }
    });
    if (bos(input.ytbNo)) {
      errors.push({
        code: 'PROFILE_REQUIREMENT',
        message: 'Yatırım teşvik faturasında 6 haneli teşvik belge numarası zorunludur.',
        path: 'ytbNo',
        expected: '6 haneli numara',
      });
    } else if (!/^\d{6}$/.test(String(input.ytbNo).trim())) {
      errors.push({
        code: 'INVALID_FORMAT',
        message: 'Yatırım teşvik belge numarası 6 haneli olmalıdır.',
        path: 'ytbNo',
        actual: String(input.ytbNo),
      });
    }
  }

  return errors;
}
