# 04 — TEMELFATURA + IADE (İade Faturası)

**Profile:** TEMELFATURA · **InvoiceTypeCode:** IADE · **CustomizationID:** TR1.2

## Amaç

Daha önce kesilmiş satış faturasının kısmen veya tamamen iade edilmesi durumunda kesilen faturayı gösterir. Kütüphane Schematron **IADEInvioceCheck** kuralını uygular:

1. `billingReference` **zorunlu** — iade edilen orijinal faturanın ID + tarihi
2. `documentTypeCode` otomatik olarak `'IADE'` atanır (simple-mapper sabit)
3. Orijinal fatura ID'si 16 karakterlik düzenli formatta (`^[A-Z0-9]{3}20[0-9]{2}[0-9]{9}$`)

## Kapsadığı Feature'lar

- **`billingReference`** — `SimpleBillingReferenceInput` tipi
- **IADE grubu** — `IADE_GROUP_TYPES` (IADE, TEVKIFATIADE, YTBIADE, YTBTEVKIFATIADE) — bu grup için BillingReference zorunlu
- Satır tutarları pozitif — tip=IADE olması ödenecek tutarı mantıken iade sahibine verilir, ama XML tutarları eksi değildir

## Girdi Özet

| Alan | Değer |
|------|-------|
| `billingReference.id` | `EXA2026000000001` (01 senaryosunun ID'si) |
| Satır | 10 × 50 = 500 TRY |
| KDV %20 | 100 TRY |
| **Payable** | **600 TRY** |

## Çıktı Kritik Alanlar

```xml
<cbc:InvoiceTypeCode>IADE</cbc:InvoiceTypeCode>
<cac:BillingReference>
  <cac:InvoiceDocumentReference>
    <cbc:ID>EXA2026000000001</cbc:ID>
    <cbc:IssueDate>2026-04-23</cbc:IssueDate>
    <cbc:DocumentTypeCode>IADE</cbc:DocumentTypeCode>
  </cac:InvoiceDocumentReference>
</cac:BillingReference>
```

## Gotcha

- **`billingReference` yoksa** validator `MISSING_FIELD` fırlatır.
- TEVKIFATIADE/YTBIADE kombinasyonları bu senaryoya benzer yapı kullanır; tip+billingReference yeterli.
- `documentTypeCode` alanı `SimpleBillingReferenceInput`'ta opsiyonel; IADE grubunda verilmezse kütüphane otomatik `'IADE'` atar.

## Çalıştırma

```bash
npx tsx examples/04-temelfatura-iade/run.ts
```
