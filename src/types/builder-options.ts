/** Builder yapılandırma seçenekleri */
export interface BuilderOptions {
  /** Pretty print (indented) XML çıktısı — varsayılan: true */
  prettyPrint?: boolean;
  /** Indent boyutu (boşluk sayısı) — varsayılan: 2 */
  indentSize?: number;
  /** Validasyon seviyesi — varsayılan: 'basic' */
  validationLevel?: ValidationLevel;
  /** XML declaration eklensin mi — varsayılan: true */
  xmlDeclaration?: boolean;
  /**
   * 555 (Demirbaş KDV / Bedelsiz Demirbaş İstisnası) kodunu kabul eder.
   * Kütüphane 555 için iş mantığı uygulamaz; tüketici farklı KDV oranından
   * kesme hesabından sorumludur. Default: false.
   */
  allowReducedKdvRate?: boolean;
}

/** Validasyon seviyeleri */
export type ValidationLevel =
  /** Sadece zorunlu alan ve format kontrolleri (§1) */
  | 'basic'
  /** Tip-bazlı + profil-bazlı + çapraz matris kontrolleri (§1-§4) */
  | 'strict'
  /** Validasyon yapılmasın (kullanıcı kendi sorumluluğunda) */
  | 'none';
