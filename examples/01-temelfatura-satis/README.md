# 01 — TEMELFATURA + SATIS (Baseline)

**Profile:** TEMELFATURA · **InvoiceTypeCode:** SATIS · **CustomizationID:** TR1.2

## Amaç

Kütüphanenin "en temel" KDV'li satış faturası. Bu senaryo, [`SimpleInvoiceInput`](../../src/calculator/simple-types.ts) tipinin zorunlu alanlarını ve varsayılan davranışı (KDV %20, TRY, tek satır) gösterir. Sonraki senaryoların çıkış noktası.

## Kapsadığı Feature'lar

- **Zorunlu minimum alanlar** — `sender`, `customer`, `lines`, UUID, ID
- **VKN alıcı** — 10 haneli taxNumber → `PartyIdentification.schemeID="VKN"`
- **KDV %20 otomatik hesaplama** — `SimpleInvoiceBuilder` line hesaplamasını ve belge toplamlarını kendisi yapar
- **Profile + Type override** — `profile: 'TEMELFATURA'`, `type: 'SATIS'` açıkça verildi; satır vergi durumlarına göre otomatik de tespit edilebilirdi

## İş Durumu

Gündelik KDV'li mal/hizmet satışında satıcı → alıcı tipik e-faturası. GİB'de süregelen en yaygın fatura kombinasyonu. Bu senaryo anlaşılmadan sonraki senaryolar anlamsız.

## Girdi Özet

| Alan | Değer |
|------|-------|
| Satıcı VKN | `1234567890` |
| Alıcı VKN | `9876543210` |
| Satır | 10 adet × 100 TRY (KDV %20) |
| Matrah | 1.000,00 TRY |
| KDV | 200,00 TRY |
| Ödenecek | 1.200,00 TRY |

## Çıktı Beklentisi

```xml
<cbc:ProfileID>TEMELFATURA</cbc:ProfileID>
<cbc:InvoiceTypeCode>SATIS</cbc:InvoiceTypeCode>
<cac:TaxTotal>
  <cbc:TaxAmount currencyID="TRY">200.00</cbc:TaxAmount>
  ...
  <cbc:TaxTypeCode>0015</cbc:TaxTypeCode>
</cac:TaxTotal>
<cac:LegalMonetaryTotal>
  <cbc:PayableAmount currencyID="TRY">1200.00</cbc:PayableAmount>
</cac:LegalMonetaryTotal>
```

## Gotcha

- **ID regex:** `id` alanı `^[A-Z0-9]{3}20[0-9]{2}[0-9]{9}$` pattern'ine uymalı (3 harf + 4 yıl + 9 sıra numarası). `EXA2026000000001` formatı tutar.
- **UUID v4:** `uuid` alanı v4 formatında olmalı (3. grup `4` ile, 4. grup `8`/`9`/`a`/`b` ile başlar).

## Çalıştırma

```bash
npx tsx examples/01-temelfatura-satis/run.ts
```

- `input.json` — `input.ts` export değerinin JSON eşleniği (otomatik yazılır)
- `output.xml` — UBL-TR 2.1 XML

## Bozuk Örnekler

[`validation-errors.ts`](./validation-errors.ts) içinde 4 yanlış input + beklenen `UblBuildError.errors` çıktıları:

1. Satıcı VKN boş → `MISSING_FIELD`
2. Satıcı VKN 3 haneli → `INVALID_FORMAT`
3. Lines boş array → `MISSING_FIELD` (taxTotals + lines)
4. Geçersiz currencyCode "XYZ" → `INVALID_VALUE` + exchangeRate eksik
