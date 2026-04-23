# 05 — TEMELFATURA + TEVKIFAT (KDV Tevkifatı)

**Profile:** TEMELFATURA · **InvoiceTypeCode:** TEVKIFAT · **CustomizationID:** TR1.2

## Amaç

**KDV tevkifatı** (withholding) — satıcı KDV'nin bir kısmını alıcıdan direkt değil, alıcı tarafından devlete ödenmek üzere keser. Kısmi tevkifat (601-627, ~20-90%) veya tam tevkifat (801-825, %100) kodları.

Bu senaryo: **kod 603 (Bakım/Onarım) · %70 kısmi tevkifat**. 0003 Gelir Stopajı (02) ile **karıştırmayın** — o kâr üzerinden stopaj, bu KDV üzerinden tevkifat.

## Kapsadığı Feature'lar

- **`SimpleLineInput.withholdingTaxCode`** — 601-627 veya 801-825 kodları
- **Formül:** `withholdingAmount = KDV × percent / 100`
- `type: 'TEVKIFAT'` — `withholdingTaxCode` verildiğinde otomatik de belirlenir

## Girdi Özet

| Alan | Değer |
|------|-------|
| Satır | 10 × 100 = 1.000 TRY |
| KDV %20 | 200 TRY |
| Tevkifat 603 %70 | 200 × 0.70 = 140 TRY |
| **Payable** | **1.060 TRY** (1.200 − 140) |

## Çıktı Kritik Alanlar

```xml
<cbc:InvoiceTypeCode>TEVKIFAT</cbc:InvoiceTypeCode>
<cac:WithholdingTaxTotal>
  <cbc:TaxAmount currencyID="TRY">140.00</cbc:TaxAmount>
  <cac:TaxSubtotal>
    <cbc:TaxAmount currencyID="TRY">140.00</cbc:TaxAmount>
    <cbc:Percent>70</cbc:Percent>
    <cac:TaxCategory>
      <cac:TaxScheme>
        <cbc:TaxTypeCode>603</cbc:TaxTypeCode>
      </cac:TaxScheme>
    </cac:TaxCategory>
  </cac:TaxSubtotal>
</cac:WithholdingTaxTotal>
```

## Gotcha & Bilinen Sınırlama

- `withholdingTaxCode` ile `type: 'TEVKIFAT'` redundant — ikisini de vermek tutarsızlık değil, ama sadece biri yeterli.
- **Bilinen Sınırlama (ACIK-SORULAR §4):** Bu senaryo `validationLevel: 'basic'` ile çalışır. `strict` modda calculator B-81 fix'i kdvExemptionReason.kdv='351' atar, M5 matrix `requiresZeroKdvLine` kuralı tetiklenir ve KDV>0 olan tek satırlı TEVKIFAT için false positive hata çıkar. Runtime temel kontroller basic modda da korunur.
- **Kod 650 dinamik oran:** 0-99 arası oran `SimpleLineInput.withholdingTaxPercent` ile verilir — bakınız [`10-ticarifatura-tevkifat-650-dinamik`](../10-ticarifatura-tevkifat-650-dinamik/).

## Çalıştırma

```bash
npx tsx examples/05-temelfatura-tevkifat/run.ts
```
