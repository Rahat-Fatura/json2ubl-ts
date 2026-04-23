# 14 — YATIRIMTESVIK + IADE

**Profile:** YATIRIMTESVIK · **InvoiceTypeCode:** IADE · **CustomizationID:** TR1.2

## Amaç

YTB satışının iadesi. B-08 özel istisnası: **YATIRIM_TESVIK_IADE_TYPES** (IADE, TEVKIFATIADE, YTBIADE, YTBTEVKIFATIADE) gruplarında, YTB profilinin normal şart koştuğu `TaxAmount > 0 AND Percent > 0` zorunluluğu **muaf**. Çünkü iade işlemi orijinal fatura tersinyeti.

## Kapsadığı Feature'lar

- **IADE grubu** — BillingReference zorunlu (Schematron IADEInvioceCheck)
- **B-08 istisnası** — YTB kuralı IADE grubunda pas geçilir
- **ytbNo** yine zorunlu (profil gereği)
- Satır yapısı 12-makina ile aynı (Kod 01 + brand/model vb.)

## Girdi Özet

| Alan | Değer |
|------|-------|
| `billingReference.id` | `EXA2026000000012` (12-yatirimtesvik-satis-makina iadesi) |
| `ytbNo` | `'123456'` |
| Satır | Kompresör 1 × 200 = 200 TRY |
| KDV %20 | 40 TRY |
| **Payable** | **240 TRY** |

## Gotcha

- `itemClassificationCode=01` için `productTraceId + serialId + brand + model` zorunlu (12 ile aynı kural — B-08 istisnası sadece `TaxAmount > 0` kontrolü için)
- `billingReference.id` orijinal fatura ID'siyle eşleşmeli (16 karakter regex)
- `datetime` bugün veya geçmiş — gelecek tarih validator tarafından reddedilir (B-65)

## Çalıştırma

```bash
npx tsx examples/14-yatirimtesvik-iade/run.ts
```
