---
sprint: 8n
baslik: v2.2.6 Library Suggestions Patch — `additionalDocuments[i].attachment` 5 path entry (Öneri #9 — F5 DUR noktası)
tarih_basi: 2026-04-30
tarih_sonu: 2026-04-30
plan: audit/sprint-08n-plan.md (Mimsoft inceleme cevapları + 3 iyileştirme önerisi entegre)
master_plan: audit/reactive-session-master-plan.md
onceki_sprint: audit/sprint-08m-implementation-log.md (v2.2.5 ready)
sonraki_sprint: TBD (Mimsoft greenfield F5 başlangıç)
toplam_commit: 4 atomik alt-commit (8n.0 → 8n.3) + Mimsoft cross-repo (8n.5, ayrı kategori)
test_durumu_basi: 1766 / 1766 yeşil
test_durumu_sonu: 1770 / 1770 yeşil (+4 yeni test)
versiyon: v2.2.5 → v2.2.6 (patch — additive, BREAKING CHANGE yok)
mimari_karar: yeni karar yok
durum: KAPATILDI — v2.2.6 publish hazır
---

## Kapsam

Mimsoft greenfield F5 plan onayında **Library Öneri #9 F5 başlangıç DUR noktası** olarak işaretlendi. Eski form `additional-documents-section.tsx` attachment file upload (FileReader → base64) içeriyor; v2/ greenfield form aynı runtime davranışı tutmak zorunda.

**Sürpriz scope düşmesi:**
- Tip alanı (`SimpleAdditionalDocumentInput.attachment`) **mevcut** (simple-types.ts:241)
- UBL Attachment mapper **mevcut** (simple-invoice-mapper.ts:596-603)
- Tek eksik: **Generator'da single inline literal sub-object SKIP**

**Mimsoft öneri:** 1.5-4 saat. **Gerçek:** 30-60 dakika.

## Atomik Commit Özeti

### 8n.0 — Log iskelet
**Commit:** `811f58b`
**Test:** 1766 → 1766.

### 8n.1 — Generator inline literal sub-object + 5 attachment path
**Commit:** `512fb47`
**Kapsam:**
- `scripts/generate-session-paths.ts`:
  - Yeni helper: `extractInlineLiteralFields()` — single TypeLiteral parse (array DEĞİL); Sprint 8j.2'deki `extractInlineLiteralArrayFields`'in non-array versiyonu.
  - `parseInterfaces` extension: array kontrolü ÖNCE (regression koruması — `Array<{...}>` form yanlış parse edilmesin), array değilse single inline literal kontrolü → `__InlineObj_<Parent>_<field>` synthetic interface. `addArrayElementEntries` sub-object dalı bu synthetic interface'i yakalayıp primitive sub-field'lar için path entry üretir.
- `src/calculator/session-paths.generated.ts`: regenerate (1140 → 1170 line).

**5 yeni path:**
- `additionalDocumentAttachmentFilename(i)` — `string`
- `additionalDocumentAttachmentMimeCode(i)` — `string`
- `additionalDocumentAttachmentData(i)` — `string` (base64)
- `additionalDocumentAttachmentEncodingCode(i)` — `string | undefined`
- `additionalDocumentAttachmentCharacterSetCode(i)` — `string | undefined`

5 yeni `update()` overload otomatik üretildi (`InvoiceSessionUpdateOverloads` interface, declaration merging — Sprint 8l.2 generator-driven pattern).

**Doğrulama:**
- `bun run typecheck` (TS 5.3.3) ✅
- `npm run check:ts57` (TS 5.7.3 + Mimsoft tsconfig) ✅

**Test:**
- `__tests__/calculator/simple-additional-document-attachment.test.ts` (+4): 5 path round-trip, attachment optional, `unset('additionalDocuments')` cleanup, UBL mapper smoke (XML çıktısında `cbc:EmbeddedDocumentBinaryObject`).
- `__tests__/scripts/generate-session-paths.test.ts`: Sprint 8j.2'de eklenen "still skips single inline literals" testi inverse edildi → "includes single inline literal sub-object paths" (artık 5 path üretiliyor).

**Test:** 1766 → 1770 (+4).

### 8n.2 — README + CHANGELOG v2.2.6
**Commit:** `fd2f8f4`
**Kapsam:**
- README §2 InvoiceSession path-based update örneklerine v2.2.6+ attachment file upload pattern eklendi.
- CHANGELOG.md v2.2.6 entry (Added + Changed + Test + Notes + Migration örneği).

**Test:** 1770 → 1770.

### 8n.3 — Version Bump + Log Finalize
**Commit:** (bu commit)
**Kapsam:**
- `package.json`: `2.2.5` → `2.2.6`
- Bu log finalize edildi (durum: KAPATILDI).

**Test:** 1770 → 1770.

## Final Test Durumu

| Önceki | 8n.0 | 8n.1 | 8n.2 | 8n.3 (final) |
|---|---|---|---|---|
| 1766 | 1766 | 1770 | 1770 | **1770** |

**Test delta:** +4 (Öneri #9 için 4 yeni test).

## Mimsoft Greenfield İçin Sinyal

**Öneri #9 çözüldü:** F5 başlatılabilir.

```typescript
// F5.C5.0 helper güncellemesi:
import { SessionPaths } from 'json2ubl-ts';

if (input.attachment) {
  session.update(SessionPaths.additionalDocumentAttachmentFilename(i), input.attachment.filename);
  session.update(SessionPaths.additionalDocumentAttachmentMimeCode(i), input.attachment.mimeCode);
  session.update(SessionPaths.additionalDocumentAttachmentData(i), input.attachment.data);
  session.update(SessionPaths.additionalDocumentAttachmentEncodingCode(i), 'Base64');
}
```

UBL XML üretiminde mapper attachment'ı `cac:Attachment / cbc:EmbeddedDocumentBinaryObject` element'ine map eder (mevcut, v2.2.5'ten beri).

## Disiplin Doğrulamaları

- ✅ **1766 mevcut test bozulmadı** — additive.
- ✅ **Mimari kararlar M1-M12, AR-1..AR-10 stabil.**
- ✅ **`bun run typecheck` (TS 5.3.3) temiz.**
- ✅ **`npm run check:ts57` (TS 5.7.3 + Mimsoft tsconfig) temiz.**
- ✅ **162 examples-matrix regression yeşil.**
- ✅ **Generator regenerate diff temiz** — sadece `__InlineObj_SimpleAdditionalDocumentInput_attachment` synthetic interface + 5 path entry + 5 overload satırı.

## Cross-repo Audit Güncellemesi (8n.5 — Mimsoft F5 finalize commit'inin parçası)

`/Users/berkaygokce/CascadeProjects/windsurf-project/sisteminiz-integrator-infrastructure/audit/greenfield/99-library-suggestions.md`'da:
- Öneri #9 `Status: pending` → `applied`
- Sprint 8n.1 commit hash referansı (`512fb47`) + uygulama detayları
- "Tip + mapper zaten v2.2.5'te mevcuttu, sadece SessionPaths path entry'leri eksikti" notu
- Özet tablo Status sütunu güncellenir

**Mimsoft önerisi B+C uyarınca:** Sprint 8n.5 json2ubl-ts repo'sunda commit DEĞİL. Mimsoft F5 finalize commit zincirinin parçası olur:
1. Sprint 8n.3 sonrası Berkay v2.2.6 publish.
2. Mimsoft `yarn upgrade json2ubl-ts@2.2.6` (F5.C5.0 commit'inin parçası).
3. Mimsoft F5 section yazımı (C5.0 → C5.3).
4. F5 finalize commit'i `99-library-suggestions.md` Öneri #9 → applied + Sprint 8n.1 commit hash + plan §8n.5 detayları.

## v2.2.6 Publish

Berkay manuel publish:
```bash
git push origin main
git tag v2.2.6
git push origin v2.2.6
npm publish
```

Mimsoft tarafı (F5 finalize commit):
```bash
yarn upgrade json2ubl-ts@2.2.6
# F5.C5.0 helper attachment 4 path conditional set
# F5.C5.1 → C5.2 → C5.3 section yazımı
# F5 finalize: 99-library-suggestions.md Öneri #9 → applied
```
