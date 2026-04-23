# 21 — EARSIVFATURA + SATIS (Online)

**Profile:** EARSIVFATURA · **Type:** SATIS · **CustomizationID:** TR1.2

## Amaç

e-Arşiv faturası — e-fatura sistemine kayıtlı olmayan alıcılar için. Bu senaryo **online satış** örneği: `onlineSale` metadata + `eArchiveInfo.sendType='ELEKTRONIK'`.

## Zorunlular

- **`eArchiveInfo.sendType`** — `"ELEKTRONIK"` veya `"KAGIT"`
- **`onlineSale`** (opsiyonel ama online satışta önerilen) — storeUrl, paymentMethod, paymentDate, carrierTaxNumber, carrierName

## Girdi Özet

| Alan | Değer |
|------|-------|
| Sender | VKN `1234567890` |
| Customer | TCKN `12345678901` (gerçek kişi) |
| Online | KREDIKARTI, Hızlı Kargo A.Ş. |
| Satır | 1 × 250 TRY KDV %20 |
| **Payable** | **300 TRY** |
