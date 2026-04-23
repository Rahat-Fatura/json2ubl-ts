# 18 — IHRACAT + ISTISNA (Basic)

**Profile:** IHRACAT · **InvoiceTypeCode:** ISTISNA · **CustomizationID:** TR1.2

## Amaç

**Yurt dışına mal/hizmet ihracatı.** KDV istisna kodu **301** (İhracat Teslimi) ve yabancı alıcı bilgisi.

## Kapsadığı Feature'lar

- **`currencyCode: 'USD'`** + **`exchangeRate: 32.50`** (yabancı para)
- **`buyerCustomer`** — yabancı alıcı (taxNumber = VAT ID, örn. `DE123456789`)
- **`delivery.deliveryTermCode: 'FOB'`** — INCOTERMS Free On Board
- **`delivery.gtipNo`** — 12-hane GTİP
- **KDV %0** her satırda (ihracat istisnası)

## Girdi Özet

| Alan | Değer |
|------|-------|
| `kdvExemptionCode` | `'301'` |
| `currencyCode` + `exchangeRate` | USD · 32.50 |
| `buyerCustomer` | Global Trade Holdings GmbH (DE123456789) |
| Satır | 100 × 10 = 1.000 USD (Tekstil FOB) |
| **Payable** | **1.000 USD** |

## Çalıştırma

```bash
npx tsx examples/18-ihracat-istisna-basic/run.ts
```
