# 26 — IDIS + SATIS (Distribütör İzleme)

**Profile:** IDIS · **Type:** SATIS · **CustomizationID:** TR1.2

## Amaç

İnternet/Yerel Distribütör İzleme Sistemi — özel profil. Satıcı profilinde **SEVKIYATNO** (SE-XXXXXXX) ve satırda **ETIKETNO** ek tanımlayıcıları.

## Validasyon Modu

`validationLevel: 'basic'` — ETIKETNO format regex simple-input'da farklı bir yolla reject ediliyor, doğru format 8c'de netleştirilecek.

## Girdi Özet

| Alan | Değer |
|------|-------|
| Sender SEVKIYATNO | `SE-2026042` |
| Satır | 100 × 25 TRY (Ambalajlı Ürün) KDV %20 |
| `ETIKETNO` | `ETK-2026-00042-001` |
| **Payable** | **3.000 TRY** |
