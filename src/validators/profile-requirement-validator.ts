/**
 * Profil/tip bazlı ZORUNLU ALAN kontrolleri — simple-input katmanı.
 *
 * Buradaki iki kural GİB şematronunda VAR ama kütüphanenin `InvoiceSession`
 * doğrulama boru hattında YOKTU. Sonuç: portal kullanıcısı eksik belgeyi
 * sorunsuz kuruyor, reddi GİB kapısında öğreniyordu (MimForge kaplama seferi).
 *
 * - `EnerjiESURaporIDCheck`         — YALNIZ SARJ'da ESURaporID ek belgesi (GUID + tarih biçimi dahil)
 * - `IADEInvioceCheck`              — IADE ailesinde referans fatura numarası deseni
 * - `YatirimTesvikItemInstanceCheck` — YTB harcama tipi 01'de Makine Adı
 *                                     (`ModelName`) + Makine Teçhizat Sıra No
 *                                     (`ProductTraceID`) + Makine ID (`SerialID`)
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
import type { InvoiceTypeCode } from '../types/enums';
import {
  DEMIRBAS_KDV_EXEMPTION_CODES,
  ESU_RAPOR_ID_SCHEME_ID,
  ESU_RAPOR_ISSUE_DATE_REGEX,
  IADE_GROUP_TYPES,
  INVOICE_ID_REGEX,
  UUID_REGEX,
} from '../config/constants';
/* 🔑 4.5.2 — kapsam yüklemi ARTIK BURADA TANIMLI DEĞİL.
 *
 * Aynı kural görünürlük tarafında (`line-field-visibility` / `invoice-rules`)
 * ikinci kez yazılmıştı ve orada e-Arşiv düzlemi UNUTULMUŞTU: doğrulayıcı
 * "zorunlu" diyor, alan hiç açılmıyordu. İki kopya kalmasın diye yüklem
 * `config/schematron-scopes`e taşındı; her iki taraf oradan okur. */
