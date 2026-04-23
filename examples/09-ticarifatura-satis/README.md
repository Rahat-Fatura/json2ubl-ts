# 09 — TICARIFATURA + SATIS

**Profile:** TICARIFATURA · **InvoiceTypeCode:** SATIS · **CustomizationID:** TR1.2

## Amaç

**Ticari fatura** — alıcı-satıcı arasında onay sürecini içeren elektronik fatura profili. TEMELFATURA'dan temel fark: ticari taraflar süreci aktif kullanır, üzerinde "Kabul" / "Red" aksiyonları alır.

## TEMELFATURA'dan Farkı

- **IADE tipi DESTEKLENMİYOR** (M1 PROFILE_TYPE_MATRIX) — iade için TEMELFATURA kullanılmalı
- TEMELFATURA + SATIS ile aynı veri modeli (aynı taraf, satır, vergi yapısı)

## Girdi Özet

| Alan | Değer |
|------|-------|
| Satır | 10 × 200 = 2.000 TRY |
| KDV %20 | 400 TRY |
| **Payable** | **2.400 TRY** |

## Çıktı Kritik Alanlar

```xml
<cbc:ProfileID>TICARIFATURA</cbc:ProfileID>
<cbc:InvoiceTypeCode>SATIS</cbc:InvoiceTypeCode>
```

## Çalıştırma

```bash
npx tsx examples/09-ticarifatura-satis/run.ts
```
