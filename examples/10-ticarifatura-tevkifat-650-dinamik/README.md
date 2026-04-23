# 10 — TICARIFATURA + TEVKIFAT + Kod 650 Dinamik Oran

**Profile:** TICARIFATURA · **InvoiceTypeCode:** TEVKIFAT · **CustomizationID:** TR1.2

## Amaç

**Kod 650 "Diğer" tevkifatı** (M3, B-95) — GİB v1.23 changelog'unda "3/10 eklendi" diyor ama ana tabloda yok. Kütüphane yaklaşımı: dinamik oran; kullanıcı 0-99 arası yüzde girer, UR-2 kuralıyla `65000 + percent` combo üretilir (örn. %25 → 65025).

## Kapsadığı Feature'lar

- **`withholdingTaxCode: '650'`** — tevkifat-config'te `dynamicPercent: true`
- **`withholdingTaxPercent: 25`** — kullanıcı girdi (0-100, zorunlu — 650'de config'te oran yok)
- **M3** kararı: oran runtime'da çözülür; config'te hard-coded değil

## Girdi Özet

| Alan | Değer |
|------|-------|
| Satır | 10 × 100 = 1.000 TRY |
| KDV %20 | 200 TRY |
| Tevkifat 650 %25 | −50 TRY |
| **Payable** | **1.150 TRY** |

## Validasyon Modu

`validationLevel: 'basic'` — B-NEW-11 (TEVKIFAT strict B-81/M5 çakışması).

## Çalıştırma

```bash
npx tsx examples/10-ticarifatura-tevkifat-650-dinamik/run.ts
```
