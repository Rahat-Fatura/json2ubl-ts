/**
 * InvoiceSession reaktif demo — frontend entegrasyonunu simüle eder.
 *
 * Kullanım:
 *   npx tsx examples/session-demo.ts
 */

import { InvoiceSession, configManager } from '../src/calculator';

// ─── 1. Session oluştur ──────────────────────────────────────────────────────

const session = new InvoiceSession();

// ─── 2. Event dinleyiciler (frontend'de React state güncellemeleri olur) ─────

session.on('calculated', (calc) => {
  console.log(`  📊 Hesaplama: ${calc.type}/${calc.profile}`);
  console.log(`     Toplam: ${calc.monetary.payableAmount.toFixed(2)} ${calc.currencyCode}`);
  console.log(`     KDV: ${calc.taxes.taxTotal.toFixed(2)}`);
  if (calc.withholding) {
    console.log(`     Tevkifat: ${calc.withholding.taxTotal.toFixed(2)}`);
  }
});

session.on('type-changed', ({ type, profile, previousType, previousProfile }) => {
  console.log(`  🔄 Tip değişti: ${previousType}/${previousProfile} → ${type}/${profile}`);
});

session.on('profile-changed', ({ profile, type, previousProfile, previousType }) => {
  console.log(`  🔄 Profil değişti: ${previousType}/${previousProfile} → ${type}/${profile}`);
});

session.on('ui-state-changed', (state) => {
  const visible = Object.entries(state.fields)
    .filter(([, v]) => v === true)
    .map(([k]) => k);
  console.log(`  🎨 UI alanlar: ${visible.join(', ')}`);
});

session.on('warnings', (warnings) => {
  if (warnings.length > 0) {
    console.log(`  ⚠️  Uyarılar:`);
    for (const w of warnings) {
      console.log(`     [${w.severity}] ${w.field}: ${w.message}`);
    }
  }
});

session.on('line-added', ({ index }) => {
  console.log(`  ➕ Satır eklendi: #${index + 1}`);
});

session.on('line-updated', ({ index }) => {
  console.log(`  ✏️  Satır güncellendi: #${index + 1}`);
});

session.on('line-removed', ({ index }) => {
  console.log(`  ➖ Satır silindi: #${index + 1}`);
});

// ─── 3. Simülasyon başlat ───────────────────────────────────────────────────

console.log(`\n${'═'.repeat(70)}`);
console.log('  InvoiceSession Reaktif Demo');
console.log(`${'═'.repeat(70)}\n`);

// --- Senaryo A: Temel satış faturası ---
console.log('━━━ Senaryo A: Temel Satış Faturası ━━━\n');

console.log('→ Gönderici ayarla');
session.setSender({
  taxNumber: '1234567890',
  name: 'Demo Yazılım AŞ',
  taxOffice: 'Büyük Mükellefler VD',
  address: 'Levent Mah.',
  district: 'Beşiktaş',
  city: 'İstanbul',
});

console.log('\n→ Alıcı ayarla');
session.setCustomer({
  taxNumber: '9876543210',
  name: 'Alıcı Ticaret AŞ',
  taxOffice: 'Ankara VD',
  address: 'Kızılay',
  district: 'Çankaya',
  city: 'Ankara',
});

console.log('\n→ İlk satır ekle (Yazılım Lisansı)');
session.addLine({ name: 'Yazılım Lisansı', quantity: 1, price: 10000, kdvPercent: 20 });

console.log('\n→ İkinci satır ekle (Destek)');
session.addLine({ name: 'Teknik Destek', quantity: 12, price: 500, unitCode: 'Ay', kdvPercent: 20 });

console.log(`\n  İzin verilen profiller: ${session.getAllowedProfiles().join(', ')}`);
console.log(`  İzin verilen tipler: ${session.getAllowedTypes().join(', ')}`);

// --- Senaryo B: Ticari → İade geçişi ---
console.log('\n━━━ Senaryo B: Ticari → İade Geçişi ━━━\n');

console.log('→ Tip IADE olarak değiştir (otomatik profil değişmeli)');
session.setType('IADE');

