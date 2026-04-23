# 27 — Feature: Yabancı Para (EUR + ExchangeRate)

`currencyCode: 'EUR'` + `exchangeRate: 36.75`. Tüm tutarlar EUR cinsinden kaydedilir, XML'de `DocumentCurrencyCode=EUR` ve `PricingExchangeRate` element'i üretilir.

**Girdi:** 5 × 100 EUR = 500 EUR · KDV %20 = 100 EUR · **Payable 600 EUR**.

**Gotcha:** USD/EUR vb. için `exchangeRate` eksik ise `MISSING_FIELD path=exchangeRate` hatası.
