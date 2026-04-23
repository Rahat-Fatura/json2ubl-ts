# 23 — HKS + HKSSATIS (Hal Kayıt Sistemi)

**Profile:** HKS · **Type:** HKSSATIS · **CustomizationID:** TR1.2

## Amaç

Yaş sebze meyve halinde yapılan satış — HKS profili. **Her satırda `KUNYENO` (19 karakter) zorunlu** — ürün izlenebilirliği için.

## Girdi Özet

| Alan | Değer |
|------|-------|
| Sender | Hal komisyoncusu |
| Satır | 500 kg × 20 TRY (Domates) KDV %10 |
| `KUNYENO` | `KUN-2026-042-DOM001` (19 karakter) |
| **Payable** | **11.000 TRY** |

## Gotcha

- KUNYENO **tam 19 karakter** olmalı — kısa veya uzun `[HKS] KUNYENO 19 karakter olmalıdır` hatası
- HKSKOMISYONCU tipi komisyoncu modeli için kullanılır (bu senaryoda değil)
