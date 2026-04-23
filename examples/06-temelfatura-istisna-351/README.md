# 06 — TEMELFATURA + SATIS + İstisna 351

**Profile:** TEMELFATURA · **InvoiceTypeCode:** SATIS · **CustomizationID:** TR1.2

## Amaç

**Kod 351** — "KDV İstisna Olmayan Diğer" catch-all kategorisi. M5 (TAX_EXEMPTION_MATRIX) kuralları:

- **İzinli tipler:** SATIS, TEVKIFAT, KOMISYONCU, HKSSATIS, ..., SGK (`ISTISNA` grubu **değil**)
- **Yasak tipler:** ISTISNA, YTBISTISNA, IADE, YTBIADE, TEVKIFATIADE, YTBTEVKIFATIADE, IHRACKAYITLI
- **`requiresZeroKdvLine: true`** — en az bir satırda KDV=0 olmalı

## Fixture Paralelliği

[`__tests__/fixtures/mimsoft-real-invoices/f15-satis-351.xml`](../../__tests__/fixtures/mimsoft-real-invoices/f15-satis-351.xml).

## Kapsadığı Feature'lar

- **`SimpleInvoiceInput.kdvExemptionCode`** — belge seviyesi istisna kodu
- **M5 requiresZeroKdvLine** — 351 kodu için KDV=0 satır zorunlu
- **`type: 'SATIS'` + 351** kombinasyonu geçerli (ISTISNA ile karıştırma)

## Girdi Özet

| Alan | Değer |
|------|-------|
| `kdvExemptionCode` | `'351'` |
| Satır | 10 × 10 = 100 TRY |
| KDV %0 | 0 TRY (zorunlu) |
| **Payable** | **100 TRY** |

## Çıktı Kritik Alanlar

```xml
<cbc:InvoiceTypeCode>SATIS</cbc:InvoiceTypeCode>
<cac:TaxTotal>
  <cac:TaxSubtotal>
    <cbc:TaxAmount currencyID="TRY">0.00</cbc:TaxAmount>
    <cbc:Percent>0</cbc:Percent>
    <cac:TaxCategory>
      <cbc:TaxExemptionReasonCode>351</cbc:TaxExemptionReasonCode>
      <cbc:TaxExemptionReason>İstisna Olmayan Diğer</cbc:TaxExemptionReason>
      <cac:TaxScheme>
        <cbc:TaxTypeCode>0015</cbc:TaxTypeCode>
      </cac:TaxScheme>
    </cac:TaxCategory>
  </cac:TaxSubtotal>
</cac:TaxTotal>
```

## Gotcha

- 351 **ISTISNA tipi değildir** — asıl istisnalar 201-250 (M5 matrisine bakın).
- Tüm satırlar KDV>0 ise `EXEMPTION_REQUIRES_ZERO_KDV_LINE` hatası.
- 351 + IHRACKAYITLI gibi yasak kombinasyonlarda `EXEMPTION_FORBIDDEN_TYPE` hatası.

## Çalıştırma

```bash
npx tsx examples/06-temelfatura-istisna-351/run.ts
```
