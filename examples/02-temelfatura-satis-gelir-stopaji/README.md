# 02 — TEMELFATURA + SATIS + Gelir Vergisi Stopajı (0003)

**Profile:** TEMELFATURA · **InvoiceTypeCode:** SATIS · **CustomizationID:** TR1.2

## Amaç

Serbest meslek / hizmet satışında uygulanan **Gelir Vergisi Stopajı**nı (TaxTypeCode `0003`, yaygın %20 · %23 oranları) gösterir. Stopaj ödenecek tutardan düşer, KDV eklenir.

## Fixture Paralelliği

[`__tests__/fixtures/mimsoft-real-invoices/f10-satis-gelir-stopaji.xml`](../../__tests__/fixtures/mimsoft-real-invoices/f10-satis-gelir-stopaji.xml) ile yapısal paralel. Mimsoft gerçek faturası **TICARIFATURA** profili kullanır; buradaki senaryo **TEMELFATURA**'ya adapte (payable tutarı aynı: 14.550 TRY).

## Kapsadığı Feature'lar

- **`SimpleLineInput.taxes`** — satır seviyesi ek vergi array'i, stopaj kodları burada
- **TaxTypeCode 0003** — Gelir Vergisi Stopajı (`baseStat: false, baseCalculate: false`)
- **Ödenecek tutar hesabı:** `TaxExclusive + KDV − Stopaj`

## Girdi Özet

| Alan | Değer |
|------|-------|
| Satır | 10 × 1.500 = 15.000 TRY |
| KDV %20 | 3.000 TRY |
| Gelir Stopajı %23 | −3.450 TRY |
| **Payable** | **14.550 TRY** |

## Çıktı Kritik Alanlar

```xml
<cac:TaxTotal>
  <cbc:TaxAmount currencyID="TRY">6450.00</cbc:TaxAmount>  <!-- stopaj + KDV -->
  <cac:TaxSubtotal>
    <cbc:TaxAmount currencyID="TRY">3450.00</cbc:TaxAmount>
    <cbc:TaxTypeCode>0003</cbc:TaxTypeCode>
  </cac:TaxSubtotal>
  <cac:TaxSubtotal>
    <cbc:TaxAmount currencyID="TRY">3000.00</cbc:TaxAmount>
    <cbc:TaxTypeCode>0015</cbc:TaxTypeCode>
  </cac:TaxSubtotal>
</cac:TaxTotal>
<cac:LegalMonetaryTotal>
  <cbc:TaxInclusiveAmount currencyID="TRY">14550.00</cbc:TaxInclusiveAmount>
  <cbc:PayableAmount currencyID="TRY">14550.00</cbc:PayableAmount>
</cac:LegalMonetaryTotal>
```

## Gotcha

- Gelir Vergisi Stopajı **KDV tevkifatı DEĞİL**. `withholdingTaxCode` (601-627) ile karıştırma — o KDV üzerinden hesaplanır.
- `0003` kodu için oran genellikle %20 (bordro) veya %23 (serbest meslek). Kod listesinde oran sabit değil, kullanıcı girer.
- KDV tevkifatı için [`05-temelfatura-tevkifat`](../05-temelfatura-tevkifat/), ÖTV tevkifatı (4171) için [`31-feature-4171-otv-tevkifati`](../31-feature-4171-otv-tevkifati/) bakınız.

## Çalıştırma

```bash
npx tsx examples/02-temelfatura-satis-gelir-stopaji/run.ts
```

## Bozuk Örnekler

[`validation-errors.ts`](./validation-errors.ts) — 4 invalid case.