console.log(`\n  Profil otomatik TEMELFATURA oldu mu? → ${session.input.profile}`);
console.log(`  BillingReference alanı gösterilmeli mi? → ${session.fields.showBillingReference}`);

console.log('\n→ İade referansı ekle');
session.setBillingReference({ id: 'DMY2025000000001', issueDate: '2025-01-15' });

// --- Senaryo C: Tevkifat ---
console.log('\n━━━ Senaryo C: Tevkifat Faturası ━━━\n');

console.log('→ Tip SATIS olarak geri dön');
session.setType('SATIS');

console.log('\n→ İlk satıra tevkifat kodu ekle');
session.updateLine(0, { withholdingTaxCode: '601' });

console.log(`\n  Tip otomatik TEVKIFAT oldu mu? → ${session.calculation?.type}`);

// --- Senaryo D: Döviz ---
console.log('\n━━━ Senaryo D: Döviz Faturası ━━━\n');

console.log('→ Tevkifat kaldır, döviz ayarla');
session.updateLine(0, { withholdingTaxCode: undefined });
session.setCurrency('USD', 32.50);

console.log(`\n  ExchangeRate alanı gösterilmeli mi? → ${session.fields.showExchangeRate}`);

// --- Senaryo E: Satır silme ---
console.log('\n━━━ Senaryo E: Satır Silme ━━━\n');

console.log('→ 2. satırı sil');
session.removeLine(1);

// --- Senaryo F: ConfigManager runtime update ---
console.log('\n━━━ Senaryo F: ConfigManager Runtime Update ━━━\n');

console.log(`  Config versiyonu: ${configManager.version}`);
console.log(`  Mevcut vergi sayısı: ${configManager.taxes.length}`);

console.log('\n→ Yeni bir vergi tanımı ekleniyor (runtime)');
const updatedTaxes = [
  ...configManager.taxes,
  { code: '9999', name: 'Yeni Test Vergisi', shortName: 'Test V.', baseStat: true, baseCalculate: false },
];
configManager.updateTaxes(updatedTaxes);

console.log(`  Config versiyonu: ${configManager.version}`);
console.log(`  Güncel vergi sayısı: ${configManager.taxes.length}`);
console.log(`  Yeni vergi geçerli mi? → ${configManager.isValidTaxCode('9999')}`);

// Temizle
configManager.reset();
console.log(`\n  Reset sonrası vergi sayısı: ${configManager.taxes.length}`);

// --- Senaryo G: Config snapshot ---
console.log('\n━━━ Senaryo G: Config Snapshot ━━━\n');
const snap = configManager.snapshot();
console.log(`  Snapshot — Vergi: ${snap.taxes!.length}, Tevkifat: ${snap.withholdingTaxes!.length}, İstisna: ${snap.exemptions!.length}`);
console.log(`  Birim: ${snap.units!.length}, Para birimi: ${snap.currencies!.length}`);

// --- Senaryo H: Profil değişimi ---
console.log('\n━━━ Senaryo H: Profil İhracat Geçişi ━━━\n');

session.setCurrency('TRY');
console.log('→ Profili IHRACAT olarak değiştir');
session.setProfile('IHRACAT');

console.log(`\n  BuyerCustomer gösterilmeli mi? → ${session.fields.showBuyerCustomer}`);
console.log(`  LineDelivery gösterilmeli mi? → ${session.fields.showLineDelivery}`);

// --- XML üret ---
console.log('\n━━━ XML Çıktı ━━━\n');

session.setType('SATIS');
session.setProfile('TICARIFATURA');
session.setCurrency('TRY');
session.setId('DMY2025000000099');

try {
  const xml = session.buildXml();
  console.log(`  XML üretildi: ${xml.length} karakter`);
  console.log(`  İlk 200 karakter:\n  ${xml.substring(0, 200)}...`);
} catch (err: unknown) {
  console.log(`  XML hatası: ${err instanceof Error ? err.message : err}`);
}

console.log(`\n${'═'.repeat(70)}`);
console.log('  Demo tamamlandı.');
console.log(`${'═'.repeat(70)}\n`);