import { isYatirimTesvikScope } from '../config/schematron-scopes';

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
  /* Şematron `EnerjiESURaporIDCheck` yalnız VARLIK değil BİÇİM de arar: cbc:ID geçerli
   * GUID, cbc:IssueDate `20xx-AA-GG`. Eski kod sadece `schemeId === 'ESURaporID'`
   * kontrolü yapıyordu; kullanıcı ID'yi serbest metin yazıp tarihi boş bırakınca
   * oturum "temiz" diyor, GİB kapıda reddediyordu (canlı portal testi 2026-09-07).
   *
   * ⚠️ `issueDate` BOŞSA hata YOKTUR: mapper belge tarihine düşer (`buildAdditionalDocuments`).
   * Burada yalnız DOLU-ama-BOZUK tarih hata üretir — kullanıcıyı olmayan bir alanı
   * doldurmaya zorlamayız. */
  if (ENERJI_TYPES.has(tip)) {
    const esuBelgeleri = (input.additionalDocuments ?? []).filter(
      d => (d as { schemeId?: string }).schemeId === ESU_RAPOR_ID_SCHEME_ID,
    );
    if (esuBelgeleri.length === 0) {
      errors.push({
        code: 'MISSING_FIELD',
        message:
          'SARJ faturalarında schemeID="ESURaporID" olan bir ek belge zorunludur (EnerjiESURaporIDCheck).',
        path: 'additionalDocuments',
        expected: `schemeId="${ESU_RAPOR_ID_SCHEME_ID}" taşıyan en az bir ek belge`,
      });
    } else {
      esuBelgeleri.forEach(belge => {
        const sira = (input.additionalDocuments ?? []).indexOf(belge);
        const kimlik = String(belge.id ?? '').trim();
        if (!UUID_REGEX.test(kimlik)) {
          errors.push({
            code: 'INVALID_FORMAT',
            message:
              'ESU rapor numarası GUID biçiminde olmalıdır ' +
              '(ör: 3f2504e0-4f89-41d3-9a0c-0305e82c3301).',
            path: `additionalDocuments[${sira}].id`,
            expected: '8-4-4-4-12 onaltılık GUID',
            actual: kimlik,
          });
        }
        const tarih = String(belge.issueDate ?? '').trim();
        if (tarih !== '' && !ESU_RAPOR_ISSUE_DATE_REGEX.test(tarih)) {
          errors.push({
            code: 'INVALID_FORMAT',
            message: 'ESU rapor tarihi YYYY-AA-GG biçiminde olmalıdır (ör: 2026-04-23).',
            path: `additionalDocuments[${sira}].issueDate`,
            expected: 'YYYY-AA-GG',
            actual: tarih,
          });
        }
      });
    }
  }

  // ── Yatırım teşvik, harcama tipi 01 → Makine Adı + Makine Teçhizat Sıra No + Makine ID
  /* Şematron `YatirimTesvikItemInstanceCheck` (UBL-TR_Common_Schematron.xml:491-493)
   * ÜÇ alanın da boş olmamasını ister:
   *   cac:Item/cbc:ModelName                        → GİB dilinde «Makine Adı»
   *   cac:Item/cac:ItemInstance/cbc:ProductTraceID  → «Makine Teçhizat Sıra No»
   *   cac:Item/cac:ItemInstance/cbc:SerialID        → «Makine ID»
   * GİB ret metni: "Yatırım Teşvik Faturasında Harcama Tipi 01 için Makine Adı,
   * Makine Teçhizat Sıra No ve Makine ID alanları belirtilmelidir."
   *
   * 🔴 `cbc:BrandName` (Marka) bu kuralda HİÇ GEÇMEZ. Eski kod tam tersini
   * yapıyordu: markayı zorunlu sayıyor (YANLIŞ POZİTİF — GİB istemiyor), sıra no
   * ile makine ID'ye ise hiç bakmıyordu (YANLIŞ NEGATİF — kullanıcı eksiği ancak
   * GİB kapıda reddedince öğreniyordu).
   *
   * Mesajlar GİB'in ret metnindeki adlandırmayı BİREBİR kullanır ki kullanıcı
   * ekrandaki etiketle GİB hatasını eşleştirebilsin. */
  const ytbKapsam = isYatirimTesvikScope(profil, tip);
  if (ytbKapsam) {
    input.lines.forEach((line, i) => {
      if (line.itemClassificationCode !== '01') return;
      if (bos(line.model)) {
        errors.push({
          code: 'MISSING_FIELD',
          message:
            'Yatırım Teşvik Faturasında Harcama Tipi 01 için Makine Adı zorunludur (YatirimTesvikItemInstanceCheck).',
          path: `lines[${i}].model`,
        });
      }
      if (bos(line.productTraceId)) {
        errors.push({
          code: 'MISSING_FIELD',
          message:
            'Yatırım Teşvik Faturasında Harcama Tipi 01 için Makine Teçhizat Sıra No zorunludur (YatirimTesvikItemInstanceCheck).',
          path: `lines[${i}].productTraceId`,
        });
      }
      if (bos(line.serialId)) {
        errors.push({
          code: 'MISSING_FIELD',
          message:
            'Yatırım Teşvik Faturasında Harcama Tipi 01 için Makine ID zorunludur (YatirimTesvikItemInstanceCheck).',
          path: `lines[${i}].serialId`,
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

  // ── IADE ailesi → referans fatura numarası GİB fatura-no deseninde olmalı
  /* Şematron `IADEInvioceCheck` yalnız UZUNLUĞA bakar (`string-length(...) = 16`), bu
   * yüzden "abc-2026-00000002" gibi 16-17 karakterli ama desensiz bir değer GİB'e kadar
   * gidip orada reddoluyordu. Desen kontrolü bizde: 3 hane alfanümerik seri + 4 hane yıl
   * + 9 hane sıra. Kaynak TEK: `INVOICE_ID_REGEX` (belgenin kendi numarası ile aynı
   * kural — iade edilen de sonuçta bir e-Fatura numarasıdır), ikinci desen YAZILMADI.
   *
   * ⚠️ BOŞ referans burada hata değildir: onu `invoice-rules.validateInvoiceState`
   * ("İade faturalarında iade edilen fatura referansı zorunludur") zaten söylüyor. */
  if (IADE_GROUP_TYPES.has(tip as InvoiceTypeCode)) {
    const referansNo = String(input.billingReference?.id ?? '').trim();
    if (referansNo !== '' && !INVOICE_ID_REGEX.test(referansNo)) {
      errors.push({
        code: 'INVALID_FORMAT',
        message:
          'İade edilen fatura numarası GİB biçimine uymuyor: 3 hane seri (harf/rakam) + ' +
          '4 hane yıl + 9 hane sıra, toplam 16 karakter (ör: ABC2026000000002).',
        path: 'billingReference.id',
        expected: 'ABC2026000000002 biçimi (16 karakter)',
        actual: referansNo,
      });
    }
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
