# 22 — EARSIVFATURA + TEKNOLOJIDESTEK

**Profile:** EARSIVFATURA · **Type:** TEKNOLOJIDESTEK · **CustomizationID:** TR1.2

## Amaç

Teknoloji desteği kapsamında satılan cihaz — **alıcı gerçek kişi (TCKN zorunlu)** ve satırda **IMEI/SERIMNO** tanımlayıcılar zorunlu.

## Zorunlular

- Alıcı **TCKN** olmalı (kütüphane runtime kontrolü)
- `lines[].additionalItemIdentifications` → `TELEFON` (IMEI) + `SERIMNO`

## Girdi Özet

| Alan | Değer |
|------|-------|
| Customer | TCKN `12345678901` (Ahmet Öğrenci Kaya) |
| Cihaz | Akıllı Telefon 1 × 15.000 TRY |
| IMEI | `352099001761481` |
| SERIMNO | `SN-PHONE-2026-0001` |
| **Payable** | **18.000 TRY** |

## Gotcha

VKN'li alıcı girilirse **`[TEKNOLOJIDESTEK] alıcı TCKN olmalıdır`** hatası (runtime yakalıyor).
