# 15 — KAMU + SATIS

**Profile:** KAMU · **InvoiceTypeCode:** SATIS · **CustomizationID:** TR1.2

## Amaç

**Kamu kurumlarına mal/hizmet satışı.** KAMU profili zorunluları:

- **`buyerCustomer`** — aracı kurum bilgisi + `identifications` (MUSTERINO vb., B-83)
- **`paymentMeans`** + **TR IBAN** (26 karakter, `TR` + 2 kontrol + 7 banka + 16 hesap)

## Fixture Paralelliği

[`__tests__/fixtures/mimsoft-real-invoices/f17-kamu.xml`](../../__tests__/fixtures/mimsoft-real-invoices/f17-kamu.xml).

## Kapsadığı Feature'lar

- **`buyerCustomer.identifications`** — B-83 additional identifiers (MUSTERINO/MERSISNO/...)
- **`paymentMeans.meansCode`** — UN/EDIFACT 4461 (42=EFT, 1=Nakit, 48=Kredi Kartı, ZZZ=Diğer)
- **`paymentMeans.accountNumber`** — IBAN formatı runtime kontrol

## Girdi Özet

| Alan | Değer |
|------|-------|
| Alıcı | T.C. Çalışma ve Sosyal Güvenlik Bakanlığı |
| Aracı (buyerCustomer) | Kamu İhale Kurumu (VKN + MUSTERINO) |
| Satır 1 | 15 × 300 = 4.500 TRY (Masa) |
| Satır 2 | 5 × 1.500 = 7.500 TRY (Klima) |
| Satır 3 | 1 × 2.850 = 2.850 TRY (Kurulum) |
| KDV %20 | 2.970 TRY |
| **Payable** | **17.820 TRY** |

## Çalıştırma

```bash
npx tsx examples/15-kamu-satis/run.ts
```
