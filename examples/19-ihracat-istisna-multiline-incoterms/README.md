# 19 — IHRACAT + ISTISNA (Multi-line + INCOTERMS)

**Profile:** IHRACAT · **InvoiceTypeCode:** ISTISNA · **CustomizationID:** TR1.2

## Amaç

18-senaryosunun genişletilmiş hâli — 3 satır, her birinde farklı **INCOTERMS** ve farklı teslim noktası. Kütüphanenin `SimpleLineDeliveryInput` genişliğini gösterir.

## INCOTERMS Örnekleri

| Kod | Anlam | Sorumluluk |
|-----|-------|------------|
| **FOB** | Free On Board | Satıcı yükleme limanında risk devreder |
| **CIF** | Cost Insurance Freight | Satıcı taşıma + sigorta dahil varış noktasına |
| **EXW** | Ex Works | Alıcı fabrikadan teslim alır (maksimum risk alıcıda) |

## Girdi Özet

| Satır | Ürün | Kalem × Birim | GTİP | INCOTERMS |
|-------|------|---------------|------|-----------|
| 1 | Premium Tekstil | 50 × 20 USD = 1.000 | 620342000010 | FOB (İstanbul) |
| 2 | El Yapımı Halı | 10 × 150 USD = 1.500 | 570110100000 | CIF (Zurich) |
| 3 | Bakır El İşi | 25 × 50 USD = 1.250 | 741400000000 | EXW (Fabrika) |
| **Toplam** | | **3.750 USD** | | |

Currency: USD · ExchangeRate: 32.50 · KDV %0 (tüm satırlar).

## Çalıştırma

```bash
npx tsx examples/19-ihracat-istisna-multiline-incoterms/run.ts
```
