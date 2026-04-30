---
sprint: 8n
baslik: v2.2.6 Library Suggestions Patch — `additionalDocuments[i].attachment` 5 path entry (Öneri #9 — F5 DUR noktası)
tarih_basi: 2026-04-30
plan: audit/sprint-08n-plan.md (Mimsoft inceleme cevapları + 3 iyileştirme önerisi entegre)
master_plan: audit/reactive-session-master-plan.md
onceki_sprint: audit/sprint-08m-implementation-log.md (v2.2.5 ready)
sonraki_sprint: TBD (Mimsoft greenfield F5 başlangıç)
toplam_commit: 4 atomik alt-commit (8n.0 → 8n.3) + Mimsoft cross-repo (8n.5, ayrı kategori)
test_durumu_basi: 1766 / 1766 yeşil
test_durumu_sonu_hedef: ~1770 yeşil (+4 yeni test)
versiyon: v2.2.5 → v2.2.6 (patch — additive, BREAKING CHANGE yok)
mimari_karar: yeni karar yok
---

## Kapsam

Mimsoft greenfield F5 plan onayında (2026-04-30 ExitPlanMode) **Library Öneri #9 F5 başlangıç DUR noktası** olarak işaretlendi. Eski form `additional-documents-section.tsx` attachment file upload (FileReader → base64) içeriyor; v2/ greenfield form aynı runtime davranışı tutmak zorunda.

**Sürpriz scope düşmesi (fizibilite analizi sonucu):**
- Tip alanı (`SimpleAdditionalDocumentInput.attachment`) **mevcut** (simple-types.ts:241)
- UBL Attachment mapper **mevcut** (simple-invoice-mapper.ts:596-603)
- Tek eksik: **Generator'da single inline literal sub-object SKIP** (Sprint 8j.2 array desteğinin tamamlayıcısı)

**4 atomik commit + cross-repo (Mimsoft F5 finalize commit'inin parçası):**

1. **8n.0** — Log iskelet
2. **8n.1** — Generator extension + 5 path entry + 5 update overload (otomatik) + smoke test + regression invert
3. **8n.2** — README + CHANGELOG v2.2.6
4. **8n.3** — `package.json` 2.2.5 → 2.2.6 + log finalize

**8n.5** — Mimsoft `99-library-suggestions.md` Öneri #9 Status: applied (Mimsoft F5 finalize commit'inin parçası, Sprint 8n'de commit edilmez — Mimsoft önerisi B+C).

## İlerleme

### 8n.0 — Log iskelet (devam ediyor)

`audit/sprint-08n-implementation-log.md` iskelet açıldı. Mevcut durum: v2.2.5, 1766/1766 yeşil.
