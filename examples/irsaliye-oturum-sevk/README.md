# irsaliye-oturum-sevk

**Profile:** TEMELIRSALIYE · **Tip:** SEVK · **Girdi katmanı:** `SimpleDespatchInput`

`DespatchSession` üzerinden uçtan uca e-İrsaliye üretimi. Fatura tarafındaki
`SimpleInvoiceInput` → `SimpleInvoiceBuilder` akışının irsaliye karşılığıdır.

## `33..36-irsaliye-*` senaryolarından farkı

Onlar **ham** `DespatchInput` + `DespatchBuilder` kullanır; burada geliştirici
yalnız temel veriyi verir, SDK gerisini yapar:

| Geliştiricinin verdiği | SDK'nın yaptığı |
| --- | --- |
| `taxNumber` (tek alan) | VKN/TCKN çıkarımı (**içerik** kapısı) + `name` ↔ `firstName`/`familyName` yerleşimi |
| `datetime` (tek alan) | `cbc:IssueDate` + `cbc:IssueTime` bölünmesi (B-18, XSD zorunlu) |
| `shipment.actualDespatchDatetime` (tek alan) | `ActualDespatchDate` + `ActualDespatchTime` |
| kalem adı/miktarı | satır numarası (`DespatchLineIdCheck`: dolu ve gerçek sayı) |
| plaka metni | şema varsayılanı `PLAKA` |
| — | ülke varsayılanı `Türkiye`, posta kodu **uydurulmaz** |

`type` / `profile` **düz string**'dir; enum import etmek gerekmez.

## Çalıştırma

```bash
npx tsx examples/irsaliye-oturum-sevk/run.ts
```

> ℹ️ Klasör adı bilerek `NN-` ön eki TAŞIMAZ. `examples/` altındaki numaralı
> senaryolar, hangi builder ile kurulacaklarını slug numarasından okuyan
> keşif kurallarına bağlıdır (`33-`…`36-` → `DespatchBuilder`); bu senaryo ise
> `DespatchSession` ile kurulur ve o keşfe girmemelidir. Regresyon koruması
> `__tests__/examples/despatch-session-parity.test.ts` dosyasındadır:
> `input.ts ≡ input.json` ve `session.buildXml() === output.xml`.

## Kapsanan normatif kurallar

- `LicensePlateIDCheck` — plaka **her irsaliyede** zorunlu
- `DespatchCarrierDriverCheck` — şoför **veya** taşıyıcı; şoförde ad+soyad+kimlik üçü de dolu
- `DespatchAddressCheck` — ilçe + il + ülke + TR posta kodu
- Uygulama Kılavuzu §10 — fiili sevk anı ≥ düzenleme anı
- B-102 — kalem `description` / `note` ham katmana bağlanır, sessizce düşmez
