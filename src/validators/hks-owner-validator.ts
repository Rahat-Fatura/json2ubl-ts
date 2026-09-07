/**
 * HKS mal sahibi (MALSAHIBI*) alan tutarlılığı — UYARI seviyesi.
 *
 * Hal faturasında kalem, künyenin yanında malın SAHİBİNİ de taşır:
 *   cac:Item/cac:AdditionalItemIdentification/cbc:ID[@schemeID='MALSAHIBIADSOYADUNVAN']
 *   cac:Item/cac:AdditionalItemIdentification/cbc:ID[@schemeID='MALSAHIBIVKNTCKN']
 * Komisyoncu, malı kendi adına değil mal sahibi adına satar; alıcının belgede
 * kimin malını aldığını görmesi hal kaydının çalışma biçiminin parçasıdır.
 *
 * ── 🔴 NEDEN UYARI, NEDEN HATA DEĞİL
 * Bu kural bir GÖZLEMDİR — yazılı bir GİB kuralı DEĞİL. Ölçüldü:
 *   • Şematronda MALSAHIBI* geçen TEK BİR assert yok (ne Common ne Main).
 *   • VKN/TCKN uzunluk kuralları (`PartyIdentification` blokları) yalnız TARAF
 *     kimliklerine bakar; `AdditionalItemIdentification`'a hiç uğramaz.
 *   • `UBL-TR_Codelist.xml` içindeki `$AdditionalItemIdentificationIDType`
 *     listesi (KUNYENO, ILAC, TIBBICIHAZ, TELEFON, TABLET_PC, DIGER) HİÇBİR
 *     assert tarafından KULLANILMIYOR — yani schemeID serbesttir. Canlı sonda
 *     (xslt-service :8081, paket 20260701) MALSAHIBIADSOYADUNVAN +
 *     MALSAHIBIVKNTCKN taşıyan HKS faturası 0 ihlalle yeşil döndü.
 * Kural hata yapılsaydı, GİB'in kabul ettiği geçerli belgeleri ÜRETİLEMEZ hâle
 * getirirdik. Uyarı, kullanıcıyı bilgilendirir ve belgeyi bloke etmez.
 *
 * ── KAPSAM (iki düzlem, komisyoncu HARİÇ)
 *   • ProfileID=HKS          → SATIS / ISTISNA / TEVKIFAT  (e-Fatura düzlemi)
 *   • ProfileID=EARSIVFATURA → HKSSATIS                    (e-Arşiv düzlemi)
 * `KOMISYONCU`/`HKSKOMISYONCU` KAPSAM DIŞI: orada mal sahibi ilişkisi faturanın
 * kendi taraflarıyla kurulur, kalem kimliğiyle değil.
 *
 * Mekanizma NOTU: burası `ValidationError` değil `ValidationWarning` üretir ve
 * `InvoiceSession.validate()` içinde kural-tabanlı uyarı dizisine katılır —
 * `validateInvoiceState`'in `severity:'warning'` üretenleriyle aynı yol. Hata
 * boru hattına (validator → köprü → severity:'error') BİLEREK bağlanmadı:
 * o köprü her ValidationError'ı 'error' yapar ve belge kurulumunu kırar.
 */

import type { SimpleInvoiceInput } from '../calculator/simple-types';
import type { ValidationWarning } from '../calculator/invoice-rules';

/** `schemeID` — mal sahibi ad/soyad/unvan (kod listesinde YOK, şematron da bakmıyor) */
const OWNER_NAME_SCHEME_ID = 'MALSAHIBIADSOYADUNVAN';

/** `schemeID` — mal sahibi VKN (10) veya TCKN (11) */
const OWNER_TAX_ID_SCHEME_ID = 'MALSAHIBIVKNTCKN';

/** VKN 10, TCKN 11 hane — ikisi de yalnız rakam */
const OWNER_TAX_ID_PATTERN = /^(\d{10}|\d{11})$/;

/** Mal sahibi alanlarının beklendiği profil×tip çiftleri (komisyoncu HARİÇ) */
function isOwnerFieldScope(profile: string, type: string): boolean {
  if (profile === 'HKS') {
    // HKS'in komisyoncu tipi kapsam dışı; kalan HKS tipleri kapsamda.
    return type !== 'KOMISYONCU';
  }
  if (profile === 'EARSIVFATURA') {
    // e-Arşiv düzleminde yalnız HKSSATIS; HKSKOMISYONCU kapsam dışı.
    return type === 'HKSSATIS';
  }
  return false;
}

export function validateHksOwnerFields(input: SimpleInvoiceInput): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!isOwnerFieldScope(input.profile ?? '', input.type ?? '')) {
    return warnings;
  }

  input.lines.forEach((line, i) => {
    const ids = line.additionalItemIdentifications ?? [];
    const name = ids.find(a => a.schemeId === OWNER_NAME_SCHEME_ID)?.value?.trim() ?? '';
    const taxId = ids.find(a => a.schemeId === OWNER_TAX_ID_SCHEME_ID)?.value?.trim() ?? '';

    // İkisi de yoksa sessiz: alanlar zorunlu değil, yalnız BİRLİKTE anlamlılar.
    if (name === '' && taxId === '') return;

    if (name !== '' && taxId === '') {
      warnings.push({
        field: `lines[${i}].additionalItemIdentifications`,
        message:
          `Satır ${i + 1}: mal sahibi adı girilmiş ama ${OWNER_TAX_ID_SCHEME_ID} yok — `
          + 'mal sahibi bilgisi ad ve VKN/TCKN ile birlikte verilmelidir.',
        severity: 'warning',
      });
    } else if (name === '' && taxId !== '') {
      warnings.push({
        field: `lines[${i}].additionalItemIdentifications`,
        message:
          `Satır ${i + 1}: mal sahibi VKN/TCKN girilmiş ama ${OWNER_NAME_SCHEME_ID} yok — `
          + 'mal sahibi bilgisi ad ve VKN/TCKN ile birlikte verilmelidir.',
        severity: 'warning',
      });
    }

    if (taxId !== '' && !OWNER_TAX_ID_PATTERN.test(taxId)) {
      warnings.push({
        field: `lines[${i}].additionalItemIdentifications.${OWNER_TAX_ID_SCHEME_ID}`,
        message:
          `Satır ${i + 1}: mal sahibi VKN/TCKN 10 (VKN) veya 11 (TCKN) haneli sayısal `
          + `olmalıdır (gelen: "${taxId}").`,
        severity: 'warning',
      });
    }
  });

  return warnings;
}
