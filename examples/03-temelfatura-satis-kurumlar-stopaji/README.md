# 03 — TEMELFATURA + SATIS + Kurumlar Vergisi Stopajı (0011)

**Profile:** TEMELFATURA · **InvoiceTypeCode:** SATIS · **CustomizationID:** TR1.2

## Amaç

[`02`](../02-temelfatura-satis-gelir-stopaji/) senaryosunun aynısı, ancak stopaj kodu `0011` (**Kurumlar Vergisi Stopajı**) ve tipik oran %32. Tüzel kişi (şirket) alıcıya yapılan hizmet satışında devreye girer.

## Fixture Paralelliği

[`__tests__/fixtures/mimsoft-real-invoices/f11-satis-kurumlar-stopaji.xml`](../../__tests__/fixtures/mimsoft-real-invoices/f11-satis-kurumlar-stopaji.xml) ile yapısal paralel. (Fixture TICARIFATURA'da; burada TEMELFATURA.)

## Kapsadığı Feature'lar

- **TaxTypeCode 0011** — Kurumlar Vergisi Stopajı (`baseStat: false, baseCalculate: false`)
- %32 oranı — 02'deki %23'ten **farkını** gösterir; aynı mekanizma, farklı kod+oran

## Girdi Özet

| Alan | Değer |
|------|-------|
| Satır | 10 × 1.500 = 15.000 TRY |
| KDV %20 | 3.000 TRY |
| Kurumlar Stopajı %32 | −4.800 TRY |
| **Payable** | **13.200 TRY** |

## Gotcha

- 0003 vs 0011 ayrımı **vergi mükellefi tipine** göre: gerçek kişi/serbest meslek → 0003, tüzel kişi/kurumlar vergisi mükellefi → 0011.
- 02 ile bu senaryonun `input.ts` diff'i sadece satır adı, stopaj kodu ve oran. "Aynı API, farklı config değerleri" mesajı.

## Çalıştırma

```bash
npx tsx examples/03-temelfatura-satis-kurumlar-stopaji/run.ts
```
