# 11 — TICARIFATURA + ISTISNA

**Profile:** TICARIFATURA · **InvoiceTypeCode:** ISTISNA · **CustomizationID:** TR1.2

## Amaç

**KDV istisnalı ticari fatura** — 201-250 kodları (KDV 11. Madde) ISTISNA grubuna giren kodları kullanır. Bu örnekte **kod 213** (serbest meslek erbabı hizmeti).

## Kapsadığı Feature'lar

- **`kdvExemptionCode: '213'`** — belge seviyesi
- **M5 matrisi:** 201-250 aralığı ISTISNA tipi için izinli
- **KDV %0** her satırda (istisna nedeniyle)

## Girdi Özet

| Alan | Değer |
|------|-------|
| `kdvExemptionCode` | `'213'` |
| Satır | 10 × 100 = 1.000 TRY |
| KDV %0 | 0 TRY |
| **Payable** | **1.000 TRY** |

## Gotcha

- **351 değil 213**: 351 ISTISNA grubu DIŞINDA (M5). ISTISNA tipiyle 351 kullanmak `FORBIDDEN_EXEMPTION_FOR_TYPE` hatası verir (6 numaralı senaryonun case 1'i). 201-250 ISTISNA kodları içindir.

## Çalıştırma

```bash
npx tsx examples/11-ticarifatura-istisna/run.ts
```
