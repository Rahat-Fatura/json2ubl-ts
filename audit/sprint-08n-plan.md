---
karar: Sprint 8n — v2.2.6 Library Suggestions Patch (Öneri #9 — F5 DUR noktası)
hedef: Mimsoft greenfield F5.C5.0 + F5.C5.3 (additional-documents-section attachment file upload) için `SimpleAdditionalDocumentInput.attachment` path entry'lerini ekle
versiyon: v2.2.5 → v2.2.6 (patch — additive, BREAKING CHANGE yok)
durum: PLAN — Mimsoft inceleme cevapları geldi (4/4 + ek bulgu), Berkay implementation onayı bekliyor
tarih: 2026-04-30
referans: Mimsoft `audit/greenfield/99-library-suggestions.md` Öneri #9 (F5 ENGELLEYİCİ)
---

# Sprint 8n — v2.2.6 Library Suggestions Patch (Öneri #9)

## Context

Mimsoft greenfield F5 plan onayında (2026-04-30 ExitPlanMode) **Library Öneri #9 F5 başlangıç DUR noktası** olarak işaretlendi. Eski form `additional-documents-section.tsx` (462 satır) attachment file upload (FileReader → base64 → 5MB + MIME beyaz liste) içeriyor; v2/ greenfield form aynı görsel pariteyi + runtime davranışı tutmak zorunda. F5.C5.0 helper güncellemesi + F5.C5.3 section yazımı `session.update(SessionPaths.additionalDocumentAttachment*(i), value)` çağrılarına bağlı.

**Mimsoft öneri kapsamı (`99-library-suggestions.md` Öneri #9):**
1. `SimpleAdditionalDocumentInput.attachment` tip alanı eklenmeli (`{ filename, mimeCode, data, encodingCode? }`)
2. `SessionPaths`'e 4 yeni narrow path overload (filename / mimeCode / data / encodingCode)
3. `InvoiceSession.update()` 4 yeni narrow template literal overload
4. UBL Attachment mapper genişletmesi (mevcut mu, yoksa eklenir)
5. Test (round-trip + optional + unset clear)

**Mimsoft tahmini:** 1.5-4 saat (mapper genişletme dahil olabilir).

## Fizibilite Analizi (kod incelemesi sonucu — KRİTİK SÜRPRİZ)

### 1. `SimpleAdditionalDocumentInput.attachment` tip — **ZATEN VAR**

`src/calculator/simple-types.ts:240-247`:

```typescript
attachment?: {
    filename: string;
    mimeCode: string;
    data: string;
    encodingCode?: string;
    characterSetCode?: string;
};
```

**5 field** (Mimsoft öneri 4 field — `characterSetCode` ek). Tip tanımı tam, opsiyonel, public re-export `src/calculator/index.ts`'te `SimpleAdditionalDocumentInput` üzerinden zaten erişilebilir.

### 2. UBL Attachment mapper — **ZATEN VAR**

`src/calculator/simple-invoice-mapper.ts:596-603`:

```typescript
if (doc.attachment) {
  mapped.attachment = {
    embeddedDocumentBinaryObject: {
      content: doc.attachment.data,
      mimeCode: doc.attachment.mimeCode,
      encodingCode: doc.attachment.encodingCode ?? 'Base64',
      characterSetCode: doc.attachment.characterSetCode ?? 'UTF-8',
      filename: doc.attachment.filename,
    },
  };
}
```

Mapper UBL `cac:Attachment / cbc:EmbeddedDocumentBinaryObject` üretimi zaten yapıyor; default `encodingCode='Base64'` + `characterSetCode='UTF-8'` fallback'leri mevcut. **Mimsoft'un endişe ettiği "mapper eksikse genişletme" senaryosu yok** — Mimsoft öneri 1.5-4 saat tahmininin alt sınırı geçerli.

### 3. SessionPaths — **PATH ENTRY'LERİ EKSİK** (asıl iş burada)

`grep "additionalDocument.*[Aa]ttach" src/calculator/session-paths.generated.ts` → 0 sonuç.

**Sebep:** Sprint 8j.2'de generator inline literal **array** desteğini ekledim (`Array<{...}>` ve `{...}[]` formları); ama **single inline literal sub-object** (`{...}` array değil) hâlâ SKIP. Generator'ın `addArrayElementEntries` fonksiyonunun SKIP yorumu (`scripts/generate-session-paths.ts:426`):

```typescript
// Diğer (inline object literal, anon array) → SKIP
```

`addSubObjectEntries`'te de aynı (`scripts/generate-session-paths.ts:355`):

```typescript
// Sub-object'in kendi sub-object'i (örn. paymentMeans.attachment) → SKIP
```

`additionalDocuments[i].attachment` field'ı `addArrayElementEntries`'in (interface ref array element içinde sub-object) işlediği patika içinde — array element'in sub-object'i interface ref olmadığı için (inline literal) SKIP'e düşüyor.

### 4. Diğer single inline literal'lar var mı?

`grep "^\s+\w+\??:\s*\{$" src/calculator/simple-types.ts` → **Tek sonuç:** `attachment?:` (line 241).

Yani **tek** etkilenen field — generator extension scope'u dar, side effect riski minimum.

### 5. Sürpriz scope düşmesi

| Mimsoft öneri | Gerçek scope |
|---|---|
| Tip ekle (`attachment` field) | ⊘ Mevcut, dokunma |
| 4 SessionPaths narrow | ✅ Generator extension ile otomatik 5 (characterSetCode dahil) |
| 4 update overload | ✅ Generator-driven (Sprint 8l.2 pattern), otomatik 5 |
| UBL Attachment mapper | ⊘ Mevcut, dokunma |
| Test (3 senaryo) | ✅ +3-4 |

**Tahmin revize:** 1.5-4 saat → **30-60 dakika** (sadece generator extension + smoke test).

## Sprint 8n Kapsamı

**5 atomik commit + cross-repo (8n.0 → 8n.4 + 8n.5).** Tahmini ~45 dakika.

### Atomik Commit Planı

| Commit | Kapsam | Test Δ |
|---|---|---|
| 8n.0 | Plan kopya + log iskelet (`audit/sprint-08n-plan.md` zaten var, log iskelet açılır) | 0 |
| 8n.1 | Generator single inline literal sub-object desteği + regenerate + 5 path entry + 5 update overload | +4 |
| 8n.2 | README + CHANGELOG v2.2.6 entry | docs |
| 8n.3 | `package.json` 2.2.5 → 2.2.6 + log finalize | docs |
| 8n.4 | (rezerv — gerekirse mapper eksiği için) | – |
| 8n.5 | Cross-repo: Mimsoft `99-library-suggestions.md` Öneri #9 Status: applied | audit |

**Test delta hedefi:** 1766 → ~1770 (+4).

### Detay — Her Commit

#### 8n.0 — Plan + log iskelet

- `audit/sprint-08n-plan.md` (bu dosya, plan kopyası) — Berkay onayı sonrası.
- `audit/sprint-08n-implementation-log.md` iskelet açılır.

#### 8n.1 — Generator single inline literal sub-object desteği

**Dosya 1:** `scripts/generate-session-paths.ts` — yeni helper + parseInterfaces extension.

**Yeni helper:**

```typescript
/**
 * Sprint 8n.1 / v2.2.6 / Library Öneri #9 — Single inline TypeLiteral parse (array DEĞİL).
 *
 * `attachment?: { filename: string; mimeCode: string; ... }` gibi inline object literal
 * field'ları synthetic interface'e indirger. Sprint 8j.2'deki `extractInlineLiteralArrayFields`
 * helper'ının non-array versiyonu.
 *
 * `Array<{...}>` veya `{...}[]` formları reddedilir — onlar Sprint 8j.2'ye ait.
 */
function extractInlineLiteralFields(
  typeNode: ts.TypeNode,
  sourceFile: ts.SourceFile,
): InterfaceField[] | undefined {
  if (!ts.isTypeLiteralNode(typeNode)) return undefined;
  // Inline TypeLiteral: { filename: string; ... }
  const fields: InterfaceField[] = [];
  for (const member of typeNode.members) {
    if (!ts.isPropertySignature(member)) continue;
    if (!member.name || !ts.isIdentifier(member.name)) continue;
    fields.push({
      name: member.name.text,
      type: member.type ? member.type.getText(sourceFile).trim() : 'unknown',
      optional: !!member.questionToken,
    });
  }
  return fields.length > 0 ? fields : undefined;
}
```

**parseInterfaces extension (mevcut Sprint 8j.2 array logic'inin yanına):**

```typescript
// Önce array kontrolü (Sprint 8j.2)
if (member.type) {
  const inlineArrayFields = extractInlineLiteralArrayFields(member.type, sourceFile);
  if (inlineArrayFields) {
    const syntheticName = `__Inline_${stmt.name.text}_${name}_Element`;
    interfaces.set(syntheticName, inlineArrayFields);
    type = `${syntheticName}[]`;
  } else {
    // Sprint 8n.1: single inline literal (array değilse)
    const inlineObjFields = extractInlineLiteralFields(member.type, sourceFile);
    if (inlineObjFields) {
      const syntheticName = `__InlineObj_${stmt.name.text}_${name}`;
      interfaces.set(syntheticName, inlineObjFields);
      type = syntheticName;
    }
  }
}
```

**Bu extension'la üretilecek path entry'ler:**

```typescript
additionalDocumentAttachmentFilename: (i: number) => `additionalDocuments[${i}].attachment.filename` as `additionalDocuments[${number}].attachment.filename`,
additionalDocumentAttachmentMimeCode: (i: number) => `additionalDocuments[${i}].attachment.mimeCode` as `additionalDocuments[${number}].attachment.mimeCode`,
additionalDocumentAttachmentData: (i: number) => `additionalDocuments[${i}].attachment.data` as `additionalDocuments[${number}].attachment.data`,
additionalDocumentAttachmentEncodingCode: (i: number) => `additionalDocuments[${i}].attachment.encodingCode` as `additionalDocuments[${number}].attachment.encodingCode`,
additionalDocumentAttachmentCharacterSetCode: (i: number) => `additionalDocuments[${i}].attachment.characterSetCode` as `additionalDocuments[${number}].attachment.characterSetCode`,
```

**5 path entry** (Mimsoft öneri 4 + `characterSetCode` ek). Sprint 8l.2 generator-driven `update()` overload pattern'i bu yeni path'leri otomatik yakalar — `InvoiceSessionUpdateOverloads` interface'inde 5 yeni overload satırı emit edilir.

**Generator regenerate:** `npm run generate:paths`. Beklenen line count artışı: 1140 → ~1180.

**Doğrulama:**
- `bun run typecheck` (TS 5.3.3) ✅
- `npm run check:ts57` (TS 5.7.3 + Mimsoft tsconfig) ✅
- `dist/index.d.ts`'te 5 yeni `additionalDocumentAttachment*` path

**Risk noktası — generator regression test:** `__tests__/scripts/generate-session-paths.test.ts`'te "still skips single inline object literals (attachment.filename — non-array inline)" testi vardı (Sprint 8j.2'de eklenmiş). Bu testin **invertilmesi** gerek: artık `attachment.filename` ÜRETİLMELİ. Test güncellemesi:

```typescript
it('includes single inline literal sub-object paths (Sprint 8n.1 — Öneri #9)', () => {
  const out = generateSessionPaths();
  expect(out).toContain("additionalDocumentAttachmentFilename");
  expect(out).toContain("additionalDocumentAttachmentMimeCode");
  expect(out).toContain("additionalDocumentAttachmentData");
  expect(out).toContain("additionalDocumentAttachmentEncodingCode");
  expect(out).toContain("additionalDocumentAttachmentCharacterSetCode");
  expect(out).toContain("'additionalDocuments[${number}].attachment.filename'");
});
```

**Yeni test:** `__tests__/calculator/simple-additional-document-attachment.test.ts` (+4):

```typescript
import { InvoiceSession, SessionPaths } from '../../src';

describe('SimpleAdditionalDocumentInput.attachment path entries (Sprint 8n.1)', () => {
  it('5 attachment path round-trip', () => {
    const session = new InvoiceSession();
    session.update(SessionPaths.additionalDocumentId(0), 'DOC-001');
    session.update(SessionPaths.additionalDocumentAttachmentFilename(0), 'fatura.pdf');
    session.update(SessionPaths.additionalDocumentAttachmentMimeCode(0), 'application/pdf');
    session.update(SessionPaths.additionalDocumentAttachmentData(0), 'JVBERi0xLjQK');
    session.update(SessionPaths.additionalDocumentAttachmentEncodingCode(0), 'Base64');
    session.update(SessionPaths.additionalDocumentAttachmentCharacterSetCode(0), 'UTF-8');
    expect(session.input.additionalDocuments?.[0].attachment).toEqual({
      filename: 'fatura.pdf',
      mimeCode: 'application/pdf',
      data: 'JVBERi0xLjQK',
      encodingCode: 'Base64',
      characterSetCode: 'UTF-8',
    });
  });

  it('attachment optional — id only without attachment', () => {
    const session = new InvoiceSession();
    session.update(SessionPaths.additionalDocumentId(0), 'DOC-002');
    session.update(SessionPaths.additionalDocumentIssueDate(0), '2026-04-30');
    expect(session.input.additionalDocuments?.[0].attachment).toBeUndefined();
  });

  it('unset additionalDocuments clears attachment too', () => {
    const session = new InvoiceSession();
    session.update(SessionPaths.additionalDocumentId(0), 'DOC-003');
    session.update(SessionPaths.additionalDocumentAttachmentFilename(0), 'x.pdf');
    session.update(SessionPaths.additionalDocumentAttachmentMimeCode(0), 'application/pdf');
    session.update(SessionPaths.additionalDocumentAttachmentData(0), 'xxx');
    expect(session.input.additionalDocuments?.[0].attachment).toBeDefined();

    session.unset('additionalDocuments');
    expect(session.input.additionalDocuments).toBeUndefined();
  });

  it('UBL mapper attachment çıktısı (smoke — mevcut davranış korunur)', () => {
    const session = new InvoiceSession();
    session.update('sender.taxNumber', '1234567890');
    session.update('customer.taxNumber', '0987654321');
    session.addLine({ name: 'L1', quantity: 1, price: 100, kdvPercent: 18 });
    session.update(SessionPaths.additionalDocumentId(0), 'DOC-004');
    session.update(SessionPaths.additionalDocumentAttachmentFilename(0), 'beyanname.pdf');
    session.update(SessionPaths.additionalDocumentAttachmentMimeCode(0), 'application/pdf');
    session.update(SessionPaths.additionalDocumentAttachmentData(0), 'JVBERi0xLjQK');
    const xml = session.buildXml();
    // Mapper attachment'ı UBL cbc:EmbeddedDocumentBinaryObject'e map etmeli
    expect(xml).toContain('beyanname.pdf');
    expect(xml).toContain('application/pdf');
    expect(xml).toContain('JVBERi0xLjQK');
  });
});
```

#### 8n.2 — README + CHANGELOG v2.2.6

**README.md** §2 InvoiceSession import örneğine v2.2.6+ attachment path örneği ekle (kısa, file upload pattern):

```typescript
// v2.2.6+ — Additional documents attachment (file upload, Library Öneri #9)
session.update(SessionPaths.additionalDocumentId(0), 'DOC-001');
session.update(SessionPaths.additionalDocumentAttachmentFilename(0), 'fatura.pdf');
session.update(SessionPaths.additionalDocumentAttachmentMimeCode(0), 'application/pdf');
session.update(SessionPaths.additionalDocumentAttachmentData(0), '<base64>');  // FileReader sonucu
```

**CHANGELOG.md** v2.2.6 entry:

```markdown
## [2.2.6] — 2026-04-30

**Library Suggestions Patch (Mimsoft greenfield F5 ENGELLEYİCİ).** Tek küçük additive öneri — generator extension.

### Added
- **`SimpleAdditionalDocumentInput.attachment`** alt-field'ları için 5 SessionPaths path entry (Library Öneri #9):
  - `additionalDocumentAttachmentFilename(i)`, `additionalDocumentAttachmentMimeCode(i)`, `additionalDocumentAttachmentData(i)`, `additionalDocumentAttachmentEncodingCode(i)`, `additionalDocumentAttachmentCharacterSetCode(i)`
  - 5 yeni `update()` template literal overload (`InvoiceSessionUpdateOverloads` interface'i otomatik genişler — generator-driven, Sprint 8l.2 pattern)
- **Generator inline literal sub-object desteği** — single `{...}` form (array değil), Sprint 8j.2'deki array desteğinin tamamlayıcısı.

### Changed
- **`session-paths.generated.ts`** regenerate (1140 → ~1180 line)

### Test
- `__tests__/calculator/simple-additional-document-attachment.test.ts` (+4) — round-trip / optional / unset clear / UBL mapper smoke
- `__tests__/scripts/generate-session-paths.test.ts` "skips single inline literals" testi inversed (artık üretiliyor)
- 1766 → ~1770 (+4)

### Notes
- Tip alanı (`SimpleAdditionalDocumentInput.attachment`) ve UBL Attachment mapper **zaten v2.2.5'te mevcuttu** — bu patch sadece SessionPaths/update() yüzeyini açtı.
- F5 (additional-documents-section) `yarn upgrade json2ubl-ts@2.2.6` sonrası başlatılabilir.
```

#### 8n.3 — Version Bump + Log Finalize

- `package.json`: `2.2.5` → `2.2.6`
- `audit/sprint-08n-implementation-log.md` finalize (durum: KAPATILDI)

#### 8n.4 — (Rezerv)

Plan'da yer tutucu — eğer 8n.1 sırasında öngörülmemiş bir mapper davranışı veya tip uyuşmazlığı çıkarsa burada düzeltilir. Aksi halde **bu commit atlanır** (tek atomik commit zinciri).

#### 8n.5 — Cross-repo Audit Güncellemesi

`/Users/berkaygokce/CascadeProjects/windsurf-project/sisteminiz-integrator-infrastructure/audit/greenfield/99-library-suggestions.md`'da:
- Öneri #9 `Status: pending` → `applied`
- Sprint 8n.1 commit hash referansı + uygulama detayları
- "Tip + mapper zaten v2.2.5'te mevcuttu, sadece SessionPaths path entry'leri eksikti" notu (Mimsoft öneri'sinin scope tahmin sapması)
- Özet tablo Status sütunu güncellenir.

`99-implementation-log.md` decision log'a Decision #11 entry: "v2.2.6 patch'i Library Öneri #9 — generator inline literal sub-object desteği (5 SessionPaths attachment path + 5 update overload otomatik üretim)."

**Mimsoft repo'da git commit Berkay'ın yetkisinde** — sadece dosya güncellemesi yapılır.

## Disiplin

- **1766 mevcut test bozulmaz.** Tüm değişiklikler additive.
- **Mimari kararlar M1-M12, AR-1..AR-10 stabil.** Yeni karar yok.
- **Generator regenerate diff temiz** — sadece `__InlineObj_SimpleAdditionalDocumentInput_attachment` synthetic interface eklemesi + 5 yeni path entry + 5 yeni overload satırı.
- **`bun run typecheck` (TS 5.3.3) + `npm run check:ts57` (TS 5.7.3) ikisi de temiz olmalı.**

## Verification

1. `bun run typecheck` (TS 5.3.3) → 0 hata
2. `bun run test` → ~1770/~1770 yeşil
3. `bun run build` → `dist/index.d.ts`'te 5 yeni `additionalDocumentAttachment*` path constant + 5 update overload (`InvoiceSessionUpdateOverloads` interface içinde)
4. `npm run check:ts57` (TS 5.7.3 + Mimsoft tsconfig) → 0 hata
5. `npm run verify:paths` → drift YOK
6. **Mimsoft tüketici doğrulaması (Öneri #9 kapanış kriteri):** Sprint 8n publish + Mimsoft `yarn upgrade json2ubl-ts@2.2.6` sonrası F5.C5.0 helper attachment 4 path conditional set + F5.C5.3 section file upload UI + UBL XML attachment çıktısı (mapper'da zaten mevcut, smoke test ile doğrulanır).

## Risk ve Dur Sinyali

- **Sprint 8j.2 array desteği regression:** Generator extension'ında `extractInlineLiteralArrayFields` (array form) önce kontrol edilmeli; array değilse `extractInlineLiteralFields` (single object) tetiklenmeli. Tersi olursa `Array<{...}>` form `{...}` olarak yanlış parse edilir → 8j.2 path'leri silinir.
- **Generator regression test'in inversed olması:** Sprint 8j.2'de eklenen "still skips single inline literals (attachment.filename — non-array inline)" testi v2.2.6'da bozulur. Test güncellemesi 8n.1 commit'ine dahil.
- **Tip drift olasılığı:** `attachment.encodingCode` field'ı `simple-types.ts`'te `string` (Mimsoft öneri `'Base64'` literal idi). Generator olduğu gibi yansıtır → `update(...attachment.encodingCode, value: string | undefined)`. Mimsoft'ta `'Base64'` literal tutmak isteyene `as 'Base64'` bilinçli cast gerekir; v3.0.0 tip narrowing değerlendirmesi kapsamı dışı.
- **162 examples-matrix regression:** En az 1 senaryo bozulursa **dur** — atomik commit geri alınır.
- **Sub-sub-object çağrısı (lines[i].delivery.deliveryAddress.X) hâlâ SKIP:** Plan kapsamı dışı — Sprint 8j.2'deki "deeply nested SKIP" disiplini korunur. Sadece **bir-derinlik** inline literal sub-object eklenir. Future-proof: gerekirse v2.3.0'da deep nesting değerlendirilir.

## Açık Sorular (Mimsoft tüketici ekibi cevaplaması bekleniyor)

1. **Scope sürpriz onayı:** Mimsoft öneri 1.5-4 saat tahmin etti (mapper genişletme dahil). Gerçek scope **30-60 dakika** (tip + mapper var, sadece generator extension). Bu sapma onaylanır mı? Önerim: **evet** — daha küçük scope, daha hızlı release.

2. **`characterSetCode` path eklenmesi:** Mimsoft öneri 4 path (filename / mimeCode / data / encodingCode); kütüphane tip'inde 5 field var (`characterSetCode` ek). Generator otomatik 5 path üretir. F5'te kullanılmıyorsa unused olur (zararsız), ama gelecek-dirençli olmak için 5 path tutmak. Önerim: **5 path** (Mimsoft kullanmıyorsa ignore eder).

3. **`encodingCode` literal narrowing:** Mimsoft öneri `value: 'Base64'` literal; kütüphane tipi `string | undefined`. Generator olduğu gibi yansıtır (string). Mimsoft'ta `'Base64'` değer her zaman zorunlu mu? Eğer **evet** → `simple-types.ts`'te `encodingCode?: 'Base64'` olarak narrow edilebilir (breaking değil, daha katı). Önerim: **string bırak** — UBL spec'ine göre `'Base64'` standart fakat ilerleyen UBL versiyonlarında değişebilir; kütüphane runtime'da fallback `'Base64'` zaten yapıyor.

4. **Sprint 8m.4 audit güncellemesi durumu:** v2.2.5 `npm publish` yapıldı mı? Bu sprint `package.json` 2.2.5 → 2.2.6 bump'ı için 2.2.5 baseline'ı. Eğer publish yapılmadıysa Sprint 8n'i v2.2.5 sonrası yapmak için bekleyebiliriz veya kümülatif paket olarak yayınlayabiliriz (Sprint 8k pattern'i).

## Mimsoft Cevapları (2026-04-30 — kod incelemesi sonucu)

Mimsoft tüketici ekibi (sisteminiz-integrator-infrastructure) F5 plan onayı sonrası Sprint 8n plan'ı inceledi. Cevaplar:

### Cevap 1 — Scope sürpriz onayı: ✅ ONAYLANDI

Mimsoft tahmini (1.5-4 saat) UBL Attachment mapper'ının var olup olmadığı belirsiz olduğu için yüksek tutulmuştu. Plan'ın fizibilite analizi (§"Sprint 8n Kapsamı / Sürpriz scope düşmesi") tip + mapper'ın v2.2.5'te zaten mevcut olduğunu gösterdi. **30-60 dakika scope kabul** — daha küçük scope = daha hızlı release. Win-win.

### Cevap 2 — `characterSetCode` 5. path: ✅ 5 PATH

Mimsoft eski form (`packages/web/src/components/document-create/sections/additional-documents-section.tsx`) syncToSession block (line 116-122) `attachment` 4 alan set ediyor: `filename`, `mimeCode`, `data`, `encodingCode: "Base64"` (sabit). **`characterSetCode` set EDİLMİYOR** — library mapper `'UTF-8'` default fallback yapıyor. F5.C5.0 helper Mimsoft eski form ile parite olacağı için `characterSetCode` path'ini **kullanmayacak**.

Yine de generator otomatik 5 path üretiyor; çıkarmak için ekstra extension karmaşası gerekir. **5 path tutmak gelecek-dirençli + zararsız** (unused path'ler ignore edilir). Sprint 8n plan kabul.

### Cevap 3 — `encodingCode` literal narrowing: ❌ STRING BIRAK

Mimsoft eski form sabit `encodingCode: "Base64"` set ediyor (line 121). Narrow yapılırsa breaking değil ama **gerek yok**: mapper fallback `'Base64'` zaten yapıyor (line 53), UBL spec ileride genişleyebilir → esneklik. Mimsoft helper sabit `"Base64"` set edecek; library tip değişikliği gerekmiyor.

### Cevap 4 — v2.2.5 publish durumu: ✅ YAPILDI

Mimsoft `package.json` `"json2ubl-ts": "2.2.5"` + `node_modules/json2ubl-ts/package.json` v2.2.5 mevcut. Yarn upgrade da yapılmış. **Sprint 8n v2.2.5 → v2.2.6 patch baseline'ı kabul** — bekleme veya kümülatif paket gerekmiyor.

### Ek Bulgu — Package adı uyuşmazlığı düzeltildi

Plan'ın eski versiyonunda 2 yerde `@rahat-fatura/json2ubl-ts@2.2.6` referansı vardı (§"CHANGELOG" + §"Verification"). Mimsoft `package.json`'daki gerçek paket adı **scope'suz `json2ubl-ts`**. Berkay 2026-04-30 onayıyla bu typo Sprint 8n'de düzeltildi (§8n.5 cross-repo referansı dahil — `yarn upgrade json2ubl-ts@2.2.6` doğru komut). Mimsoft tarafındaki `99-library-suggestions.md` v2.2.5 + v2.2.6 paragraflarındaki aynı typo'lar da temizlendi (Mimsoft repo F5 finalize commit'inde).

### Mimsoft Plan İyileştirme Önerileri

**A. §8n.5 commit nüansı netleştirilebilir.** Şu an commit tablosunda 8n.5 Sprint 8n'in 6. atomik commit'i gibi görünüyor — ama plan içeriği "Mimsoft repo'da git commit Berkay'ın yetkisinde — sadece dosya güncellemesi yapılır" diyor. **Yani Sprint 8n.5 json2ubl-ts repo'sunda commit DEĞİL**; sadece Mimsoft tarafında `99-library-suggestions.md` Öneri #9 status update'i (Mimsoft F5 finalize commit'inin parçası olur). Plan tablosuna "Cross-repo dosya update — Sprint 8n commit'i değil, Mimsoft F5 finalize'inde uygulanır" notu eklenebilir.

**B. Sprint 8n atomik commit zinciri 8n.0 → 8n.4 (5 commit), 8n.5 ayrı kategori.** json2ubl-ts repo'sunda 5 atomik commit + Mimsoft tarafında bilgi notu (8n.5 audit update). Bu netleştirme Berkay için risk azaltır (kazara 8n.5 commit'i json2ubl-ts repo'suna atılmasın).

**C. Mimsoft F5 finalize commit'inde Öneri #9 status update zincirleme akışı** — sırasıyla:
1. Sprint 8n.4 sonrası Berkay v2.2.6 publish.
2. Mimsoft `yarn upgrade json2ubl-ts@2.2.6` (F5.C5.0 commit'inin parçası, ayrı commit DEĞİL).
3. Mimsoft F5 section yazımı (C5.0 → C5.3).
4. F5 finalize commit'i `99-library-suggestions.md` Öneri #9 `pending` → `applied` + Sprint 8n.1 commit hash referansı + plan §8n.5 detayları.

Bu zincirleme akış Sprint 8n plan §8n.5'te ekleme açıklamayla detaylandırılabilir.

## Mimsoft İncelemeye Açık (KAPATILDI)

Bu plan dosyası Mimsoft tüketici ekibinin incelemesi sonrası onaylandı (2026-04-30, kod incelemesi sonucu yukarıdaki cevaplar). Sprint 8n implementation **Berkay onayı bekliyor**.

**Plan'ın bekleme noktası:** Berkay implementation onayı (Sprint 8n.0 → 8n.4 atomik commit zinciri başlatılabilir).
