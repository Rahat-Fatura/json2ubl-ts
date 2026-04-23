# 16 — KAMU + TEVKIFAT

**Profile:** KAMU · **InvoiceTypeCode:** TEVKIFAT · **CustomizationID:** TR1.2

## Amaç

Kamu kurumuna KDV tevkifatlı hizmet satışı (tipik: yapım/mühendislik/danışmanlık). **Kod 601** (Yapım/Mühendislik) · **%40 kısmi tevkifat**.

## Girdi Özet

| Alan | Değer |
|------|-------|
| Hizmet | İnşaat Yapım — 1 × 10.000 TRY |
| KDV %20 | 2.000 TRY |
| Tevkifat 601 %40 | 800 TRY |
| **Payable** | **11.200 TRY** |

## Validasyon Modu

`validationLevel: 'basic'` — B-NEW-11 workaround.

## Çalıştırma

```bash
npx tsx examples/16-kamu-tevkifat/run.ts
```
