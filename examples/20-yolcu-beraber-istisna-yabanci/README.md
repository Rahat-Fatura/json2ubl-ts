# 20 — YOLCUBERABERFATURA + ISTISNA (Yabancı Yolcu)

**Profile:** YOLCUBERABERFATURA · **Type:** ISTISNA · **CustomizationID:** TR1.2

## Amaç

"Bavul ticareti" — yabancı turistin Türkiye'den aldığı malı yurtdışına çıkarırken KDV iadesi talep ettiği senaryo. Kütüphane simple-input pasaport numarasını `buyerCustomer.taxNumber` alanına koyar.

## Validasyon Modu

`validationLevel: 'basic'` — simple-input `nationalityId` + `passportId` + `TaxRepresentativeParty` ağacını desteklemiyor (B-NEW-13).

## Girdi Özet

| Alan | Değer |
|------|-------|
| Sender VKN | `1460415308` (YOLCU cross-check) |
| BuyerCustomer | Alman turist, pasaport `N12345678` |
| Satır | 1 × 800 TRY (Seramik vazo) KDV %0 |
| **Payable** | **800 TRY** |

## Çalıştırma

```bash
npx tsx examples/20-yolcu-beraber-istisna-yabanci/run.ts
```
