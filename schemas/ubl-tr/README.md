# GİB UBL-TR XSD — üreteç girdisi

Bu klasördeki `.xsd` dosyaları **kaynak değil, GİB paketinin birebir kopyasıdır**.
`scripts/generate-sequences.ts` bunları okuyup `src/serializers/xsd-sequence.generated.ts`
dosyasını üretir; `npm run verify:sequences` üretilen dosyanın kaynaktan sapmadığını
denetler.

## Niye repoda duruyorlar?

Sekans tabloları **taşıyıcıdır** — `emitInOrder` emit sırasını doğrudan bu tablolardan
alır. Tabloların doğruluk kaynağı repo dışında (bir geliştiricinin makinesindeki GİB
paketi) kalsaydı drift denetimi yalnız o makinede koşardı; kimsenin koşmadığı denetim
denetim değildir. Bu üç dosya repoya girdiğinde `verify:sequences` her klonda, her CI
koşumunda çalışır.

## Kapsam

Yalnız üretecin ihtiyaç duyduğu dört dosya taşınmıştır:

| Dosya | Sağladığı |
| --- | --- |
| `common/UBL-CommonAggregateComponents-2.1.xsd` | 28 ortak bileşen sekansı + genel eleman→tip bildirimleri |
| `maindoc/UBL-Invoice-2.1.xsd` | `InvoiceType` kök sekansı |
| `maindoc/UBL-DespatchAdvice-2.1.xsd` | `DespatchAdviceType` kök sekansı |
| `maindoc/UBL-CreditNote-2.1.xsd` | `CreditNoteType` kök sekansı — e-MM (Müstahsil Makbuzu) |

`ReceiptAdvice` / `ApplicationResponse` kütüphanede üretilmediği için taşınmadı;
üretilmeye başlandığında ilgili maindoc dosyası buraya eklenir ve
`scripts/generate-sequences.ts` içindeki `SOURCES` listesine yazılır.

### ⚠️ CreditNote DARALTILMAMIŞTIR

GİB paketi `UBL-CreditNote-2.1.xsd`'yi **stok OASIS hâliyle** dağıtır: `InvoiceType`'tan
attığı slotların (`AccountingCostCode`, `PayeeParty`, `DeliveryTerms`, `BuyerReference`,
`DiscrepancyResponse`, `StatementDocumentReference`) tamamı `CreditNoteType`'ta DURUR.
Aynı şey ortak XSD'deki `CreditNoteLineType` için de geçerlidir (28 slot). Tablolar bu
yüzden fatura muadillerinden geniştir; tablo taşıyıcı olduğundan emit edilmeyen slot
çıktıya yansımaz.

## Tazeleme

GİB paketi güncellenirse dosyaları elle kopyalayıp üreteci yeniden koşturun:

```bash
cp <gib-paketi>/common/UBL-CommonAggregateComponents-2.1.xsd schemas/ubl-tr/common/
cp <gib-paketi>/maindoc/UBL-Invoice-2.1.xsd                  schemas/ubl-tr/maindoc/
cp <gib-paketi>/maindoc/UBL-DespatchAdvice-2.1.xsd           schemas/ubl-tr/maindoc/
cp <gib-paketi>/maindoc/UBL-CreditNote-2.1.xsd               schemas/ubl-tr/maindoc/
npm run generate:sequences
npm test
```

Üretilen dosyanın başlığında her kaynağın SHA-256 özeti yazılıdır: tablo ile XSD
arasındaki bağ denetlenebilirdir.

## Köken ve telif

OASIS UBL 2.1 OS şemalarının GİB tarafından **daraltılmış** (UBL-TR) sürümüdür.
Dosya başlarındaki OASIS telif başlıkları olduğu gibi korunmuştur; içerikte tek
karakter değiştirilmemiştir. Bu klasör `.npmignore` ile paket dışında bırakılır.
