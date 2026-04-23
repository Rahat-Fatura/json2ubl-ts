# 07 — TEMELFATURA + IHRACKAYITLI + 702

**Profile:** TEMELFATURA · **InvoiceTypeCode:** IHRACKAYITLI · **CustomizationID:** TR1.2

## Amaç

**İhraç kayıtlı satış** — imalatçı, Dış Ticaret Sermaye Şirketi'ne (DTSŞ) veya İhracatçı Birliği üyesine KDV istisnalı satış yapar; mal fiilen ihraç edilene kadar devlet KDV'yi ertelenmiş sayar. Kod **702** — "DİİB ve Geçici Kabul Rejimi Kapsamındaki Satışlar".

## Fixture Paralelliği

[`__tests__/fixtures/mimsoft-real-invoices/f12-ihrackayitli-702.xml`](../../__tests__/fixtures/mimsoft-real-invoices/f12-ihrackayitli-702.xml).

## Kapsadığı Feature'lar (B-07)

- **`kdvExemptionCode: '702'`** — belge seviyesi
- **GTİP (Gümrük Tarife İstatistik Pozisyonu)** — 12-haneli, `SimpleLineInput.delivery.gtipNo`
- **AlıcıDİBKod** — alıcının DİB belgesi kodu, `SimpleLineInput.buyerCode`
- **KDV %0** her satırda

## Girdi Özet

| Alan | Değer |
|------|-------|
| `kdvExemptionCode` | `'702'` |
| `buyerCode` | `'DIIB-2026-000042'` (AlıcıDİBKod) |
| `delivery.gtipNo` | `'620342000010'` (12-hane) |
| Satır | 10 × 10 = 100 TRY |
| KDV %0 | 0 TRY |
| **Payable** | **100 TRY** |

## Bilinen Sınırlama

**ACIK-SORULAR §4:** SimpleInvoiceInput, IHRACKAYITLI + 702 için zorunlu **11-haneli ALICIDIBSATIRKOD ağacını** (`shipment/transportHandlingUnits/customsDeclarations/issuerParty/partyIdentifications`) doğrudan desteklemiyor. Bu örnek `validationLevel: 'basic'` ile çalışır; `strict` modda low-level `InvoiceInput` kullanmak gerekir. Kütüphane 8c+ sprintlerinde Simple-input'u genişletebilir.

## Çıktı Kritik Alanlar

```xml
<cbc:InvoiceTypeCode>IHRACKAYITLI</cbc:InvoiceTypeCode>
<cac:TaxTotal>
  <cac:TaxSubtotal>
    <cbc:TaxAmount currencyID="TRY">0.00</cbc:TaxAmount>
    <cac:TaxCategory>
      <cbc:TaxExemptionReasonCode>702</cbc:TaxExemptionReasonCode>
      <cac:TaxScheme><cbc:TaxTypeCode>0015</cbc:TaxTypeCode></cac:TaxScheme>
    </cac:TaxCategory>
  </cac:TaxSubtotal>
</cac:TaxTotal>
<!-- Satır seviyesi GTİP + BuyerCode (simple-mapper'ın tam desteği sınırlı) -->
```

## Gotcha

- **701/702/703/704** — farklı İhraç Kayıtlı alt kodları; 702 DİİB + Geçici Kabul.
- GTİP tam 12 hane numerik olmalı (AP kural).
- `strict` validatorla tam uyum için kütüphanenin low-level `InvoiceInput` API'si gerek — bu senaryo simple-input yeteneklerinin sınırını gösterir.

## Çalıştırma

```bash
npx tsx examples/07-temelfatura-ihrackayitli-702/run.ts
```
