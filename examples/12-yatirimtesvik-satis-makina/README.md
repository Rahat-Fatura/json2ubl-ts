# 12 — YATIRIMTESVIK + SATIS + Makine/Teçhizat (ItemClass=01)

**Profile:** YATIRIMTESVIK · **InvoiceTypeCode:** SATIS · **CustomizationID:** TR1.2

## Amaç

**Yatırım Teşvik Belgeli** satış — Makine/Teçhizat kategorisinde (Kod 01) makine veya ekipman satışı. Yatırım Teşvik Belgesi (YTB) numarası, makine seri/takip no zorunlu.

## Fixture Paralelliği

[`__tests__/fixtures/mimsoft-real-invoices/f13-yatirimtesvik-satis-makina.xml`](../../__tests__/fixtures/mimsoft-real-invoices/f13-yatirimtesvik-satis-makina.xml).

## Kapsadığı Feature'lar (B-08)

- **`ytbNo: '123456'`** — 6 haneli YTB numarası (zorunlu)
- **`ytbIssueDate`** — YTB belge tarihi (opsiyonel)
- **`itemClassificationCode: '01'`** — Makine/Teçhizat sınıfı
- **Kod 01 için zorunlular:** `productTraceId`, `serialId`, `brand`, `model`
- KDV %20 normal orandan hesaplanır — YTB istisnası mekanizması kullanıcı sorumluluğu değil, kütüphane yapıyor

## Item Classification Kodları

| Kod | Anlam |
|-----|-------|
| 01 | Makine/Teçhizat (bu senaryo) |
| 02 | Yazılım |
| 03 | Bina İnşaat ([13 senaryosu](../13-yatirimtesvik-satis-insaat/)) |
| 04 | Diğer |

## Girdi Özet

| Alan | Değer |
|------|-------|
| `ytbNo` | `'123456'` |
| Satır 1 | Kompresör 1 × 200 = 200 TRY |
| Satır 2 | Pres Makinesi 1 × 360 = 360 TRY |
| KDV %20 (2 subtotal) | 112 TRY |
| **Payable** | **672 TRY** |

## Çalıştırma

```bash
npx tsx examples/12-yatirimtesvik-satis-makina/run.ts
```
