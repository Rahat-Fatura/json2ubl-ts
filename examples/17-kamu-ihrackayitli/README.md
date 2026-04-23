# 17 — KAMU + IHRACKAYITLI + 702

**Profile:** KAMU · **InvoiceTypeCode:** IHRACKAYITLI · **CustomizationID:** TR1.2

## Amaç

**Kamu aracı kurum (DTSŞ benzeri)** üzerinden ihraç kayıtlı satış. KAMU profilinin zorunluları (buyerCustomer + paymentMeans) + 702 istisna kodu + GTİP (07-senaryosu pattern'i).

## Girdi Özet

| Alan | Değer |
|------|-------|
| `kdvExemptionCode` | `'702'` |
| Satır | 100 × 5 = 500 TRY (Tekstil) · KDV %0 |
| `buyerCode` (AlıcıDİBKod) | `'DIIB-2026-000099'` |
| `delivery.gtipNo` | `'620342000010'` |
| **Payable** | **500 TRY** |

## Validasyon Modu

`validationLevel: 'basic'` — B-NEW-12 (AlıcıDİBKod simple-input desteği eksik).

## Çalıştırma

```bash
npx tsx examples/17-kamu-ihrackayitli/run.ts
```
