# 13 — YATIRIMTESVIK + SATIS + Bina İnşaat (ItemClass=03)

**Profile:** YATIRIMTESVIK · **InvoiceTypeCode:** SATIS · **CustomizationID:** TR1.2

## Amaç

[12 senaryosu](../12-yatirimtesvik-satis-makina/) ile kardeş: aynı YTB profili, bu kez **Bina İnşaat** sınıfı (Kod 03). Makine'nin aksine satır seviyesinde `productTraceId`, `serialId`, `brand`, `model` **gerekmez**.

## Fixture Paralelliği

[`__tests__/fixtures/mimsoft-real-invoices/f14-yatirimtesvik-satis-insaat.xml`](../../__tests__/fixtures/mimsoft-real-invoices/f14-yatirimtesvik-satis-insaat.xml).

## 12 vs 13 Diff

| Alan | 12 (Makine) | 13 (İnşaat) |
|------|-------------|-------------|
| `itemClassificationCode` | `'01'` | `'03'` |
| `productTraceId` | Zorunlu | — |
| `serialId` | Zorunlu | — |
| `brand` | Zorunlu | — |
| `model` | Zorunlu | — |

## Girdi Özet

| Alan | Değer |
|------|-------|
| `ytbNo` | `'123456'` |
| Satır 1 | Fabrika Temel İnşaat 1 × 200 |
| Satır 2 | İdari Bina İnce İşler 1 × 360 |
| KDV %20 | 112 TRY |
| **Payable** | **672 TRY** |

## Çalıştırma

```bash
npx tsx examples/13-yatirimtesvik-satis-insaat/run.ts
```
